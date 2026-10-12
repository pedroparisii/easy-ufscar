import { AvaError, fetchAva } from "@/lib/ava/ava";
import { getSession } from "@/lib/session";

export const maxDuration = 30;

/** Dados do AVA do aluno logado. O token sai do cookie de sessão, nunca do cliente. */
export async function GET() {
  const session = await getSession();
  if (!session.token) return Response.json({ erro: "Sessão expirada." }, { status: 401 });
  try {
    return Response.json(await fetchAva(session.token));
  } catch (e) {
    if (e instanceof AvaError && e.step === "token") {
      session.destroy();
      return Response.json({ erro: e.message }, { status: 401 });
    }
    return Response.json({ erro: e instanceof AvaError ? e.message : "Não deu pra ler o AVA." }, { status: 502 });
  }
}
