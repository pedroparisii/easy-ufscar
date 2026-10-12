import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  forunsDeAvisos,
  parseAvisos,
  parseDisciplinas,
  parseNotas,
  parsePrazos,
  semestreAtual,
  type Ava,
} from "../ava/ava.ts";
import { parseHistorico, parsePlano, parseTurmas } from "../siga/siga.ts";
import { merge } from "./merge.ts";

// as duas fixtures são do mesmo aluno, então a junção é testada com dados reais
const historico = parseHistorico(readFileSync("fixtures/siga/historico.html", "utf8"));
const sample = JSON.parse(readFileSync("fixtures/ava/sample.json", "utf8"));
const foruns = forunsDeAvisos(sample.forums);
const ava: Ava = {
  aluno: "MARIA",
  prazos: parsePrazos(sample.calendar),
  disciplinas: semestreAtual(parseDisciplinas(sample.courses)).map((d) => {
    const notas = sample.gradeItems[d.id];
    const avisos = sample.discussions[foruns.get(d.id) ?? ""];
    return {
      ...d,
      notas: notas ? parseNotas(notas) : { total: null, itens: [] },
      avisos: avisos ? parseAvisos(avisos) : [],
      materiais: [],
    };
  }),
};

describe("merge", () => {
  const painel = merge(historico, ava);

  it("liga a disciplina do AVA à do SIGA pelo código", () => {
    expect(painel.periodo).toBe("2026/2");
    expect(painel.disciplinas).toHaveLength(6);
    expect(painel.disciplinas.find((d) => d.codigo === "1001097")).toMatchObject({
      nome: "MATEMÁTICA DISCRETA",
      horas: 60,
      obrigatoria: true,
    });
  });

  it("disciplina que o SIGA não lista como obrigatória fica com o nome do AVA, limpo", () => {
    expect(painel.disciplinas.find((d) => d.codigo === "1004767")).toMatchObject({
      nome: "APLICAÇÕES DE IA GENERATIVA",
      horas: null,
      obrigatoria: false,
    });
  });

  it("tira das faltantes as que estão em curso", () => {
    expect(historico.faltantes.map((f) => f.codigo)).toContain("1001097");
    expect(painel.faltantes.map((f) => f.codigo)).not.toContain("1001097");
    expect(painel.faltantes.length).toBeLessThan(historico.faltantes.length);
  });

  it("prazos em ordem de data, com o nome da disciplina", () => {
    const datas = painel.prazos.map((p) => p.data);
    expect(datas).toEqual([...datas].sort());
    expect(painel.prazos.find((p) => p.disciplinaId === 49450 || p.disciplinaId === 40143)?.disciplina).toBeTruthy();
  });

  it("avisos de todas as disciplinas, do mais recente pro mais antigo", () => {
    expect(painel.avisos).toHaveLength(8);
    const datas = painel.avisos.map((a) => a.data);
    expect(datas).toEqual([...datas].sort().reverse());
    expect(painel.avisos[0]?.disciplina).toBe("MATEMÁTICA DISCRETA");
  });

  it("funciona só com o SIGA", () => {
    const so = merge(historico, null);
    expect(so.disciplinas).toEqual([]);
    expect(so.prazos).toEqual([]);
    expect(so.faltantes).toHaveLength(24);
  });

  it("funciona só com o AVA (sem saber o que é obrigatória)", () => {
    const so = merge(null, ava);
    expect(so.historico).toBeNull();
    expect(so.faltantes).toEqual([]);
    expect(so.disciplinas.every((d) => d.obrigatoria === null && d.horas === null)).toBe(true);
    expect(so.disciplinas.find((d) => d.codigo === "1001097")?.nome).toBe("MATEMÁTICA DISCRETA");
  });

  it("com as turmas do SIGA: horário, professor, plano e a disciplina que não está no AVA", () => {
    const plano = parsePlano(readFileSync("fixtures/siga/planoEnsino.html", "utf8"));
    const turmas = parseTurmas(readFileSync("fixtures/siga/resumoInscricoesResultados.html", "utf8"))
      .map(({ planoLink: _link, ...t }) => ({ ...t, plano }));
    const completo = merge({ ...historico, turmas }, ava);

    expect(completo.disciplinas.find((d) => d.codigo === "1001097")).toMatchObject({
      horarios: [{ dia: "Qui", inicio: "8:00", fim: "12:00", local: "ATLAB-15" }],
      professores: ["Candida Nunes da Silva"],
    });
    // optativa: o SIGA não lista nas obrigatórias, mas o plano de ensino diz a carga horária
    expect(completo.disciplinas.find((d) => d.codigo === "1004767")).toMatchObject({ obrigatoria: false, horas: 60 });
    // Física Geral 1 está no SIGA mas o professor não abriu no AVA
    expect(completo.disciplinas.find((d) => d.codigo === "520136")).toMatchObject({ url: null, obrigatoria: true, avisos: [] });
    expect(completo.faltantes.map((f) => f.codigo)).not.toContain("520136");
  });
});
