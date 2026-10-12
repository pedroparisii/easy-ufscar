// Testa o cliente do AVA de verdade, com a sua conta. Uso: node scripts/try-ava.mjs [--save]
// A senha é digitada escondida, não é salva e não aparece na tela.
// --save grava o resultado em fixtures/raw/ava-result.json (fora do git).

import fs from "node:fs";
import readline from "node:readline";
import { AvaError, fetchAva, fetchToken } from "../src/lib/ava/ava.ts";

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
  const ava = await fetchAva(await fetchToken(ra.trim(), senha));
  console.log(`\nOK em ${((Date.now() - started) / 1000).toFixed(1)}s — ${ava.disciplinas.length} disciplinas, ${ava.prazos.length} prazos\n`);
  for (const d of ava.disciplinas) {
    const total = d.notas.total?.valor == null ? "sem nota" : `${d.notas.total.valor} / ${d.notas.total.max}`;
    console.log(`${d.codigo ?? "?"} ${d.turma ?? ""} | ${d.nome} | total: ${total} | ${d.notas.itens.length} itens de nota | ${d.avisos.length} avisos`);
  }
  console.log();
  for (const p of ava.prazos) {
    const quando = new Date(p.data).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
    console.log(`${quando} | ${p.tipo}/${p.evento}${p.atrasado ? " (atrasado)" : ""} | ${p.titulo}`);
  }
  if (process.argv.includes("--save")) {
    fs.writeFileSync("fixtures/raw/ava-result.json", JSON.stringify(ava, null, 1));
    console.log("\nSalvo em fixtures/raw/ava-result.json");
  }
} catch (e) {
  if (e instanceof AvaError) console.log(`\nFALHOU na etapa "${e.step}": ${e.message}`);
  else throw e;
}
