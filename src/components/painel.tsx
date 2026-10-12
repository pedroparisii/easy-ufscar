"use client";

/**
 * Os dados que as telas mostram, num lugar só.
 *
 *  - histórico do SIGA: veio no login e fica no localStorage (só muda no fim do semestre)
 *  - dados do AVA: vêm de /api/ava e ficam no localStorage por 15 min
 *
 * A tela abre com o que está guardado e atualiza por trás.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Ava } from "@/lib/ava/ava";
import { logout } from "@/app/login/actions";
import { merge, type Painel } from "@/lib/merge/merge";
import type { Historico } from "@/lib/siga/siga";

// mudar o número quando o formato do histórico mudar: quem tem o antigo guardado volta pro login
const HISTORICO = "historico-v2";
const AVA = "ava-v2"; // idem: quem tem o formato antigo só lê o AVA de novo
const VALIDADE = 15 * 60 * 1000;

interface Estado {
  painel: Painel;
  /** ainda não chegou nenhum dado do AVA (primeira visita): mostrar skeleton */
  carregando: boolean;
  atualizando: boolean;
  /** quando os dados do AVA foram lidos (ms) */
  atualizadoEm: number | null;
  erro: string | null;
  atualizar: () => void;
}

const Context = createContext<Estado | null>(null);

export function usePainel(): Estado {
  const estado = useContext(Context);
  if (!estado) throw new Error("usePainel fora do PainelProvider");
  return estado;
}

/** cor da disciplina: pela ordem dela no semestre, numa paleta fixa de 8 (globals.css) */
export function cor(painel: Painel, disciplinaId: number | null): string {
  const i = painel.disciplinas.findIndex((d) => d.id === disciplinaId);
  return i < 0 ? "var(--muted-foreground)" : `var(--d${(i % 8) + 1})`;
}

export function guardarHistorico(historico: Historico | null) {
  localStorage.setItem(HISTORICO, JSON.stringify(historico));
  localStorage.removeItem(AVA);
}

export function limparDados() {
  localStorage.removeItem(HISTORICO);
  localStorage.removeItem("historico"); // formatos antigos
  localStorage.removeItem("ava");
  localStorage.removeItem(AVA);
}

function ler<T>(chave: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(chave) ?? "null");
  } catch {
    return null;
  }
}

export function PainelProvider({ children }: { children: React.ReactNode }) {
  const [historico, setHistorico] = useState<Historico | null>(null);
  const [ava, setAva] = useState<{ em: number; dados: Ava } | null>(null);
  const [atualizando, setAtualizando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    setErro(null);
    try {
      const res = await fetch("/api/ava");
      if (res.status === 401) {
        limparDados();
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro);
      const novo = { em: Date.now(), dados: json as Ava };
      localStorage.setItem(AVA, JSON.stringify(novo));
      setAva(novo);
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : "Não deu pra ler o AVA.");
    } finally {
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    // logado, mas sem o histórico no formato atual (site atualizou, ou os dados do navegador
    // foram apagados): só um login novo lê o SIGA de novo
    if (localStorage.getItem(HISTORICO) === null) {
      void logout().then(() => { window.location.href = "/login"; });
      return;
    }
    const guardado = ler<{ em: number; dados: Ava }>(AVA);
    setHistorico(ler<Historico>(HISTORICO));
    setAva(guardado);
    if (guardado && Date.now() - guardado.em < VALIDADE) setAtualizando(false);
    else void atualizar();
  }, [atualizar]);

  const estado = useMemo((): Estado => ({
    painel: merge(historico, ava?.dados ?? null),
    carregando: !ava && atualizando,
    atualizando,
    atualizadoEm: ava?.em ?? null,
    erro,
    atualizar,
  }), [historico, ava, atualizando, erro, atualizar]);

  return <Context value={estado}>{children}</Context>;
}
