"use client";

import Link from "next/link";
import { tipoDisciplina, Vazio } from "@/components/blocos";
import { Icone, iconeDisciplina } from "@/components/icone";
import { cor, usePainel } from "@/components/painel";
import { Skeleton } from "@/components/ui/skeleton";
import { aulaTexto, fracao, grupo, nomeDisciplina, numero, prazoTexto } from "@/lib/format";

export default function Disciplinas() {
  const { painel, carregando } = usePainel();

  return (
    <>
      <h1 className="text-2xl font-medium tracking-tight">
        {painel.periodo ? `Disciplinas de ${painel.periodo}` : "Disciplinas"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nota parcial do AVA, na escala que cada professor usa. A nota final sai no SIGA.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {carregando && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}

        {painel.disciplinas.map((d) => {
          const total = d.notas.total;
          const parte = fracao(total?.valor, total?.max);
          const proximo = painel.prazos.find((p) => p.disciplinaId === d.id && grupo(p));
          return (
            <Link
              key={d.id}
              href={`/disciplinas/${d.id}`}
              className="flex min-w-0 flex-col rounded-xl border bg-card p-4 transition-colors hover:bg-accent/60"
            >
              <div className="flex items-start gap-3">
                <Icone icone={iconeDisciplina(d.nome)} cor={cor(painel, d.id)} />
                <div className="min-w-0">
                  <p className="leading-snug font-medium">{nomeDisciplina(d.nome)}</p>
                  <p className="text-xs text-muted-foreground">
                    {[...d.horarios.map((h) => aulaTexto(h)), tipoDisciplina(d)].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {parte === null ? (
                  <p className="text-sm text-muted-foreground">{d.url ? "Sem nota lançada no AVA" : "Esta disciplina não está no AVA"}</p>
                ) : (
                  <>
                    <p className="num text-lg">
                      {numero(total?.valor)} <span className="text-sm text-muted-foreground">/ {numero(total?.max)}</span>
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${parte * 100}%`, background: cor(painel, d.id) }} />
                    </div>
                  </>
                )}
              </div>

              {proximo && (
                <p className={`mt-4 truncate text-xs ${proximo.atrasado ? "text-late" : "text-muted-foreground"}`}>
                  {proximo.titulo} · {prazoTexto(proximo).toLowerCase()}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {!carregando && painel.disciplinas.length === 0 && (
        <Vazio>Nenhuma disciplina deste semestre apareceu no AVA.</Vazio>
      )}
    </>
  );
}
