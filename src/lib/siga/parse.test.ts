import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FORM_INSCRICOES,
  formAction,
  formFields,
  parseInscricoes,
  parsePlano,
  parseTurmas,
  SigaError,
  ajaxRedirect,
  historicoLink,
  isLoginPage,
  loginAction,
  matriculasAction,
  parseHistorico,
  parseMatriculas,
  viewState,
} from "./parse.ts";

const fixture = (name: string) => readFileSync(`fixtures/siga/${name}`, "utf8");

describe("login", () => {
  it("acha o action e o ViewState do form de login", () => {
    const html = fixture("login.html");
    expect(loginAction(html)).toBe("/siga/login.xhtml");
    expect(viewState(html)).toBe("VIEWSTATE");
  });

  it("reconhece a tela de login (é o que o SIGA devolve com senha errada)", () => {
    expect(isLoginPage(fixture("login.html"))).toBe(true);
    expect(isLoginPage(fixture("listMatriculas.html"))).toBe(false);
  });
});

describe("matrículas", () => {
  const html = fixture("listMatriculas.html");

  it("lista as matrículas da sessão", () => {
    expect(parseMatriculas(html)).toEqual([
      { index: 0, curso: "CC-So - Ciência da Computação", status: "Ativa" },
    ]);
  });

  it("acha o action do form (com o cid da conversa)", () => {
    expect(matriculasAction(html)).toBe("/siga/paginas/aluno/listMatriculas.xhtml?cid=1");
  });

  it("lê o redirect da resposta AJAX do clique", () => {
    expect(ajaxRedirect(fixture("listMatriculas-click.xml"))).toBe("/siga/paginas/aluno/acoesMatricula.xhtml?cid=1");
    expect(ajaxRedirect("<partial-response></partial-response>")).toBeNull();
  });

  it("acha o link do histórico na página de ações", () => {
    expect(historicoLink(fixture("acoesMatricula.html"))).toBe(
      "historico-escolar/completo/historico-escolar-completo.xhtml?matricula=999999",
    );
  });
});

describe("histórico", () => {
  const h = parseHistorico(fixture("historico.html"));

  it("lê os dados do aluno", () => {
    expect(h).toMatchObject({
      ra: "123456",
      curso: "Bacharelado em Ciência da Computação",
      situacao: "Cursando",
      matriz: "2018/1",
      ingresso: "2026/1",
      prazoConclusao: "2033/2",
    });
  });

  it("lê as médias", () => {
    expect(h.medias).toEqual({
      "Média Aprovadas": 8.37,
      "Média Ponderada Aprovadas": 8.22,
      "Média Geral Total": 8.37,
      "Média Ponderada Total": 8.22,
    });
  });

  it("lê as disciplinas por período", () => {
    expect(h.disciplinas).toHaveLength(6);
    expect(h.disciplinas[0]).toEqual({
      periodo: "2026/1",
      codigo: "1001107",
      nome: "CIRCUITOS DIGITAIS",
      turma: "A",
      horas: 60,
      nota: 8.6,
      frequencia: 100,
      resultado: "APROVADO",
    });
    // turma com mais de uma letra
    expect(h.disciplinas[1]).toMatchObject({ codigo: "524204", turma: "CC", nota: 8, frequencia: 87 });
  });

  it("lê a integralização", () => {
    expect(h.integralizacao).toHaveLength(6);
    expect(h.integralizacao[0]).toEqual({ item: "Obrigatórias", exigidos: 1635, cursados: 300, pendente: 1335 });
  });

  it("lê as obrigatórias faltantes", () => {
    expect(h.faltantes).toHaveLength(24);
    expect(h.faltantes[0]).toEqual({
      codigo: "482226",
      nome: "ARQUITETURA E ORGANIZAÇÃO DE COMPUTADORES",
      perfil: 2,
      horas: 60,
    });
  });

  it("recusa página que não é o histórico", () => {
    expect(() => parseHistorico(fixture("login.html"))).toThrow(SigaError);
  });
});

describe("semestre em andamento", () => {
  it("acha o IRA e o link do período letivo", () => {
    const { ira, periodoLink } = parseInscricoes(fixture("inscricoesResultados.html"));
    expect(ira).toBe(16440);
    expect(periodoLink).toMatch(/periodo-regular-andamento-table:0:/);
  });

  it("lê as turmas com horário, sala e professor", () => {
    const html = fixture("resumoInscricoesResultados.html");
    const turmas = parseTurmas(html);
    expect(turmas).toHaveLength(7);
    expect(turmas[1]).toEqual({
      codigo: "482226",
      nome: "ARQUITETURA E ORGANIZAÇÃO DE COMPUTADORES",
      turma: "A",
      horarios: [{ dia: "Ter", inicio: "8:00", fim: "12:00", local: "AT2-111" }],
      professores: ["Gustavo Maciel Dias Vieira"],
      planoLink: "inscricao-resultados-form:atividades-inscritas-table:1:plano-de-ensino",
    });
    // o submit que abre o plano leva os campos ocultos do form, com o ViewState
    expect(formAction(html, FORM_INSCRICOES)).toContain("resumoInscricoesResultados.xhtml?cid=");
    expect(formFields(html, FORM_INSCRICOES)).toMatchObject({ [FORM_INSCRICOES]: FORM_INSCRICOES, "javax.faces.ViewState": "VIEWSTATE" });
  });

  it("tira do plano de ensino o que interessa pro aluno", () => {
    const plano = parsePlano(fixture("planoEnsino.html"));
    expect(plano.horas).toBe(60);
    expect(plano.ementa).toMatch(/^Introdução à organização dos computadores/);
    expect(plano.topicos).toHaveLength(5);
    expect(plano.topicos[1]).toMatchObject({ horas: 18 });
    expect(plano.topicos.reduce((s, t) => s + (t.horas ?? 0), 0)).toBe(60);
    // listas do professor viram linhas
    expect(plano.avaliacao.split("\n")).toHaveLength(5);
    expect(plano.avaliacao).toContain("M = (0,1 T + 0,9 P)");
    expect(plano.bibliografia).toContain("Tanenbaum");
    expect(plano.bibliografia).not.toContain("Obrigatório a indicação");
  });
});
