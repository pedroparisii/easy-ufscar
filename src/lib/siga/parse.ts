/**
 * Parsers do SIGA: HTML -> dados tipados. Funções puras, sem rede — testadas contra
 * fixtures/siga/.
 *
 * Tudo é localizado por texto, classe ou id nomeado. Nunca pelos ids gerados (j_idtNNN),
 * que mudam a cada versão do SIGA.
 */

import * as cheerio from "cheerio";

export type SigaStep = "login" | "navegacao" | "parse";

/** Erro do scraper. `step` diz em que etapa quebrou. */
export class SigaError extends Error {
  step: SigaStep;
  constructor(step: SigaStep, message: string) {
    super(message);
    this.name = "SigaError";
    this.step = step;
  }
}

export interface Matricula {
  /** posição da linha na tabela — é o que o SIGA usa pra "clicar" na matrícula */
  index: number;
  curso: string;
  status: string;
}

export interface Disciplina {
  periodo: string;
  codigo: string;
  nome: string;
  turma: string;
  horas: number;
  /** null quando não há nota numérica (em branco, conceito, dispensa...) */
  nota: number | null;
  frequencia: number | null;
  resultado: string;
}

export interface Integralizacao {
  item: string;
  exigidos: number;
  cursados: number;
  pendente: number;
}

export interface Faltante {
  codigo: string;
  nome: string;
  /** semestre sugerido na matriz curricular */
  perfil: number | null;
  horas: number;
}

