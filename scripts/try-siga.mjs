// Testa o scraper do SIGA de verdade, com a sua conta. Uso: node scripts/try-siga.mjs
// A senha é digitada escondida, não é salva e não aparece na tela.

import readline from "node:readline";
import { SigaError, fetchHistorico } from "../src/lib/siga/siga.ts";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let hidden = false;
rl._writeToOutput = (s) => { if (!hidden) process.stdout.write(s); };
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

const ra = await ask("RA: ");
const typing = ask("Senha: ");
hidden = true; // daqui em diante o que for digitado não aparece
const senha = await typing;
rl.close();
console.log();

try {
  const started = Date.now();
  const h = await fetchHistorico(ra.trim(), senha);
  console.log(`\nOK em ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`${h.curso} — ${h.situacao} — ingresso ${h.ingresso}`);
  console.log(`${h.disciplinas.length} disciplinas, ${h.integralizacao.length} itens de integralização, ${h.faltantes.length} faltantes`);
  console.log("médias:", h.medias, "IRA:", h.ira);
  console.log(`${h.turmas.length} turmas no semestre, ${h.turmas.filter((t) => t.plano).length} com plano de ensino`);
  for (const t of h.turmas) {
    const horarios = t.horarios.map((x) => `${x.dia} ${x.inicio}-${x.fim} (${x.local ?? "?"})`).join(", ");
    console.log(`${t.codigo} ${t.turma} | ${t.nome} | ${horarios} | ${t.professores.join(", ")} | plano: ${t.plano ? `${t.plano.topicos.length} tópicos` : "não"}`);
  }
} catch (e) {
  if (e instanceof SigaError) console.log(`\nFALHOU na etapa "${e.step}": ${e.message}`);
  else throw e;
}
