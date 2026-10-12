/**
 * Cliente do AVA UFSCar (Moodle 4.5, Web Services REST — a mesma API do app oficial).
 *
 *   fetchToken(ra, senha)  -> token   (é o que autentica o login do site)
 *   fetchAva(token)        -> disciplinas do semestre, com notas e avisos, e os prazos
 *
 * SEGURANÇA (não mudar):
 *  - O `userid` usado nas chamadas sai do próprio token (site_info). Nunca vem de quem chama.
 *  - A senha só existe dentro de fetchToken(). Token e senha nunca vão pra log nem pra
 *    mensagem de erro.
 */

import { ZodError } from "zod";
import {
  AVA_URL,
  forunsDeAvisos,
  idsDeQuestionarios,
  idsDeTarefas,
  parseAvisos,
  parseDisciplinas,
  parseMateriais,
  parseNotas,
  parsePrazos,
  questionarioFeito,
  semestreAtual,
  tarefaEntregue,
  type Aviso,
  type Disciplina,
  type Notas,
  type Prazo,
  type SecaoMateriais,
} from "./parse.ts";

export * from "./parse.ts";

export type AvaStep = "login" | "token" | "rede" | "resposta";

/** Erro do cliente. `step` "token" = token inválido/expirado: mandar o aluno logar de novo. */
export class AvaError extends Error {
  step: AvaStep;
  constructor(step: AvaStep, message: string) {
    super(message);
    this.name = "AvaError";
    this.step = step;
  }
}

export interface DisciplinaAva extends Disciplina {
  notas: Notas;
  avisos: Aviso[];
  materiais: SecaoMateriais[];
}

export interface Ava {
  /** primeiro nome do aluno, como está no AVA */
  aluno: string | null;
  disciplinas: DisciplinaAva[];
  prazos: Prazo[];
}

const DAY = 24 * 60 * 60;

export async function fetchToken(ra: string, senha: string): Promise<string> {
  const json = await post(`${AVA_URL}/login/token.php`, { username: ra, password: senha, service: "moodle_mobile_app" });
  if (!isRecord(json) || typeof json.token !== "string") throw new AvaError("login", "RA ou senha incorretos.");
  return json.token;
}

export async function fetchAva(token: string): Promise<Ava> {
  try {
    return await load(token);
  } catch (e) {
    if (e instanceof ZodError) throw new AvaError("resposta", "AVA respondeu num formato inesperado.");
    throw e;
  }
}

async function load(token: string): Promise<Ava> {
  const call =(wsfunction: string, args: Record<string, string | number> = {}) =>
    post(`${AVA_URL}/webservice/rest/server.php`, { wstoken: token, wsfunction, moodlewsrestformat: "json", ...args });

  const site = await call("core_webservice_get_site_info");
  if (!isRecord(site) || typeof site.userid !== "number") throw new AvaError("resposta", "AVA não informou o usuário.");
  const userid = site.userid;

  const disciplinas = semestreAtual(parseDisciplinas(await call("core_enrol_get_users_courses", { userid })));
  const ids = Object.fromEntries(disciplinas.map((d, i) => [`courseids[${i}]`, d.id]));

  // uma parte com problema (sem permissão, formato estranho...) não derruba o resto;
  // token expirado e AVA fora do ar continuam sendo erro
  const semDados = <T>(vazio: T) => (e: unknown) => {
    if (e instanceof AvaError && e.step !== "resposta") throw e;
    return vazio;
  };
  const semIds = new Map<number, number>();
  const porDisciplina = (wsfunction: string, parse: (raw: unknown) => Map<number, number>) =>
    disciplinas.length ? call(wsfunction, ids).then(parse).catch(semDados(semIds)) : semIds;

  const [eventos, foruns, tarefas, questionarios] = await Promise.all([
    // de uma semana atrás em diante, pra mostrar também o que acabou de vencer
    call("core_calendar_get_action_events_by_timesort", { timesortfrom: Math.floor(Date.now() / 1000) - 7 * DAY, limitnum: 50 })
      .then(parsePrazos),
    disciplinas.length ? call("mod_forum_get_forums_by_courses", ids).then(forunsDeAvisos) : semIds,
    porDisciplina("mod_assign_get_assignments", idsDeTarefas),
    porDisciplina("mod_quiz_get_quizzes_by_courses", idsDeQuestionarios),
  ]);

  // o calendário não diz se o aluno já entregou: pergunta atividade por atividade
  const prazos = await Promise.all(eventos.map(async ({ modulo, ...prazo }): Promise<Prazo> => {
    const tarefa = prazo.tipo === "assign" && tarefas.get(modulo ?? -1);
    const questionario = prazo.tipo === "quiz" && questionarios.get(modulo ?? -1);
    const entregue = tarefa
      ? await call("mod_assign_get_submission_status", { assignid: tarefa }).then(tarefaEntregue).catch(semDados(false))
      : questionario
        ? await call("mod_quiz_get_user_attempts", { quizid: questionario, status: "finished" }).then(questionarioFeito).catch(semDados(false))
        : false;
    return { ...prazo, entregue, atrasado: prazo.atrasado && !entregue };
  }));
  const completas = await Promise.all(disciplinas.map(async (d) => {
    const forum = foruns.get(d.id);
    const [notas, avisos, materiais] = await Promise.all([
      call("gradereport_user_get_grade_items", { courseid: d.id, userid })
        .then(parseNotas).catch(semDados<Notas>({ total: null, itens: [] })),
      forum === undefined ? [] : call("mod_forum_get_forum_discussions", { forumid: forum, perpage: 10 })
        .then(parseAvisos).catch(semDados<Aviso[]>([])),
      call("core_course_get_contents", { courseid: d.id }).then(parseMateriais).catch(semDados<SecaoMateriais[]>([])),
    ]);
    return { ...d, notas, avisos, materiais };
  }));

  return { aluno: typeof site.firstname === "string" && site.firstname ? site.firstname : null, disciplinas: completas, prazos };
}

async function post(url: string, fields: Record<string, string | number>): Promise<unknown> {
  const body = new URLSearchParams(Object.entries(fields).map(([k, v]) => [k, String(v)]));
  let json: unknown;
  try {
    const res = await fetch(url, { method: "POST", body });
    json = await res.json();
  } catch {
    throw new AvaError("rede", "AVA fora do ar ou inacessível.");
  }
  // o Moodle responde erro com HTTP 200 e um objeto { exception, errorcode, message }
  if (isRecord(json) && typeof json.errorcode === "string" && "exception" in json) {
    if (json.errorcode === "invalidtoken") throw new AvaError("token", "Sessão do AVA expirada.");
    throw new AvaError("resposta", `AVA recusou a chamada (${json.errorcode}).`);
  }
  return json;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
