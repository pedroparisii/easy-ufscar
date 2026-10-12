/**
 * Cliente do SIGA UFSCar: entra com RA + senha e devolve o histórico do aluno.
 *
 * O SIGA é JSF + RichFaces: HTML renderizado no servidor, navegação por POST de formulário
 * com ViewState. Não há API. Aqui se reproduz o caminho que o aluno faz no navegador:
 *   login -> lista de matrículas -> clica na matrícula -> página de ações -> histórico,
 *   e depois ações -> inscrições -> período em andamento -> plano de ensino de cada turma.
 *
 * SEGURANÇA (não mudar):
 *  - A única entrada é RA + senha. Nenhum id de matrícula vem de quem chama: o link do
 *    histórico é lido da página que o SIGA devolve pra sessão logada.
 *  - A senha só existe dentro de fetchHistorico(). Não é guardada nem logada.
 *  - Mensagens de erro nunca incluem HTML/corpo de resposta (tem dado pessoal).
 */

import {
  FORM_INSCRICOES,
  SigaError,
  ajaxRedirect,
  formAction,
  formFields,
  historicoLink,
  isLoginPage,
  loginAction,
  matriculasAction,
  parseHistorico,
  parseInscricoes,
  parseMatriculas,
  parsePlano,
  parseTurmas,
  viewState,
  type Historico,
  type Plano,
  type Turma,
} from "./parse.ts";

export * from "./parse.ts";

const ORIGIN = "https://sistemas.ufscar.br";
const LOGIN = `${ORIGIN}/siga/login.xhtml`;
const MATRICULAS = `${ORIGIN}/siga/paginas/aluno/listMatriculas.xhtml`;
const USER_AGENT = "Mozilla/5.0 (easy-ufscar; nao oficial)";

export async function fetchHistorico(ra: string, senha: string): Promise<Historico> {
  const http = new Session();

  // 1. login
  const loginPage = await http.get(LOGIN, "login");
  const loginResponse = await http.post(new URL(loginAction(loginPage), LOGIN).href, "login", {
    login: "login",
    "login:usuario": ra,
    "login:password": senha,
    ...ajaxClick("login:loginButton", viewState(loginPage)),
  });
  // o SIGA manda pra home mesmo com senha errada; aí a home devolve pro login
  const home = ajaxRedirect(loginResponse);
  if (!home) throw new SigaError("login", "Resposta de login inesperada.");
  if (isLoginPage(await http.get(new URL(home, LOGIN).href, "login"))) {
    throw new SigaError("login", "RA ou senha incorretos.");
  }

  // 2. escolhe a matrícula ativa (ou a primeira) e "clica" nela
  const lista = await http.get(MATRICULAS, "navegacao");
  const matriculas = parseMatriculas(lista);
  const matricula = matriculas.find((m) => /ativa/i.test(m.status)) ?? matriculas[0];
  if (!matricula) throw new SigaError("navegacao", "Nenhuma matrícula encontrada.");

  const button = `aluno-matriculas-form:matriculas-table:${matricula.index}:matricula`;
  const click = await http.post(new URL(matriculasAction(lista), MATRICULAS).href, "navegacao", {
    "aluno-matriculas-form": "aluno-matriculas-form",
    ...ajaxClick(button, viewState(lista)),
  });
  const acoesUrl = ajaxRedirect(click);
  if (!acoesUrl) throw new SigaError("navegacao", "Seleção da matrícula não redirecionou.");

  // 3. a página de ações traz o link do histórico já com a matrícula da sessão
  const acoesHref = new URL(acoesUrl, MATRICULAS).href;
  const acoes = await http.get(acoesHref, "navegacao");
  const historicoHref = new URL(historicoLink(acoes).replace(/&amp;/g, "&"), acoesHref).href;

  const historico = parseHistorico(await http.get(historicoHref, "navegacao"));

  // 4. semestre em andamento (IRA, horários, planos de ensino). É um extra: se falhar,
  //    o histórico vale do mesmo jeito
  try {
    Object.assign(historico, await semestre(http, acoes, acoesHref));
  } catch {
    // fica sem turmas
  }
  return historico;
}

