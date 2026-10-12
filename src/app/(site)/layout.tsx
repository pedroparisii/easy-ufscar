import { redirect } from "next/navigation";
import { Atualizado, BottomNav, Header } from "@/components/nav";
import { PainelProvider } from "@/components/painel";
import { getSession } from "@/lib/session";

/** Tudo aqui dentro exige login. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession()).token) redirect("/login");

  return (
    <PainelProvider>
      <Header />
      <main className="mx-auto max-w-4xl px-4 pt-8 pb-28 sm:pb-16">
        {children}
        <Atualizado />
      </main>
      <BottomNav />
    </PainelProvider>
  );
}
