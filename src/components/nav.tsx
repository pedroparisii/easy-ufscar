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
          <Button variant="ghost" size="icon" onClick={sair} title="Sair">
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
