import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <p className="num text-sm text-muted-foreground">404</p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight">Essa página não existe</h1>
      <p className="mt-1 text-muted-foreground">O endereço pode estar errado, ou a página saiu do ar.</p>
      <Link href="/" className="mt-6 text-sm underline underline-offset-4">Voltar pro início</Link>
    </main>
  );
}
