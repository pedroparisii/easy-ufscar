/**
 * Junta SIGA + AVA no que as telas mostram. Função pura.
 *
 * A ligação é o código da disciplina: o SIGA e o shortname do AVA usam o mesmo. Qualquer
 * um dos dois lados pode faltar (SIGA fora do ar, AVA fora do ar, disciplina sem página
 * no AVA).
 */

import type { Ava, Aviso, DisciplinaAva, Prazo } from "../ava/ava.ts";
import type { Faltante, Historico, Horario, Plano } from "../siga/siga.ts";

export interface DisciplinaAtual extends Omit<DisciplinaAva, "url"> {
  /** null = a disciplina não tem página no AVA (o `id` é negativo, só pra identificar) */
  url: string | null;
  /** carga horária, quando o SIGA informa */
  horas: number | null;
  /** está na lista de obrigatórias do curso? null = sem dados do SIGA pra saber */
  obrigatoria: boolean | null;
  horarios: Horario[];
  professores: string[];
  plano: Plano | null;
}

export interface Painel {
  /** primeiro nome, pra cumprimentar */
  aluno: string | null;
  /** semestre em andamento, ex.: "2026/2" */
  periodo: string | null;
  disciplinas: DisciplinaAtual[];
  /** do mais próximo pro mais distante, com o nome da disciplina */
  prazos: (Prazo & { disciplina: string | null })[];
  /** de todas as disciplinas, do mais recente pro mais antigo */
  avisos: (Aviso & { disciplina: string; disciplinaId: number })[];
  historico: Historico | null;
  /** obrigatórias que ainda vão faltar depois das que estão em curso */
  faltantes: Faltante[];
}

export function merge(historico: Historico | null, ava: Ava | null): Painel {
  const obrigatorias = new Map(historico?.faltantes.map((f) => [f.codigo, f]));
  // histórico guardado por uma versão antiga do site pode não ter as turmas
  const turmas = historico?.turmas ?? [];
  const noAva = ava?.disciplinas ?? [];
  const periodo = noAva.find((d) => d.periodo)?.periodo ?? null;

  const doSiga = (codigo: string | null) => {
    const turma = turmas.find((t) => t.codigo === codigo);
    const obrigatoria = codigo ? obrigatorias.get(codigo) : undefined;
    return {
      nomeOficial: obrigatoria?.nome ?? turma?.nome,
      horas: obrigatoria?.horas ?? turma?.plano?.horas ?? null,
      obrigatoria: historico ? obrigatoria !== undefined : null,
      horarios: turma?.horarios ?? [],
      professores: turma?.professores ?? [],
      plano: turma?.plano ?? null,
    };
  };

  const disciplinas = [
    ...noAva.map((d): DisciplinaAtual => {
      const { nomeOficial, ...siga } = doSiga(d.codigo);
      // o nome do SIGA é o oficial; o do AVA é o professor que escreve ("X - Turma A - 2026/2")
      return { ...d, ...siga, nome: nomeOficial ?? d.nome.replace(/\s+-\s+Turma\b.*$/i, "") };
    }),
    // turmas do SIGA que o professor não abriu no AVA: aparecem sem notas nem avisos
    ...turmas.filter((t) => !noAva.some((d) => d.codigo === t.codigo)).map((t, i): DisciplinaAtual => {
      const { nomeOficial, ...siga } = doSiga(t.codigo);
      return {
        id: -(i + 1),
        nome: nomeOficial ?? t.nome,
        codigo: t.codigo,
        turma: t.turma,
        periodo,
        url: null,
        notas: { total: null, itens: [] },
        avisos: [],
        materiais: [],
        ...siga,
      };
    }),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const nomes = new Map(disciplinas.map((d) => [d.id, d.nome]));
  const emCurso = new Set(disciplinas.map((d) => d.codigo));

  return {
    aluno: ava?.aluno ?? null,
    periodo,
    disciplinas,
    prazos: (ava?.prazos ?? [])
      .map((p) => ({ ...p, disciplina: (p.disciplinaId !== null && nomes.get(p.disciplinaId)) || null }))
      .sort((a, b) => a.data.localeCompare(b.data)),
    avisos: disciplinas
      .flatMap((d) => d.avisos.map((a) => ({ ...a, disciplina: d.nome, disciplinaId: d.id })))
      .sort((a, b) => b.data.localeCompare(a.data)),
    historico,
    faltantes: (historico?.faltantes ?? []).filter((f) => !emCurso.has(f.codigo)),
  };
}
