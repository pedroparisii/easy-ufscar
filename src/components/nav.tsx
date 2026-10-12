"use client";

import { BookOpen, GraduationCap, House, LogOut, Moon, RefreshCw, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { logout } from "@/app/login/actions";
import { limparDados, usePainel } from "@/components/painel";
import { Button } from "@/components/ui/button";
import { haQuanto } from "@/lib/format";

const TELAS = [
  { href: "/", nome: "Início", icone: House },
  { href: "/disciplinas", nome: "Disciplinas", icone: BookOpen },
  { href: "/curso", nome: "Curso", icone: GraduationCap },
];

function useAtiva() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function trocarTema() {
  const escuro = document.documentElement.classList.toggle("dark");
  localStorage.theme = escuro ? "dark" : "light";
}

const REPO = process.env.NEXT_PUBLIC_REPO_URL;

// a marca do GitHub (o lucide não traz ícones de marca)
function GitHub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

async function sair() {
  await logout();
  limparDados();
  window.location.href = "/login";
}

/** Topo: nome do site, as telas (no desktop) e as ações. */
export function Header() {
  const ativa = useAtiva();
  const { atualizar, atualizando, atualizadoEm } = usePainel();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4">
        <Link href="/" className="font-medium tracking-tight">Easy UFSCar</Link>
        <nav className="hidden gap-1 sm:flex">
          {TELAS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                ativa(t.href) && "bg-secondary text-foreground",
              )}
            >
              {t.nome}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center">
          {REPO && (
            <Button asChild variant="ghost" size="icon" title="Ver o código no GitHub">
              <a href={REPO} target="_blank" rel="noreferrer">
                <GitHub />
                <span className="sr-only">Código no GitHub</span>
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={atualizar}
            disabled={atualizando}
            title={atualizadoEm ? `AVA atualizado ${haQuanto(atualizadoEm)}. Atualizar agora` : "Atualizar"}
          >
            <RefreshCw className={cn(atualizando && "animate-spin")} />
            <span className="sr-only">Atualizar</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={trocarTema} title="Tema claro ou escuro">
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
            <span className="sr-only">Trocar tema</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={sair} title="Sair" className="hover:bg-late/10 hover:text-late dark:hover:bg-late/15">
            <LogOut />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

/** No celular as três telas ficam embaixo, no alcance do dedão. */
export function BottomNav() {
  const ativa = useAtiva();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="grid grid-cols-3">
        {TELAS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
              ativa(t.href) && "font-medium text-foreground",
            )}
          >
            <t.icone className="size-5" strokeWidth={ativa(t.href) ? 2.25 : 1.75} />
            {t.nome}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Rodapé de toda tela: de quando é o dado. */
export function Atualizado() {
  const { atualizadoEm, atualizando, painel } = usePainel();
  return (
    <p className="mt-12 text-center text-xs text-muted-foreground">
      {atualizando ? "Atualizando o AVA…" : atualizadoEm ? `AVA atualizado ${haQuanto(atualizadoEm)}` : "Sem dados do AVA"}
      {painel.historico && " · histórico do SIGA lido no login"}
    </p>
  );
}
