"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";
import { AvisoLista, Colunas, Dobra, Linhas, Lista, PrazoLista, Secao, tipoDisciplina, Vazio } from "@/components/blocos";
import { Estudar } from "@/components/estudar";
import { Icone, iconeDisciplina } from "@/components/icone";
import { cor, usePainel } from "@/components/painel";
import { Button } from "@/components/ui/button";
import { grupo, nomeDisciplina, numero } from "@/lib/format";

export default function Disciplina() {
  const { id } = useParams<{ id: string }>();
  const { painel, carregando } = usePainel();
  const [aba, setAba] = useState<"Resumo" | "Estudar">("Resumo");
  const d = painel.disciplinas.find((x) => String(x.id) === id);

  const voltar = (
    <Link href="/disciplinas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Disciplinas
    </Link>
  );

  if (carregando) return <>{voltar}<div className="mt-6"><Linhas n={5} /></div></>;
  if (!d) return <>{voltar}<div className="mt-6"><Vazio>Essa disciplina não está no seu semestre.</Vazio></div></>;

  const total = d.notas.total;
  const plano = d.plano;
  const prazos = painel.prazos.filter((p) => p.disciplinaId === d.id && grupo(p));
  const avisos = painel.avisos.filter((a) => a.disciplinaId === d.id);

  return (
    <>
      {voltar}
      <div className="mt-4 flex items-start gap-3">
        <Icone icone={iconeDisciplina(d.nome)} cor={cor(painel, d.id)} className="size-11" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-medium tracking-tight text-balance">{nomeDisciplina(d.nome)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[tipoDisciplina(d), d.turma && `turma ${d.turma}`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <Colunas
        lado={
          <>
            {d.horarios.length > 0 && (
              <Lista titulo="Aulas">
                {d.horarios.map((h) => (
                  <div key={h.dia + h.inicio} className="flex items-baseline gap-3 px-4 py-3 text-sm">
                    <p className="w-9 shrink-0 font-medium">{h.dia}</p>
                    <p className="num flex-1">{h.inicio}–{h.fim}</p>
                    {h.local && <p className="min-w-0 truncate text-xs text-muted-foreground">{h.local}</p>}
                  </div>
                ))}
              </Lista>
            )}
            {d.professores.length > 0 && (
              <Lista titulo={d.professores.length === 1 ? "Professor" : "Professores"}>
                {d.professores.map((nome) => <p key={nome} className="px-4 py-3 text-sm">{nomeDisciplina(nome)}</p>)}
              </Lista>
            )}
            {d.url && (
              <Button asChild variant="outline">
                <a href={d.url} target="_blank" rel="noreferrer">Abrir no AVA <ExternalLink /></a>
              </Button>
            )}
          </>
        }
      >
        <div className="inline-flex gap-1 rounded-lg bg-secondary p-1">
          {(["Resumo", "Estudar"] as const).map((nome) => (
            <button
              key={nome}
              onClick={() => setAba(nome)}
              aria-pressed={aba === nome}
              className={cn("rounded-md px-4 py-1.5 text-sm transition-colors", aba === nome ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {nome}
            </button>
          ))}
        </div>

        {aba === "Estudar" ? <Estudar d={d} cor={cor(painel, d.id)} /> : <>
      <Secao titulo="Notas no AVA">
        {!d.url ? (
          <Vazio>Esta disciplina não está no AVA: notas, prazos e avisos chegam por outro canal.</Vazio>
        ) : d.notas.itens.length === 0 ? (
          <Vazio>Sem notas lançadas no AVA. Tem professor que só divulga por fora.</Vazio>
        ) : (
          <Lista>
            {d.notas.itens.map((n, i) => (
              <div key={i} className="flex items-baseline gap-4 px-4 py-3">
                <p className="min-w-0 flex-1 text-sm">{n.nome || "Sem nome"}</p>
                <p className={`num shrink-0 text-sm ${n.valor === null ? "text-muted-foreground" : ""}`}>
                  {numero(n.valor)} <span className="text-muted-foreground">/ {numero(n.max)}</span>
                </p>
              </div>
            ))}
            {total && total.valor !== null && (
              <div className="flex items-baseline gap-4 bg-secondary/50 px-4 py-3">
                <p className="flex-1 text-sm font-medium">Total parcial</p>
                <p className="num shrink-0 text-sm font-medium">
                  {numero(total.valor)} <span className="font-normal text-muted-foreground">/ {numero(total.max)}</span>
                </p>
              </div>
            )}
          </Lista>
        )}
      </Secao>

      <Secao titulo="Prazos">
        {prazos.length ? <PrazoLista prazos={prazos} comDisciplina={false} /> : <Vazio>Nada pra entregar por enquanto.</Vazio>}
      </Secao>

      <Secao titulo="Avisos">
        {avisos.length ? <AvisoLista avisos={avisos} comDisciplina={false} /> : <Vazio>Nenhum aviso nesta disciplina.</Vazio>}
      </Secao>

      <Secao titulo="Plano de ensino">
        {plano ? (
          <Lista>
            {plano.avaliacao && <Dobra titulo="Como a nota é calculada"><Texto>{plano.avaliacao}</Texto></Dobra>}
            {plano.ementa && <Dobra titulo="Ementa"><Texto>{plano.ementa}</Texto></Dobra>}
            {plano.objetivos && <Dobra titulo="Objetivos"><Texto>{plano.objetivos}</Texto></Dobra>}
            {plano.bibliografia && <Dobra titulo="Bibliografia básica"><Texto>{plano.bibliografia}</Texto></Dobra>}
          </Lista>
        ) : (
          <Vazio>Sem plano de ensino. O professor pode não ter publicado no SIGA; entre de novo pra tentar ler outra vez.</Vazio>
        )}
      </Secao>
        </>}
      </Colunas>
    </>
  );
}

function Texto({ children }: { children: string }) {
  return <p className="whitespace-pre-line text-muted-foreground">{children}</p>;
}
