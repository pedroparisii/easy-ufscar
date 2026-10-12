"use client";

import Link from "next/link";
import { AvisoLista, Colunas, Linhas, Lista, PrazoLista, Secao, Vazio } from "@/components/blocos";
import { Icone, iconeDisciplina } from "@/components/icone";
import { cor, usePainel } from "@/components/painel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GRUPOS, grupo, nomeDisciplina, proximasAulas } from "@/lib/format";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** A resposta da tela numa frase: "o que eu tenho pra fazer?" */
function resumo(atrasados: number, semana: number): string {
  if (atrasados && semana) return `${plural(atrasados, "atrasada", "atrasadas")} e ${plural(semana, "entrega", "entregas")} pra esta semana`;
  if (atrasados) return plural(atrasados, "entrega atrasada", "entregas atrasadas");
  if (semana) return `${plural(semana, "entrega", "entregas")} pra esta semana`;
  return "Nada pra entregar esta semana";
}

export default function Inicio() {
  const { painel, carregando, erro, atualizar } = usePainel();

  if (carregando) {
    return (
      <>
        <Skeleton className="h-8 w-64" />
        <Colunas lado={<Skeleton className="h-64 rounded-xl" />}>
          <Secao titulo="Esta semana"><Linhas n={4} /></Secao>
        </Colunas>
      </>
    );
  }

  const porGrupo = Object.groupBy(painel.prazos, (p) => grupo(p) ?? "passou");
  const atrasados = porGrupo.Atrasado?.length ?? 0;
  const semana = [...(porGrupo.Hoje ?? []), ...(porGrupo["Esta semana"] ?? [])].filter((p) => !p.entregue).length;
  const temPrazo = GRUPOS.some((g) => porGrupo[g]);
  const aulas = proximasAulas(painel.disciplinas);

  return (
    <>
      {painel.aluno && <p className="mb-1 text-sm text-muted-foreground">Oi, {nomeDisciplina(painel.aluno)}</p>}
      <h1 className="text-2xl font-medium tracking-tight text-balance">{resumo(atrasados, semana)}</h1>

      {erro && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm">
          <p>{erro} {painel.disciplinas.length > 0 && "Mostrando o que estava guardado."}</p>
          <Button variant="outline" size="sm" onClick={atualizar}>Tentar de novo</Button>
        </div>
      )}

      <Colunas
        lado={
          <>
            {aulas && (
              <Lista titulo={`Aulas · ${aulas.quando.toLowerCase()}`}>
                {aulas.aulas.map(({ disciplina, aula }) => (
                  <Link
                    key={disciplina.id + aula.inicio}
                    href={`/disciplinas/${disciplina.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/60"
                  >
                    <p className="num w-10 shrink-0 text-xs leading-tight">
                      {aula.inicio}
                      <span className="block text-xs text-muted-foreground">{aula.fim}</span>
                    </p>
                    <Icone icone={iconeDisciplina(disciplina.nome)} cor={cor(painel, disciplina.id)} className="size-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{nomeDisciplina(disciplina.nome)}</p>
                      {aula.local && <p className="truncate text-xs text-muted-foreground">{aula.local}</p>}
                    </div>
                  </Link>
                ))}
              </Lista>
            )}
            {/* no celular os avisos vêm depois dos prazos */}
            <AvisoLista titulo="Avisos recentes" avisos={painel.avisos.slice(0, 5)} className="order-3" />
          </>
        }
      >
        {GRUPOS.map((g) => porGrupo[g] && (
          <Secao key={g} titulo={g}>
            <PrazoLista prazos={porGrupo[g]} />
          </Secao>
        ))}
        {!temPrazo && !erro && (
          <Secao titulo="Prazos">
            <Vazio>Nenhum prazo no calendário do AVA. Nem todo professor cadastra as entregas lá.</Vazio>
          </Secao>
        )}
      </Colunas>
    </>
  );
}
