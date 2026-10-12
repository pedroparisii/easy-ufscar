import { AVA_URL } from "@/lib/ava/ava";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

/**
 * Um arquivo de material do AVA (PDF, slides...), repassado pro navegador sem guardar.
 *
 * Passa por aqui porque o AVA só entrega o arquivo com o token, e o token não sai do
 * servidor. O cliente manda só o caminho do arquivo; o endereço é sempre o do AVA, e é o
 * AVA que confere se o aluno do token pode ver aquele arquivo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ caminho: string[] }> }) {
  const session = await getSession();
  if (!session.token) return new Response("Sessão expirada.", { status: 401 });

  const { caminho } = await params;
  if (caminho.some((parte) => parte === "." || parte === "..")) return new Response("Arquivo inválido.", { status: 400 });
  const url = new URL(`${AVA_URL}/webservice/pluginfile.php/${caminho.map(encodeURIComponent).join("/")}`);
  url.searchParams.set("token", session.token);

  const res = await fetch(url).catch(() => null);
  // sem permissão ou token vencido o AVA responde JSON de erro em vez do arquivo
  if (!res?.ok || !res.body || res.headers.get("content-type")?.includes("json")) {
    return new Response("Não deu pra abrir esse arquivo no AVA.", { status: 502 });
  }
  const headers = new Headers({ "Cache-Control": "private, max-age=3600" });
  for (const nome of ["Content-Type", "Content-Length", "Content-Disposition"]) {
    const valor = res.headers.get(nome);
    if (valor) headers.set(nome, valor);
  }
  return new Response(res.body, { headers });
}
