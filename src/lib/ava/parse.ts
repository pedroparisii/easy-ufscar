/**
 * Parsers do AVA: resposta do Moodle -> dados tipados. Funções puras, sem rede — testadas
 * contra fixtures/ava/.
 *
 * Cada professor usa o AVA de um jeito, então nada aqui assume formato: campo ausente,
 * vazio ou de outro tipo vira `null`, nunca erro. Ver docs/architecture.md.
 */

import * as cheerio from "cheerio";
import { z } from "zod";

export interface Disciplina {
  id: number;
  nome: string;
  /** do shortname `GRAD_<código>_<turma>_<campus>_<ano>_<semestre>`; null se fugir do padrão */
  codigo: string | null;
  turma: string | null;
  /** "2026/2", no mesmo formato do SIGA */
  periodo: string | null;
  url: string;
}

export interface Nota {
  nome: string;
  /** "quiz", "assign"... ou null quando é item manual do professor */
  tipo: string | null;
  /** a escala muda por disciplina: mostrar sempre `valor / max`, nunca converter */
  valor: number | null;
  max: number | null;
}

export interface Notas {
  total: Nota | null;
  itens: Nota[];
}

export interface Prazo {
  id: number;
  disciplinaId: number | null;
  titulo: string;
  /** "assign", "quiz"... */
  tipo: string;
  /** "due" (entrega), "open" (abre), "close" (fecha) */
  evento: string;
  /** ISO 8601 em UTC — exibir em America/Sao_Paulo */
  data: string;
  atrasado: boolean;
  /** o aluno já enviou a tarefa / terminou o questionário */
  entregue: boolean;
  url: string | null;
}

export interface Aviso {
  id: number;
  titulo: string;
  texto: string;
  autor: string;
  data: string;
  url: string;
}

export interface Material {
  nome: string;
  /** extensão do arquivo ("pdf", "pptx"...), ou "link", "video", "pagina" */
  formato: string;
  /** onde abre quando não é arquivo: o link de fora, ou a página no AVA */
  url: string;
  /** caminho do arquivo no AVA, pra baixar por /api/arquivo; null quando não é arquivo */
  arquivo: string | null;
  /** bytes */
  tamanho: number | null;
}

/** Uma seção da página da disciplina no AVA ("Semana 3", "Unidade 2"...), só com o que é material. */
export interface SecaoMateriais {
  nome: string;
  materiais: Material[];
}

export const AVA_URL = "https://ava.ufscar.br";

// O Moodle manda número ora como number, ora como string ("20.00000"), ora null.
const number = z.preprocess((v) => (v === null || v === undefined || v === "" ? null : Number(v)), z.number().nullable())
  .catch(null);
const text = z.string().nullish().transform((s) => s ?? "");
const isoDate = (seconds: number) => new Date(seconds * 1000).toISOString();

const coursesSchema = z.array(z.object({
  id: z.number(),
  shortname: text,
  fullname: text,
  displayname: text,
  enddate: number,
}));

export function parseDisciplinas(raw: unknown): (Disciplina & { fim: number | null })[] {
  return coursesSchema.parse(raw).map((c) => {
    const m = c.shortname.match(/^GRAD_(\w+?)_(\w+?)_.+_(\d{4})_(\d)$/);
    return {
      id: c.id,
      nome: c.displayname || c.fullname || c.shortname,
      codigo: m?.[1] ?? null,
      turma: m?.[2] ?? null,
      periodo: m ? `${m[3]}/${m[4]}` : null,
      url: `${AVA_URL}/course/view.php?id=${c.id}`,
      fim: c.enddate,
    };
  });
}

/**
 * Disciplinas do semestre atual: as do período mais recente que aparecer. As que fogem
 * do padrão de nome (extensão, grupos...) entram enquanto não tiverem terminado.
 */
export function semestreAtual(todas: (Disciplina & { fim: number | null })[], agora = new Date()): Disciplina[] {
  const atual = todas.map((d) => d.periodo).filter((p) => p !== null).sort().at(-1);
  const now = agora.getTime() / 1000;
  return todas
    .filter((d) => (d.periodo ? d.periodo === atual : !d.fim || d.fim > now))
    .map(({ fim: _fim, ...d }) => d);
}

const gradeItemsSchema = z.object({
  usergrades: z.array(z.object({
    gradeitems: z.array(z.object({
      itemname: text,
      itemtype: text,
      itemmodule: z.string().nullish(),
      graderaw: number,
      grademax: number,
      gradeishidden: z.boolean().nullish(),
    })),
  })),
});

export function parseNotas(raw: unknown): Notas {
  const items = gradeItemsSchema.parse(raw).usergrades[0]?.gradeitems ?? [];
  const nota = (i: (typeof items)[number]): Nota => ({
    nome: i.itemname,
    tipo: i.itemmodule ?? null,
    valor: i.gradeishidden ? null : i.graderaw,
    max: i.grademax,
  });
  const total = items.find((i) => i.itemtype === "course");
  return {
    total: total ? nota(total) : null,
    // "category" são subtotais que o professor monta; só os itens de verdade interessam
    itens: items.filter((i) => i.itemtype !== "course" && i.itemtype !== "category").map(nota),
  };
}

const calendarSchema = z.object({
  events: z.array(z.object({
    id: z.number(),
    name: text,
    activityname: text,
    modulename: text,
    eventtype: text,
    timesort: z.number(),
    overdue: z.boolean().nullish(),
    url: z.string().nullish(),
    course: z.object({ id: z.number() }).nullish(),
    instance: number,
  })),
});

