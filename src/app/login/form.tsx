"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { guardarHistorico } from "@/components/painel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

// o login é uma chamada só; as mensagens trocam pelo tempo que cada etapa costuma levar
const ETAPAS = [
  { depois: 0, texto: "Entrando no AVA…" },
  { depois: 2000, texto: "Lendo seu histórico no SIGA…" },
  { depois: 6000, texto: "Lendo horários e planos de ensino…" },
  { depois: 20000, texto: "O SIGA tá lento hoje, quase lá…" },
];

export function LoginForm() {
  const [entrando, setEntrando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!entrando) return;
    const timers = ETAPAS.map((e, i) => setTimeout(() => setEtapa(i), e.depois));
    return () => timers.forEach(clearTimeout);
  }, [entrando]);

  // onSubmit e não `action`: dentro de uma action o React segura o setEntrando até o login acabar
  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setErro(null);
    setEtapa(0);
    setEntrando(true);
    try {
      const resultado = await login(form.get("ra"), form.get("senha"));
      if ("erro" in resultado) {
        setErro(resultado.erro);
        setEntrando(false);
        return;
      }
      guardarHistorico(resultado.historico);
      window.location.href = "/";
    } catch {
      setErro("Não deu pra entrar agora. Tente de novo.");
      setEntrando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="mt-8 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ra">RA</Label>
        <Input id="ra" name="ra" inputMode="numeric" autoComplete="username" required disabled={entrando} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required disabled={entrando} className="h-11" />
      </div>
      {erro && <p role="alert" className="text-sm text-late">{erro}</p>}
      <Button type="submit" disabled={entrando} className="h-11 w-full">
        {entrando ? <><LoaderCircle className="animate-spin" /> {ETAPAS[etapa]?.texto}</> : "Entrar"}
      </Button>
    </form>
  );
}
