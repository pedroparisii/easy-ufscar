/**
 * Sessão = um cookie cifrado (iron-session) com o token do AVA. É o único lugar onde o
 * token existe: o servidor não guarda nada e o JavaScript da página não lê o cookie.
 */

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface Session {
  token?: string;
}

export async function getSession() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("Falta SESSION_SECRET (ver .env.example).");
  return getIronSession<Session>(await cookies(), {
    cookieName: "easy-ufscar",
    password,
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
  });
}