/** `modulo` é o id da atividade dentro da disciplina (cmid): serve pra perguntar se já foi entregue. */
export function parsePrazos(raw: unknown): (Prazo & { modulo: number | null })[] {
  return calendarSchema.parse(raw).events.map((e) => ({
    id: e.id,
    disciplinaId: e.course?.id ?? null,
    // `name` vem como "X está marcado(a) para esta data"; `activityname` é só o X
    titulo: e.activityname || e.name,
    tipo: e.modulename,
    evento: e.eventtype,
    data: isoDate(e.timesort),
    atrasado: e.overdue ?? false,
    entregue: false,
    url: e.url ?? null,
    modulo: e.instance,
  }));
}

const assignmentsSchema = z.object({
  courses: z.array(z.object({ assignments: z.array(z.object({ id: z.number(), cmid: z.number() })) })),
});
const quizzesSchema = z.object({ quizzes: z.array(z.object({ id: z.number(), coursemodule: z.number() })) });

/** módulo (cmid) -> id da tarefa, que é o que as funções mod_assign_* pedem */
export function idsDeTarefas(raw: unknown): Map<number, number> {
  return new Map(assignmentsSchema.parse(raw).courses.flatMap((c) => c.assignments.map((a) => [a.cmid, a.id])));
}

/** módulo (cmid) -> id do questionário */
export function idsDeQuestionarios(raw: unknown): Map<number, number> {
  return new Map(quizzesSchema.parse(raw).quizzes.map((q) => [q.coursemodule, q.id]));
}

const submission = z.object({ status: text }).nullish();
const submissionStatusSchema = z.object({
  lastattempt: z.object({ submission, teamsubmission: submission }).nullish(),
});

/** resposta de mod_assign_get_submission_status: o aluno (ou o grupo dele) já enviou? */
export function tarefaEntregue(raw: unknown): boolean {
  const tentativa = submissionStatusSchema.parse(raw).lastattempt;
  return tentativa?.submission?.status === "submitted" || tentativa?.teamsubmission?.status === "submitted";
}

/** resposta de mod_quiz_get_user_attempts (status "finished"): tem alguma tentativa terminada? */
export function questionarioFeito(raw: unknown): boolean {
  return z.object({ attempts: z.array(z.unknown()) }).parse(raw).attempts.length > 0;
}

const forumsSchema = z.array(z.object({ id: z.number(), course: z.number(), type: text }));

/** disciplina -> fórum de avisos. Nem toda disciplina tem um. */
export function forunsDeAvisos(raw: unknown): Map<number, number> {
  const news = forumsSchema.parse(raw).filter((f) => f.type === "news");
  return new Map(news.map((f) => [f.course, f.id]));
}

const discussionsSchema = z.object({
  discussions: z.array(z.object({
    discussion: z.number(),
    subject: text,
    message: text,
    userfullname: text,
    created: z.number(),
  })),
});

export function parseAvisos(raw: unknown): Aviso[] {
  return discussionsSchema.parse(raw).discussions.map((d) => ({
    id: d.discussion,
    titulo: d.subject,
    // a mensagem é HTML escrito pelo professor; a UI recebe só o texto
    texto: cheerio.load(d.message).text().replace(/\s+/g, " ").trim(),
    autor: d.userfullname,
    data: isoDate(d.created),
    url: `${AVA_URL}/mod/forum/discuss.php?d=${d.discussion}`,
  }));
}

const contentsSchema = z.array(z.object({
  name: text,
  modules: z.array(z.object({
    name: text,
    modname: text,
    url: z.string().nullish(),
    uservisible: z.boolean().nullish(),
    contents: z.array(z.object({
      type: text,
      filename: text,
      fileurl: z.string().nullish(),
      filesize: number,
    })).nullish(),
  })).nullish(),
}));

/** "/123/mod_resource/content/1/aula.pdf" a partir do endereço que o Moodle dá pro arquivo */
function caminhoDoArquivo(fileurl: string | null | undefined): string | null {
  const m = fileurl?.match(/\/pluginfile\.php(\/[^?#]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

const extensao = (nome: string) => nome.match(/\.(\w{1,5})$/)?.[1]?.toLowerCase() ?? "arquivo";

/**
 * Materiais de uma disciplina, na ordem e nas seções que o professor montou. Entra arquivo,
 * pasta, link, página e livro; tarefa, questionário e fórum já aparecem em outros lugares.
 */
export function parseMateriais(raw: unknown): SecaoMateriais[] {
  return contentsSchema.parse(raw).map((secao) => ({
    nome: secao.name,
    materiais: (secao.modules ?? []).filter((m) => m.uservisible !== false && m.url).flatMap((m): Material[] => {
      const url = m.url ?? "";
      const arquivos = (m.contents ?? []).filter((c) => c.type === "file" && caminhoDoArquivo(c.fileurl));
      if (m.modname === "resource" || m.modname === "folder") {
        return arquivos.map((c) => ({
          // arquivo solto leva o título que o professor deu; dentro de pasta, o nome do arquivo
          nome: m.modname === "resource" && arquivos.length === 1 ? m.name : c.filename,
          formato: extensao(c.filename),
          url,
          arquivo: caminhoDoArquivo(c.fileurl),
          tamanho: c.filesize,
        }));
      }
      if (m.modname === "url") {
        const fora = m.contents?.[0]?.fileurl || url;
        return [{ nome: m.name, formato: /youtu\.?be|vimeo/.test(fora) ? "video" : "link", url: fora, arquivo: null, tamanho: null }];
      }
      if (m.modname === "page" || m.modname === "book") return [{ nome: m.name, formato: "pagina", url, arquivo: null, tamanho: null }];
      return [];
    }),
  })).filter((secao) => secao.materiais.length > 0);
}
