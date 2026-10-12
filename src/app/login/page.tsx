import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./form";

// o login espera o AVA e depois o SIGA; alguns segundos é normal
export const maxDuration = 60;

export default async function LoginPage() {
  if ((await getSession()).token) redirect("/");
  const repo = process.env.NEXT_PUBLIC_REPO_URL;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} className="size-2.5 rounded-full" style={{ background: `var(--d${i})` }} />
        ))}
      </div>
      <h1 className="text-2xl font-medium tracking-tight">Easy UFSCar</h1>
      <p className="mt-1 text-muted-foreground">Seus prazos, notas e histórico, num lugar só.</p>

      <LoginForm />

      <p className="mt-8 text-[15px] leading-relaxed opacity-75 font-light text-muted-foreground">
        Site <strong className="font-medium text-foreground">não oficial</strong>, feito por um aluno da UFSCar. 
        Sua senha é usada uma vez, pra entrar no SIGA e no AVA, e descartada na hora, não temos banco de dados. 
        {repo && (
          <>
            {" "}
            <a href={repo} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
              Ver o código
            </a>
            .
          </>
        )}
      </p>
    </main>
  );
}
