import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AvaError,
  fetchAva,
  fetchToken,
  forunsDeAvisos,
  parseAvisos,
  parseDisciplinas,
  parseMateriais,
  parseNotas,
  parsePrazos,
  semestreAtual,
} from "./ava.ts";

const sample = JSON.parse(readFileSync("fixtures/ava/sample.json", "utf8"));

describe("disciplinas", () => {
  const todas = parseDisciplinas(sample.courses);

  it("tira código, turma e período do shortname", () => {
    expect(todas).toHaveLength(12);
    expect(todas[0]).toMatchObject({
      id: 40143,
      codigo: "1004767",
      turma: "A",
      periodo: "2026/2",
      url: "https://ava.ufscar.br/course/view.php?id=40143",
    });
    expect(todas.find((d) => d.id === 37462)).toMatchObject({ codigo: "524204", turma: "CC", periodo: "2026/1" });
  });

  it("fica só com o semestre mais recente", () => {
    const atuais = semestreAtual(todas);
    expect(atuais.map((d) => d.codigo).sort()).toEqual(["1001097", "1001098", "1001322", "1004767", "482226", "524034"]);
    expect(atuais.every((d) => d.periodo === "2026/2")).toBe(true);
  });

  it("disciplina fora do padrão de nome entra enquanto não terminou", () => {
    const raw = [
      { id: 1, shortname: "GRAD_111_A_SOROCABA_2026_2", fullname: "A", enddate: 0 },
      { id: 2, shortname: "Grupo de estudos", fullname: "B", enddate: 0 },
      { id: 3, shortname: "Curso antigo", fullname: "C", enddate: 1000 },
    ];
    expect(semestreAtual(parseDisciplinas(raw)).map((d) => d.id)).toEqual([1, 2]);
    expect(parseDisciplinas(raw)[1]).toMatchObject({ codigo: null, turma: null, periodo: null, nome: "B" });
  });
});

describe("notas", () => {
  it("separa o total dos itens e mantém a escala de cada um", () => {
    const notas = parseNotas(sample.gradeItems["40143"]);
    expect(notas.total).toEqual({ nome: "", tipo: null, valor: 20, max: 20 });
    expect(notas.itens).toHaveLength(5);
    expect(notas.itens[0]).toEqual({
      nome: "Lista 1 - Espaço Latente, Autoencoder, VAE e CVAE",
      tipo: "quiz",
      valor: 10,
      max: 10,
    });
    // tarefa ainda sem nota, valendo 100
    expect(notas.itens.at(-1)).toMatchObject({ tipo: "assign", valor: null, max: 100 });
  });

  it("disciplina sem nenhuma nota lançada", () => {
    expect(parseNotas(sample.gradeItems["49617"])).toEqual({
      total: { nome: "", tipo: null, valor: null, max: 0 },
      itens: [],
    });
  });

  it("aceita número como texto e esconde nota oculta", () => {
    const raw = { usergrades: [{ gradeitems: [
      { itemname: "P1", itemtype: "manual", graderaw: "7.50000", grademax: "10.00000" },
      { itemname: "P2", itemtype: "manual", graderaw: 9, grademax: 10, gradeishidden: true },
      { itemname: "Média das provas", itemtype: "category", graderaw: 8, grademax: 10 },
    ] }] };
    expect(parseNotas(raw).itens).toEqual([
      { nome: "P1", tipo: null, valor: 7.5, max: 10 },
      { nome: "P2", tipo: null, valor: null, max: 10 },
    ]);
  });
});

describe("prazos", () => {
  const prazos = parsePrazos(sample.calendar);

  it("junta tarefas e questionários com o nome limpo", () => {
    expect(prazos).toHaveLength(7);
    expect(prazos[1]).toEqual({
      id: 273938,
      disciplinaId: 47735,
      titulo: "Experimento 3 - Entrega (03/10/2026)",
      tipo: "assign",
      evento: "due",
      data: "2026-10-04T02:59:00.000Z", // 03/10 às 23:59 em São Paulo
      atrasado: true,
      entregue: false,
      url: "https://ava.ufscar.br/mod/assign/view.php?id=1194257",
      modulo: 1194257,
    });
    expect(prazos.map((p) => p.tipo)).toContain("quiz");
  });
});

describe("avisos", () => {
  it("acha o fórum de avisos de cada disciplina (quando existe)", () => {
    const foruns = forunsDeAvisos(sample.forums);
    expect(foruns.get(40143)).toBe(76979);
    expect(foruns.has(49617)).toBe(false);
  });

  it("devolve o aviso como texto, sem HTML", () => {
    const [aviso] = parseAvisos(sample.discussions["76979"]);
    expect(aviso).toMatchObject({
      id: 344132,
      titulo: "Suspensão da Aula no dia 11/09",
      url: "https://ava.ufscar.br/mod/forum/discuss.php?d=344132",
    });
    expect(aviso?.texto.startsWith("Pessoal, Devido à previsão")).toBe(true);
    expect(aviso?.texto).not.toMatch(/<\w/);
  });
});

