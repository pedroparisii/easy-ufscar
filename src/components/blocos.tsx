"use client";

/** Pedaços que se repetem nas telas: ponto da disciplina, lista de prazos, lista de avisos. */

import { ArrowUpRight, ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { Icone, iconeAviso, iconeEntregue, iconePrazo } from "@/components/icone";
import { cor, usePainel } from "@/components/painel";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { haQuanto, nomeDisciplina, prazoTexto, urgente } from "@/lib/format";
import type { DisciplinaAtual, Painel } from "@/lib/merge/merge";

type Prazo = Painel["prazos"][number];
type Aviso = Painel["avisos"][number];

/** A assinatura visual: o ponto com a cor da disciplina. */
export function Dot({ disciplinaId, className }: { disciplinaId: number | null; className?: string }) {
  const { painel } = usePainel();
  return (
    <span
      aria-hidden
      className={cn("size-2.5 shrink-0 rounded-full", className)}
      style={{ background: cor(painel, disciplinaId) }}
    />
  );
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

/** Caixa com linhas. Com `titulo` vira um card: é o que vai na coluna da direita. */
export function Lista({ titulo, className, children }: { titulo?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("divide-y overflow-hidden rounded-xl border bg-card", className)}>
      {titulo && <h2 className="bg-secondary/50 px-4 py-2 text-xs font-medium text-muted-foreground">{titulo}</h2>}
      {children}
    </div>
  );
}

/**
 * O esqueleto de toda tela: conteúdo à esquerda e, no desktop, cards fixos à direita.
 * No celular é uma coluna só e os cards do lado vêm antes do conteúdo; um card com
 * `className="order-3"` vai pra depois.
 */
export function Colunas({ lado, children }: { lado: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-8">
      <div className="order-2 min-w-0 *:first:mt-0 lg:order-none">{children}</div>
      <aside className="contents lg:sticky lg:top-22 lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col lg:gap-4 lg:self-start lg:overflow-y-auto lg:*:shrink-0">
        {lado}
      </aside>
    </div>
  );
}

/** Linha de uma `Lista` que abre e fecha: o que é longo fica fechado até o aluno querer ler. */
export function Dobra({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent/60 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{titulo}</span>
        {nota && <span className="num shrink-0 text-xs text-muted-foreground">{nota}</span>}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-4 py-3 text-sm leading-relaxed">{children}</div>
    </details>
  );
}

/** Vazio é um estado desenhado: uma frase, nunca um card em branco. */
export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Linhas({ n = 3 }: { n?: number }) {
  return (
    <Lista>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4">
          <Skeleton className="size-2.5 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </Lista>
  );
}

export function PrazoLista({ prazos, comDisciplina = true }: { prazos: Prazo[]; comDisciplina?: boolean }) {
  const { painel } = usePainel();
  return (
    <Lista>
      {prazos.map((p) => (
        <a
          key={p.id}
          href={p.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/60"
        >
          <Icone icone={p.entregue ? iconeEntregue : iconePrazo(p.titulo, p.tipo)} cor={p.atrasado ? "var(--late)" : cor(painel, p.disciplinaId)} className="size-8 transition-transform group-hover:scale-110" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{p.titulo}</p>
            <p className="truncate text-xs text-muted-foreground">
              <span className={cn(p.entregue ? "font-medium text-done" : p.atrasado ? "font-medium text-late" : urgente(p.data) && "font-medium text-soon")}>
                {prazoTexto(p)}
              </span>
              {comDisciplina && p.disciplina && ` · ${nomeDisciplina(p.disciplina)}`}
            </p>
          </div>
          {/* no hover a seta entra: a linha abre a atividade no AVA */}
          <ArrowUpRight className="size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
        </a>
      ))}
    </Lista>
  );
}

export function AvisoLista({ avisos, comDisciplina = true, titulo, className }: { avisos: Aviso[]; comDisciplina?: boolean; titulo?: string; className?: string }) {
  const { painel } = usePainel();
  const [aberto, setAberto] = useState<Aviso | null>(null);
  return (
    <>
      <Lista titulo={titulo} className={className}>
        {avisos.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum aviso dos professores por enquanto.</p>}
        {avisos.map((a) => (
          <button
            key={a.id}
            onClick={() => setAberto(a)}
            className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60"
          >
            <Icone icone={iconeAviso(a.titulo)} cor={cor(painel, a.disciplinaId)} className="mt-0.5 size-8 transition-transform group-hover:scale-110" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <p className="min-w-0 flex-1 truncate text-sm">{a.titulo}</p>
                <p className="shrink-0 text-xs text-muted-foreground">{haQuanto(a.data)}</p>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {comDisciplina && `${nomeDisciplina(a.disciplina)} · `}{a.texto}
              </p>
            </div>
          </button>
        ))}
      </Lista>

      <Sheet open={aberto !== null} onOpenChange={(open) => !open && setAberto(null)}>
        <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-3xl gap-0 overflow-y-auto rounded-t-2xl">
          {aberto && (
            <>
              <SheetHeader className="pr-12">
                <SheetTitle className="text-left leading-snug">{aberto.titulo}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 text-left">
                  <Dot disciplinaId={aberto.disciplinaId} />
                  {nomeDisciplina(aberto.disciplina)} · {aberto.autor} · {haQuanto(aberto.data)}
                </SheetDescription>
              </SheetHeader>
              <p className="px-4 text-sm leading-relaxed whitespace-pre-line">{aberto.texto}</p>
              <a
                href={aberto.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 p-4 text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Abrir no AVA <ExternalLink className="size-3.5" />
              </a>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** "obrigatória · 60h" / "optativa" — só o que o SIGA permite afirmar */
export function tipoDisciplina(d: DisciplinaAtual): string | null {
  if (d.obrigatoria === null) return null;
  if (!d.obrigatoria) return "optativa";
  return d.horas ? `obrigatória · ${d.horas}h` : "obrigatória";
}