export interface Historico {
  ra: string;
  curso: string;
  situacao: string;
  matriz: string;
  ingresso: string;
  prazoConclusao: string;
  medias: Record<string, number>;
  disciplinas: Disciplina[];
  integralizacao: Integralizacao[];
  faltantes: Faltante[];
  /** IRA (0 a 20000) e turmas do semestre em andamento. Vêm de outra página: fetchHistorico preenche. */
  ira: number | null;
  turmas: Turma[];
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** "8,6" -> 8.6 · "100 %" -> 100 · "" ou texto -> null */
function num(s: string | undefined): number | null {
  if (!s) return null;
  const n = Number(s.replace("%", "").replace(",", ".").trim());
  return s.trim() === "" || Number.isNaN(n) ? null : n;
}

/** Todo POST do JSF precisa do ViewState da página (ou da resposta AJAX) anterior. */
export function viewState(html: string): string {
  const $ = cheerio.load(html);
  const vs = $('input[name="javax.faces.ViewState"]').first().val();
  if (typeof vs !== "string" || !vs) throw new SigaError("parse", "ViewState não encontrado.");
  return vs;
}

/** O SIGA devolve a tela de login quando a sessão não está autenticada. */
export function isLoginPage(html: string): boolean {
  return cheerio.load(html)("form:has(input[type=password])").length > 0;
}

/** `action` do form de login (o que tem o campo de senha). */
export function loginAction(html: string): string {
  const action = cheerio.load(html)("form:has(input[type=password])").attr("action");
  if (!action) throw new SigaError("parse", "Formulário de login não encontrado.");
  return action;
}

/** `action` do form da lista de matrículas (carrega o `cid` da conversa JSF). */
export function matriculasAction(html: string): string {
  const action = cheerio.load(html)("form#aluno-matriculas-form").attr("action");
  if (!action) throw new SigaError("parse", "Formulário de matrículas não encontrado.");
  return action;
}

/** URL pra onde uma resposta AJAX do JSF manda ir, se mandar. */
export function ajaxRedirect(xml: string): string | null {
  return xml.match(/<redirect url="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&") ?? null;
}

export function parseMatriculas(html: string): Matricula[] {
  const $ = cheerio.load(html);
  const rows = $('table[id*="matriculas-table"] tbody tr[id]');
  return rows
    .map((index, tr) => {
      const cells = $(tr).find("td").map((_, c) => clean($(c).text())).toArray();
      return { index, curso: cells[1] ?? "", status: cells.at(-1) ?? "" };
    })
    .toArray();
}

/** Link do histórico completo, como o SIGA o escreveu na página da matrícula. */
export function historicoLink(html: string): string {
  const href = cheerio.load(html)('a[href*="historico-escolar-completo.xhtml"]').attr("href");
  if (!href) throw new SigaError("parse", "Link do histórico não encontrado.");
  return href;
}

/*
 * Página historico-escolar-completo.xhtml:
 *  - rótulo e valor em elementos irmãos: <td>Curso: </td><td>valor</td>
 *  - médias em <label class="label-media">Média Aprovadas: 8.37</label>
 *  - disciplinas numa tabela agrupada por período:
 *      tr.rf-dt-r   cabeçalho (td.headerDisciplinaPeriodo = "2026/1", depois os nomes das
 *                   colunas: Horas, T, P, ..., Avaliação, Freq, Resultado)
 *      tr.rf-cst-r  uma disciplina: "1001107 - CIRCUITOS DIGITAIS - A", valores...
 */
export function parseHistorico(html: string): Historico {
  const $ = cheerio.load(html);
  const cellsOf = (tr: Parameters<typeof $>[0]) =>
    $(tr).children("td").map((_, td) => clean($(td).text())).toArray();

  const field = (label: string): string => {
    const el = $("span, td, label").filter((_, e) => clean($(e).text()).replace(/\s*:$/, "") === label).first();
    return clean(el.next().text());
  };

  const medias: Record<string, number> = {};
  $("label.label-media").each((_, l) => {
    const [nome, valor] = clean($(l).text()).split(":");
    const n = num(valor);
    if (nome && n !== null) medias[nome.trim()] = n;
  });

  const disciplinas: Disciplina[] = [];
  let periodo = "";
  let colunas: string[] = [];
  $("tr.rf-dt-r, tr.rf-cst-r").each((_, tr) => {
    const row = $(tr);
    const tds = cellsOf(tr);
    if (row.hasClass("rf-dt-r")) {
      const header = row.find("td.headerDisciplinaPeriodo");
      if (!header.length) return; // cabeçalho de outra tabela
      periodo = clean(header.text());
      colunas = tds.map((c) => c.toLowerCase());
      return;
    }
    if (!periodo || !tds[0]) return;
    const col = (nome: string) => tds[colunas.indexOf(nome)];
    // "CÓDIGO - NOME (pode ter hífen) - TURMA"
    const partes = tds[0].split(" - ");
    disciplinas.push({
      periodo,
      codigo: partes[0] ?? "",
      nome: partes.slice(1, -1).join(" - "),
      turma: partes.at(-1) ?? "",
      horas: num(col("horas")) ?? 0,
      nota: num(col("avaliação")),
      frequencia: num(col("freq")),
      resultado: col("resultado") ?? "",
    });
  });

  // a tabela certa é a última com coluna "Pendente": Exigidos | Cursados | Pendente
  const integralizacao: Integralizacao[] = [];
  $("table").filter((_, t) => $(t).find("th").text().includes("Pendente")).last().find("tr").each((_, tr) => {
    const c = cellsOf(tr);
    if (c.length !== 4 || !c[0]) return;
    integralizacao.push({
      item: c[0].replace(/:$/, ""),
      exigidos: num(c[1]) ?? 0,
      cursados: num(c[2]) ?? 0,
      pendente: num(c[3]) ?? 0,
    });
  });

  const faltantes: Faltante[] = [];
  $("table").filter((_, t) => clean($(t).find("th").first().text()).startsWith("Atividades curriculares obrigatórias faltantes"))
    .first().find("tbody tr").each((_, tr) => {
      const c = cellsOf(tr);
      const m = c[0]?.match(/^(\d+) - (.+)$/);
      if (m?.[1] && m[2]) faltantes.push({ codigo: m[1], nome: m[2], perfil: num(c[1]), horas: num(c[2]) ?? 0 });
    });

  const historico: Historico = {
    ra: field("Aluno"),
    curso: field("Curso"),
    situacao: field("Situação"),
    matriz: field("Matriz Currícular"),
    ingresso: field("Período de Ingresso"),
    prazoConclusao: field("PRAZO LIMITE PARA CONCLUSÃO DO CURSO"),
    medias,
    disciplinas,
    integralizacao,
    faltantes,
    ira: null,
    turmas: [],
  };
  // calouro pode não ter disciplina nenhuma, mas curso sempre tem
  if (!historico.curso) throw new SigaError("parse", "Página de histórico não reconhecida.");
  return historico;
}

// ---------------------------------------------------------------------------
// Semestre em andamento: "Inscrições e Resultados" -> turmas -> plano de ensino
// ---------------------------------------------------------------------------

export interface Horario {
  /** "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb" */
  dia: string;
  inicio: string;
  fim: string;
  local: string | null;
}

export interface Topico {
  titulo: string;
  horas: number | null;
}

/** O que o plano de ensino tem de útil pro aluno. Texto com quebras de linha. */
export interface Plano {
  horas: number | null;
  ementa: string;
  objetivos: string;
  /** como a nota é calculada */
  avaliacao: string;
  topicos: Topico[];
  bibliografia: string;
}

export interface Turma {
  codigo: string;
  nome: string;
  turma: string;
  horarios: Horario[];
  professores: string[];
  /** null = professor não publicou, ou não deu pra ler */
  plano: Plano | null;
}

export const FORM_INSCRICOES = "inscricao-resultados-form";

/** `action` de um form pelo id (carrega o `cid` da conversa JSF). */
export function formAction(html: string, formId: string): string {
  const action = cheerio.load(html)(`form[id="${formId}"]`).attr("action");
  if (!action) throw new SigaError("parse", `Formulário ${formId} não encontrado.`);
  return action;
}

/** Campos ocultos de um form: o que o navegador mandaria junto num submit. */
export function formFields(html: string, formId: string): Record<string, string> {
  const $ = cheerio.load(html);
  const fields: Record<string, string> = {};
  $(`form[id="${formId}"] input[type=hidden]`).each((_, input) => {
    const name = $(input).attr("name");
    if (name) fields[name] = String($(input).val() ?? "");
  });
  return fields;
}

/** Página "Inscrições e Resultados": o IRA e o link do período letivo em andamento. */
export function parseInscricoes(html: string): { ira: number | null; periodoLink: string | null } {
  const $ = cheerio.load(html);
  const ira = $("span").filter((_, e) => clean($(e).text()) === "IRA:").first().next().text();
  const link = $('table[id$="periodo-regular-andamento-table"] tbody tr a[id]').first().attr("id");
  return { ira: num(ira), periodoLink: link ?? null };
}

/**
 * Turmas em que o aluno está inscrito no período, com horário, sala e professor.
 * `planoLink` é o componente que abre o plano de ensino de cada uma.
 */
export function parseTurmas(html: string): (Omit<Turma, "plano"> & { planoLink: string | null })[] {
  const $ = cheerio.load(html);
  const itens = (td: Parameters<typeof $>[0]) => $(td).find("li").map((_, li) => clean($(li).text())).toArray().filter(Boolean);

  return $('table[id$="atividades-inscritas-table"] > tbody > tr.rf-dt-r').map((_, tr) => {
    const tds = $(tr).children("td");
    const [codigo = "", ...nome] = clean(tds.eq(0).text()).split(" - ");
    return {
      codigo,
      nome: nome.join(" - "),
      turma: clean(tds.eq(1).text()),
      // "Ter. 8:00 às 12:00 (AT2-111)"
      horarios: itens(tds[2]).flatMap((texto): Horario[] => {
        const m = texto.match(/^(\S+?)\.?\s+(\d{1,2}:\d{2})\s+às\s+(\d{1,2}:\d{2})(?:\s*\((.*)\))?$/);
        return m ? [{ dia: m[1] ?? "", inicio: m[2] ?? "", fim: m[3] ?? "", local: m[4] || null }] : [];
      }),
      professores: itens(tds[3]),
      planoLink: $(tr).find('a[id$=":plano-de-ensino"]').attr("id") ?? null,
    };
  }).toArray().filter((t) => t.codigo);
}

/** Página do plano de ensino: cada campo é um `label` seguido de um `span.field`. */
export function parsePlano(html: string): Plano {
  const $ = cheerio.load(html);
  // o texto é escrito pelo professor num editor: parágrafos e listas viram linhas
  $("br").replaceWith("\n");
  $("p, li, tr").append("\n");
  $("li").prepend("• ");

  const campo = (rotulo: string) =>
    $("label").filter((_, l) => clean($(l).text()).toLowerCase().startsWith(rotulo)).first().nextAll("span.field").first();
  const texto = (rotulo: string) =>
    campo(rotulo).text().split("\n").map(clean).filter(Boolean).join("\n");

  // "Duração dos Tópicos": nº | tópico | horas
  const topicos: Topico[] = [];
  $("table").filter((_, t) => clean($(t).find("th").text()).includes("Tópicos")).first().find("tbody tr").each((_, tr) => {
    const tds = $(tr).children("td").map((_, td) => clean($(td).text())).toArray();
    const titulo = tds.at(-2);
    if (tds.length >= 2 && titulo) topicos.push({ titulo, horas: num(tds.at(-1)) });
  });

  return {
    horas: num(campo("distribuição de horas").find("td").first().text()),
    ementa: texto("ementa"),
    objetivos: texto("objetivos gerais"),
    avaliacao: texto("procedimentos de avaliação"),
    topicos,
    bibliografia: texto("bibliografia básica").replace(/\n?Obrigatório a indicação[\s\S]*$/, ""),
  };
}