/** Ações -> "Inscrições e Resultados" -> período em andamento -> plano de cada turma. */
async function semestre(http: Session, acoes: string, acoesHref: string): Promise<Pick<Historico, "ira" | "turmas">> {
  const paraInscricoes = await http.post(new URL(formAction(acoes, "acoes-matriculas-form"), acoesHref).href, "navegacao", {
    "acoes-matriculas-form": "acoes-matriculas-form",
    ...ajaxClick("acoes-matriculas-form:solicitacao-inscricao-link", viewState(acoes)),
  });
  const inscricoesHref = new URL(ajaxRedirect(paraInscricoes) ?? "", acoesHref).href;
  const inscricoes = await http.get(inscricoesHref, "navegacao");
  const { ira, periodoLink } = parseInscricoes(inscricoes);
  if (!periodoLink) return { ira, turmas: [] }; // entre um semestre e outro

  const paraResumo = await http.post(new URL(formAction(inscricoes, FORM_INSCRICOES), inscricoesHref).href, "navegacao", {
    ...formFields(inscricoes, FORM_INSCRICOES),
    ...ajaxClick(periodoLink, viewState(inscricoes)),
  });
  const resumoHref = new URL(ajaxRedirect(paraResumo) ?? "", inscricoesHref).href;
  const resumo = await http.get(resumoHref, "navegacao");
  const action = new URL(formAction(resumo, FORM_INSCRICOES), resumoHref).href;
  const campos = formFields(resumo, FORM_INSCRICOES);

  // um plano por vez: a página do plano depende do último clique feito na sessão
  const turmas: Turma[] = [];
  for (const { planoLink, ...turma } of parseTurmas(resumo)) {
    let plano: Plano | null = null;
    if (planoLink) {
      try {
        plano = parsePlano(await http.submit(action, "navegacao", { ...campos, [planoLink]: planoLink }));
      } catch {
        // professor não publicou o plano, ou a página mudou
      }
    }
    turmas.push({ ...turma, plano });
  }
  return { ira, turmas };
}

/** Campos que o RichFaces manda quando se clica num botão AJAX. */
function ajaxClick(component: string, viewStateValue: string): Record<string, string> {
  return {
    "javax.faces.ViewState": viewStateValue,
    "javax.faces.source": component,
    "javax.faces.partial.event": "click",
    "javax.faces.partial.execute": `${component} @component`,
    "javax.faces.partial.render": "@component",
    "org.richfaces.ajax.component": component,
    [component]: component,
    rfExt: "null",
    "AJAX:EVENTS_COUNT": "1",
    "javax.faces.partial.ajax": "true",
  };
}

/** fetch + cookies da sessão (o fetch do Node não guarda cookie sozinho). */
class Session {
  private cookies = new Map<string, string>();

  async get(url: string, step: SigaError["step"]): Promise<string> {
    return this.follow(await this.request(url, step, {}), url, step);
  }

  private async follow(res: Response, url: string, step: SigaError["step"]): Promise<string> {
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, url);
      next.protocol = "https:"; // o SIGA redireciona com http://
      return this.get(next.href, step);
    }
    return this.body(res, step);
  }

  /** Submit comum de formulário (não AJAX): o SIGA responde com redirect pra página de destino. */
  async submit(url: string, step: SigaError["step"], fields: Record<string, string>): Promise<string> {
    const res = await this.request(url, step, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: ORIGIN, referer: url },
      body: new URLSearchParams(fields),
    });
    return this.follow(res, url, step);
  }

  async post(url: string, step: SigaError["step"], fields: Record<string, string>): Promise<string> {
    const res = await this.request(url, step, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "faces-request": "partial/ajax",
        origin: ORIGIN,
        referer: url,
      },
      body: new URLSearchParams(fields),
    });
    return this.body(res, step);
  }

  private async request(url: string, step: SigaError["step"], init: RequestInit): Promise<Response> {
    // os cookies da sessão nunca saem do SIGA, nem seguindo redirect
    if (new URL(url).origin !== ORIGIN) throw new SigaError(step, "Redirecionamento pra fora do SIGA.");
    const cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: { ...init.headers, cookie, "user-agent": USER_AGENT },
        redirect: "manual",
      });
    } catch {
      throw new SigaError(step, "SIGA fora do ar ou inacessível.");
    }
    for (const line of res.headers.getSetCookie()) {
      const pair = line.split(";")[0] ?? "";
      const eq = pair.indexOf("=");
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    return res;
  }

  private async body(res: Response, step: SigaError["step"]): Promise<string> {
    if (!res.ok) throw new SigaError(step, `SIGA respondeu ${res.status}.`);
    return res.text();
  }
}
