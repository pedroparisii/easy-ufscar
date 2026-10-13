"use client";

import { Dobra, Lista, Secao, Vazio } from "@/components/blocos";
import { usePainel } from "@/components/painel";
import { nomeDisciplina, numero } from "@/lib/format";

const pct = (parte: number, todo: number) => Math.round((parte / todo) * 100);

export default function Curso() {
  const { painel } = usePainel();
  const h = painel.historico;

  if (!h) {
    return (
      <>
        <h1 className="text-2xl font-medium tracking-tight">Curso</h1>
        <div className="mt-6">
          <Vazio>Não deu pra ler seu histórico no SIGA no último login. Saia e entre de novo pra tentar.</Vazio>
        </div>
      </>
    );
  }

  const total = h.integralizacao.reduce((s, i) => s + i.exigidos, 0);
  const feito = h.integralizacao.reduce((s, i) => s + i.cursados, 0);
  // horas em curso: obrigatórias vêm da grade; optativas, do plano de ensino (quando o professor publicou)
  const horasEmCurso = (obrigatoria: boolean) =>
    painel.disciplinas.filter((d) => d.obrigatoria === obrigatoria).reduce((s, d) => s + (d.horas ?? 0), 0);
  const emCursoPor = { obrigat: horasEmCurso(true), optativa: horasEmCurso(false) };
  const emCurso = emCursoPor.obrigat + emCursoPor.optativa;
  const optativas = painel.disciplinas.filter((d) => d.obrigatoria === false && d.horas === null).length;
  // as optativas em curso entram no primeiro grupo de optativas da grade
  const primeiraOptativa = h.integralizacao.find((i) => i.item.toLowerCase().startsWith("optativa"))?.item;

  // o SIGA dá quatro médias; as "Aprovadas" quase sempre repetem as "Total", então ficam só estas
  const todas = Object.entries(h.medias);
  const medias = todas.some(([nome]) => /total/i.test(nome)) ? todas.filter(([nome]) => /total/i.test(nome)) : todas;

  const semestres = Object.entries(Object.groupBy(h.disciplinas, (d) => d.periodo)).sort(([a], [b]) => b.localeCompare(a));
  const faltam = Object.entries(Object.groupBy(painel.faltantes, (f) => f.perfil ?? 0)).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <>
      <p className="text-sm text-muted-foreground">{h.curso}</p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight text-balance">
        {total > 0 ? `${pct(feito, total)}% do curso feito` : "Curso"}
        {total > 0 && emCurso > 0 && <span className="text-muted-foreground"> · {pct(emCurso, total)}% em curso</span>}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Entrou em {h.ingresso} · prazo até {h.prazoConclusao}
        {optativas > 0 && ` · ${optativas} ${optativas === 1 ? "optativa em curso ainda não conta" : "optativas em curso ainda não contam"}`}
      </p>

      {/* barra de formatura: um trecho por categoria, largura proporcional às horas exigidas */}
      <div className="mt-6 flex h-3 gap-1">
        {h.integralizacao.filter((i) => i.exigidos > 0).map((i) => {
          const andamento = i.item.toLowerCase().startsWith("obrigat") ? emCursoPor.obrigat : i.item === primeiraOptativa ? emCursoPor.optativa : 0;
          return (
            <div key={i.item} title={i.item} className="flex overflow-hidden rounded-full bg-secondary" style={{ flexGrow: i.exigidos, flexBasis: 0 }}>
              <div className="bg-foreground" style={{ width: `${pct(i.cursados, i.exigidos)}%` }} />
              <div className="hatch opacity-60" style={{ width: `${Math.min(100, pct(andamento, i.exigidos))}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-foreground" /> feito</span>
        <span className="flex items-center gap-1.5"><span className="hatch size-2.5 rounded-full opacity-60" /> em curso</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-secondary" /> falta</span>
      </div>

      <div className="mt-6">
        <Lista>
          {h.integralizacao.map((i) => (
            <div key={i.item} className="flex items-baseline gap-4 px-4 py-3">
              <p className="flex-1 text-sm">{i.item}</p>
              <p className="num text-sm">
                {i.cursados} <span className="text-muted-foreground">/ {i.exigidos} h</span>
              </p>
            </div>
          ))}
        </Lista>
      </div>

      <Secao titulo="Médias">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {h.ira != null && (
            <div className="col-span-2 flex items-center justify-between gap-3 rounded-xl border bg-card p-4 sm:col-span-1">
              <div>
                <p className="num text-xl">{h.ira.toLocaleString("pt-BR")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  IRA · <span style={{ color: faixaDoIra(h.ira).cor }}>{faixaDoIra(h.ira).texto}</span>
                </p>
              </div>
              <Medidor ira={h.ira} />
            </div>
          )}
          {medias.map(([nome, valor]) => (
            <div key={nome} className="rounded-xl border bg-card p-4">
              <p className="num text-xl">{valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>
              <p className="mt-1 text-xs text-muted-foreground">{nome.replace(/^Média /, "").replace(/ Total$/, "")}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Boletim">
        <div className="space-y-6">
          {painel.disciplinas.length > 0 && (
            <Boletim
              periodo={painel.periodo ?? "Agora"}
              resumo="em curso"
              linhas={painel.disciplinas.map((d) => ({ chave: String(d.id), nome: d.nome, nota: null, frequencia: null, situacao: "Em curso" }))}
            />
          )}
          {semestres.map(([periodo, disciplinas = []]) => (
            <Boletim
              key={periodo}
              periodo={periodo}
              resumo={`${disciplinas.reduce((s, d) => s + d.horas, 0)} h`}
              linhas={disciplinas.map((d) => ({ chave: d.codigo + d.turma, nome: d.nome, nota: d.nota, frequencia: d.frequencia, situacao: d.resultado }))}
            />
          ))}
        </div>
      </Secao>

      <Secao titulo="O que falta">
        {painel.faltantes.length === 0 ? (
          <Vazio>Nenhuma obrigatória pendente além das que você está cursando.</Vazio>
        ) : (
          <Lista>
            <Dobra
              titulo={`${painel.faltantes.length} ${painel.faltantes.length === 1 ? "obrigatória" : "obrigatórias"}`}
              nota={`${painel.faltantes.reduce((s, d) => s + d.horas, 0)} h`}
            >
              <div className="space-y-5">
                {faltam.map(([perfil, disciplinas = []]) => (
                  <div key={perfil}>
                    <p className="mb-1 text-xs text-muted-foreground">
                      {perfil === "0" ? "Sem semestre sugerido" : `${perfil}º semestre da grade`}
                    </p>
                    {disciplinas.map((d) => (
                      <div key={d.codigo} className="flex items-baseline gap-4 py-1">
                        <p className="min-w-0 flex-1 truncate">{nomeDisciplina(d.nome)}</p>
                        <p className="num shrink-0 text-muted-foreground">{d.horas} h</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Dobra>
          </Lista>
        )}
      </Secao>
    </>
  );
}

// 12.000 é o IRA de quem tem média 6, a nota de aprovação: dali pra cima é verde
const FAIXAS = [
  { de: 0, ate: 8000, cor: "var(--late)", texto: "baixo" },
  { de: 8000, ate: 10000, cor: "#f97316", texto: "abaixo da média" },
  { de: 10000, ate: 12000, cor: "#eab308", texto: "perto da média" },
  { de: 12000, ate: 20000, cor: "var(--done)", texto: "acima da média" },
];
const faixaDoIra = (ira: number) => FAIXAS.find((x) => ira < x.ate) ?? FAIXAS[3]!;

/** A escala do IRA num arco fino: as quatro faixas apagadas, a do aluno acesa e um ponto no valor dele. */
function Medidor({ ira }: { ira: number }) {
  const parte = Math.min(1, Math.max(0, ira / 20000));
  const atual = faixaDoIra(ira);
  const angulo = Math.PI * (1 - parte);
  return (
    <svg viewBox="0 0 48 28" className="w-11 shrink-0" aria-hidden>
      {FAIXAS.map((x) => (
        <path
          key={x.de}
          d="M4 24 A20 20 0 0 1 44 24"
          fill="none"
          stroke={x.cor}
          strokeWidth="3.5"
          opacity={x === atual ? 1 : 0.25}
          pathLength={100}
          // cada faixa ocupa o seu pedaço do arco, com um respiro entre elas
          strokeDasharray={`${(x.ate - x.de) / 200 - 2} 200`}
          strokeDashoffset={-(x.de / 200 + 1)}
        />
      ))}
      <circle cx={24 + 20 * Math.cos(angulo)} cy={24 - 20 * Math.sin(angulo)} r="3.5" fill={atual.cor} strokeWidth="2" className="stroke-card" />
    </svg>
  );
}

interface LinhaBoletim {
  chave: string;
  nome: string;
  nota: number | null;
  frequencia: number | null;
  situacao: string;
}

/** Um semestre no formato de boletim: disciplina, nota, presença, situação. */
function Boletim({ periodo, resumo, linhas }: { periodo: string; resumo: string; linhas: LinhaBoletim[] }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between px-1 text-sm">
        <p className="font-medium">{periodo}</p>
        <p className="text-xs text-muted-foreground">{resumo}</p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b bg-secondary/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-normal">Disciplina</th>
              <th className="w-14 px-2 py-2 text-right font-normal sm:w-16 sm:px-3">Nota</th>
              <th className="w-20 py-2 pr-4 pl-2 text-right font-normal sm:w-24 sm:px-3">Presença</th>
              <th className="hidden w-32 py-2 pr-4 pl-3 font-normal sm:table-cell">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {linhas.map((l) => {
              const situacao = l.situacao.toUpperCase();
              const cor = situacao.startsWith("APROVAD") ? "text-done" : situacao.startsWith("REPROVAD") ? "text-late" : "text-muted-foreground";
              const texto = l.situacao.charAt(0).toUpperCase() + l.situacao.slice(1).toLowerCase();
              return (
                <tr key={l.chave}>
                  <td className="px-4 py-2.5">
                    {nomeDisciplina(l.nome)}
                    <span className={`block text-xs sm:hidden ${cor}`}>{texto}</span>
                  </td>
                  <td className="num px-2 py-2.5 text-right sm:px-3">{l.nota === null ? "—" : l.nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                  <td className="num py-2.5 pr-4 pl-2 text-right sm:px-3">{l.frequencia === null ? "—" : `${numero(l.frequencia)}%`}</td>
                  <td className={`hidden py-2.5 pr-4 pl-3 whitespace-nowrap sm:table-cell ${cor}`}>{texto}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
