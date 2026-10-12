import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy UFSCar",
  description: "SIGA e AVA num lugar só. Site não oficial, feito por estudantes.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// aplica o tema antes de pintar a tela, pra não piscar claro no modo escuro
const theme = `try{var t=localStorage.theme;if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: theme }} />
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