describe("materiais", () => {
  const secoes = parseMateriais(sample.contents["40143"]);

  it("fica só com o que é material, nas seções do professor", () => {
    // "Semana 3" só tem questionário: some. Fórum, tarefa e arquivo oculto também.
    expect(secoes.map((s) => s.nome)).toEqual(["Geral", "Semana 1 - Espaço latente", "Semana 2 - Difusão"]);
    expect(secoes[1]?.materiais.map((m) => m.nome)).toEqual(["Aula 1 - Autoencoders", "Slides da aula 1", "Vídeo: o que é um VAE"]);
  });

  it("arquivo: título do professor, extensão, tamanho e o caminho pra baixar", () => {
    expect(secoes[1]?.materiais[0]).toEqual({
      nome: "Aula 1 - Autoencoders",
      formato: "pdf",
      url: "https://ava.ufscar.br/mod/resource/view.php?id=902",
      arquivo: "/5002/mod_resource/content/2/aula 01.pdf",
      tamanho: 2516582,
    });
  });

  it("pasta vira um material por arquivo; link e página abrem direto", () => {
    expect(secoes[2]?.materiais.map((m) => [m.nome, m.formato])).toEqual([
      ["difusao.ipynb", "ipynb"], ["dados.zip", "zip"], ["Leituras recomendadas", "pagina"], ["Artigo original", "link"],
    ]);
    expect(secoes[2]?.materiais[3]).toMatchObject({ url: "https://arxiv.org/abs/2006.11239", arquivo: null });
    expect(secoes[1]?.materiais[2]?.formato).toBe("video");
  });

  it("disciplina vazia ou resposta sem módulos não é erro", () => {
    expect(parseMateriais([])).toEqual([]);
    expect(parseMateriais([{ name: "Geral" }])).toEqual([]);
  });
});

describe("cliente (fetch simulado)", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** Responde cada função do Moodle com o pedaço correspondente da fixture. */
  function stubMoodle(override: (fn: string, args: URLSearchParams) => unknown = () => undefined) {
    const calls: URLSearchParams[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: { body: URLSearchParams }) => {
      const args = init.body;
      calls.push(args);
      const fn = args.get("wsfunction") ?? "token";
      const answer = override(fn, args) ?? {
        token: { token: "TOKEN" },
        core_webservice_get_site_info: { userid: 42 },
        core_enrol_get_users_courses: sample.courses,
        core_calendar_get_action_events_by_timesort: sample.calendar,
        mod_forum_get_forums_by_courses: sample.forums,
        mod_assign_get_assignments: sample.assignments,
        mod_quiz_get_quizzes_by_courses: sample.quizzes,
        // o aluno só entregou a tarefa 138175 (Experimento 4)
        mod_assign_get_submission_status: { lastattempt: { submission: { status: args.get("assignid") === "138175" ? "submitted" : "new" } } },
        mod_quiz_get_user_attempts: { attempts: [] },
        gradereport_user_get_grade_items: sample.gradeItems[args.get("courseid") ?? ""] ?? { exception: "x", errorcode: "nopermissions" },
        mod_forum_get_forum_discussions: sample.discussions[args.get("forumid") ?? ""],
        core_course_get_contents: sample.contents[args.get("courseid") ?? ""] ?? [],
      }[fn];
      return { json: async () => answer };
    });
    return calls;
  }

  it("monta as disciplinas do semestre com notas e avisos", async () => {
    const calls = stubMoodle();
    const ava = await fetchAva("TOKEN");

    expect(ava.disciplinas).toHaveLength(6);
    expect(ava.prazos).toHaveLength(7);
    const ia = ava.disciplinas.find((d) => d.id === 40143);
    expect(ia?.notas.total?.valor).toBe(20);
    expect(ia?.avisos).toHaveLength(1);
    // disciplina sem fórum de avisos e disciplina cuja chamada de notas falhou
    expect(ava.disciplinas.find((d) => d.id === 49617)?.avisos).toEqual([]);
    expect(ava.disciplinas.find((d) => d.id === 48332)?.notas).toEqual({ total: null, itens: [] });

    // o userid sempre vem do site_info do próprio token
    const comUser = calls.filter((c) => c.has("userid"));
    expect(comUser.length).toBeGreaterThan(0);
    expect(comUser.every((c) => c.get("userid") === "42")).toBe(true);
  });

  it("marca o que já foi entregue, e entregue não fica como atrasado", async () => {
    stubMoodle();
    const { prazos } = await fetchAva("TOKEN");
    expect(prazos.find((p) => p.id === 273939)).toMatchObject({ entregue: true, atrasado: false });
    expect(prazos.find((p) => p.id === 273938)).toMatchObject({ entregue: false, atrasado: true });
    expect(prazos.every((p) => !("modulo" in p))).toBe(true);
  });

  it("token expirado vira erro de token", async () => {
    stubMoodle(() => ({ exception: "moodle_exception", errorcode: "invalidtoken", message: "Token inválido" }));
    await expect(fetchAva("VELHO")).rejects.toMatchObject({ name: "AvaError", step: "token" });
  });

  it("login: devolve o token ou acusa senha errada", async () => {
    stubMoodle();
    await expect(fetchToken("123456", "senha")).resolves.toBe("TOKEN");
    stubMoodle(() => ({ error: "Login inválido", errorcode: "invalidlogin" }));
    await expect(fetchToken("123456", "errada")).rejects.toBeInstanceOf(AvaError);
  });
});
