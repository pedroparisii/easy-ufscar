"use client";

/**
 * A aba "Estudar" de uma disciplina: os tópicos do plano de ensino como lista pra ir
 * marcando, e os materiais que o professor pôs no AVA, com busca.
 *
 * O que o aluno marcou fica só no navegador dele (localStorage), por disciplina e semestre.
 */

import { ArrowUpRight, Check, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { Lista, Secao, Vazio } from "@/components/blocos";
import { Icone, iconeMaterial } from "@/components/icone";
import { Input } from "@/components/ui/input";
import { tamanho } from "@/lib/format";
import type { DisciplinaAtual } from "@/lib/merge/merge";

export function Estudar({ d, cor }: { d: DisciplinaAtual; cor: string }) {
  const topicos = d.plano?.topicos ?? [];
  const chave = `estudo:${d.codigo ?? d.id}:${d.periodo ?? ""}`;
  const [vistos, setVistos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [soPdf, setSoPdf] = useState(false);

  useEffect(() => {
    try {
      setVistos(JSON.parse(localStorage.getItem(chave) ?? "[]"));
    } catch {
      setVistos([]);
    }
  }, [chave]);

  function marcar(titulo: string) {
    const novo = vistos.includes(titulo) ? vistos.filter((t) => t !== titulo) : [...vistos, titulo];
    setVistos(novo);
    localStorage.setItem(chave, JSON.stringify(novo));
  }

  const feitos = topicos.filter((t) => vistos.includes(t.titulo));
  const horas = (lista: typeof topicos) => lista.reduce((s, t) => s + (t.horas ?? 0), 0);
  // a barra anda pelas horas de aula de cada tópico; sem horas no plano, pela contagem
  const parte = topicos.length === 0 ? 0 : horas(topicos) > 0 ? horas(feitos) / horas(topicos) : feitos.length / topicos.length;

  const termo = busca.trim().toLowerCase();
  const secoes = d.materiais
    .map((s) => ({
      ...s,
      materiais: s.materiais.filter((m) => (!soPdf || m.formato === "pdf") && (!termo || `${m.nome} ${s.nome}`.toLowerCase().includes(termo))),
    }))
    .filter((s) => s.materiais.length > 0);
  const total = d.materiais.reduce((s, x) => s + x.materiais.length, 0);
  const temPdf = d.materiais.some((s) => s.materiais.some((m) => m.formato === "pdf"));

  return (
    <>
      <Secao titulo="O que cai">
        {topicos.length === 0 ? (
          <Vazio>O plano de ensino desta disciplina não lista os tópicos. Vale conferir com o professor o que entra na prova.</Vazio>
        ) : (
          <Lista>
            <div className="px-4 py-3">
              <p className="text-sm">
                {feitos.length === topicos.length ? "Tudo visto" : `${feitos.length} de ${topicos.length} tópicos vistos`}
                {horas(topicos) > 0 && <span className="num text-muted-foreground"> · {horas(feitos)} de {horas(topicos)} h de aula</span>}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${parte * 100}%`, background: cor }} />
              </div>
            </div>
            {topicos.map((t) => {
              const visto = vistos.includes(t.titulo);
              return (
                <button
                  key={t.titulo}
                  onClick={() => marcar(t.titulo)}
                  aria-pressed={visto}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60"
                >
                  <span
                    className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors", !visto && "border-muted-foreground/50 group-hover:border-foreground")}
                    style={visto ? { background: cor, borderColor: cor } : undefined}
                  >
                    {visto && <Check className="size-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className={cn("min-w-0 flex-1 text-sm", visto && "text-muted-foreground line-through")}>{t.titulo}</span>
                  {t.horas !== null && <span className="num shrink-0 text-xs text-muted-foreground">{t.horas} h</span>}
                </button>
              );
            })}
          </Lista>
        )}
      </Secao>

      <Secao titulo={total > 0 ? `Materiais · ${total}` : "Materiais"}>
        {!d.url ? (
          <Vazio>Esta disciplina não está no AVA: o material chega por outro canal.</Vazio>
        ) : total === 0 ? (
          <Vazio>Nenhum material no AVA. Tem professor que manda por e-mail ou Drive.</Vazio>
        ) : (
          <>
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar material" aria-label="Buscar material" className="pl-9" />
              </div>
              {temPdf && (
                <button
                  onClick={() => setSoPdf(!soPdf)}
                  aria-pressed={soPdf}
                  className={cn("rounded-md border px-3 text-sm transition-colors", soPdf ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
                >
                  Só PDF
                </button>
              )}
            </div>
            {secoes.length === 0 && <Vazio>Nada com esse filtro.</Vazio>}
            <div className="space-y-5">
              {secoes.map((s, i) => (
                <div key={s.nome + i}>
                  {s.nome && <p className="mb-1.5 px-1 text-xs text-muted-foreground">{s.nome}</p>}
                  <Lista>
                    {s.materiais.map((m, j) => (
                      <a
                        key={j}
                        href={m.arquivo ? `/api/arquivo${m.arquivo.split("/").map(encodeURIComponent).join("/")}` : m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/60"
                      >
                        <Icone icone={iconeMaterial(m.formato)} cor={cor} className="size-8 transition-transform group-hover:scale-110" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{m.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.arquivo ? m.formato.toUpperCase() : m.formato === "video" ? "Vídeo" : m.formato === "link" ? "Link" : "Página no AVA"}
                            {m.tamanho !== null && ` · ${tamanho(m.tamanho)}`}
                          </p>
                        </div>
                        <ArrowUpRight className="size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                      </a>
                    ))}
                  </Lista>
                </div>
              ))}
            </div>
          </>
        )}
      </Secao>
    </>
  );
}
