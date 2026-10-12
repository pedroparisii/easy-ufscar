"use server";

import { headers } from "next/headers";
import { AvaError, fetchToken } from "@/lib/ava/ava";
import { getSession } from "@/lib/session";
import { fetchHistorico, type Historico } from "@/lib/siga/siga";

export type LoginResult = { erro: string } | { historico: Historico | null };

// Freio pra ninguém usar o site pra adivinhar senha: 5 senhas erradas pro mesmo RA, vindas
// do mesmo IP, e esse par espera 10 minutos. Fica só na memória do servidor (some quando ele
// reinicia, e cada instância conta a sua): é um freio, não uma muralha.
const MAX_ERROS = 5;
const ESPERA = 10 * 60 * 1000;
const erros = new Map<string, number[]>();

/**
 * SEGURANÇA: a senha só existe dentro desta função. Não vai pra log, cookie nem resposta.
 */
export async function login(raDigitado: unknown, senha: unknown): Promise<LoginResult> {
  if (typeof raDigitado !== "string" || typeof senha !== "string" || !raDigitado.trim() || !senha) {
    return { erro: "Preencha RA e senha." };
  }
  const ra = raDigitado.trim();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const chave = `${ip} ${ra}`;
  const recentes = (erros.get(chave) ?? []).filter((quando) => Date.now() - quando < ESPERA);
  if (recentes.length >= MAX_ERROS) return { erro: "Muitas tentativas com senha errada. Espere 10 minutos e tente de novo." };

  // quem autentica é o AVA: veio token, o RA existe e a senha está certa
  let token: string;
  try {
    token = await fetchToken(ra, senha);
  } catch (e) {
    if (e instanceof AvaError && e.step === "login") {
      if (erros.size > 5000) erros.clear(); // não deixa a lista crescer sem fim
      erros.set(chave, [...recentes, Date.now()]);
    }
    return { erro: e instanceof AvaError ? e.message : "Não deu pra entrar agora. Tente de novo." };
  }

  // o SIGA é melhor esforço: se cair, o site funciona sem o histórico
  const historico = await fetchHistorico(ra, senha).catch(() => null);

  erros.delete(chave);
  const session = await getSession();
  session.token = token;
  await session.save();
  return { historico };
}

export async function logout(): Promise<void> {
  (await getSession()).destroy();
}
