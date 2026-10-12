// Gera fixtures/siga/ (commitáveis) a partir de fixtures/raw/siga/ (páginas reais, fora do git).
// Uso: node scripts/anonymize-siga.mjs
//
// Troca RA, nome, ids de matrícula e tokens de sessão por valores falsos. Notas e
// disciplinas ficam como estão — confira o resultado antes de commitar.

import fs from "node:fs";
import * as cheerio from "cheerio";

const RAW = "fixtures/raw/siga";
const OUT = "fixtures/siga";
const FILES = ["listMatriculas.html", "listMatriculas-click.xml", "acoesMatricula.html", "historico.html",
  "inscricoesResultados.html", "resumoInscricoesResultados.html", "planoEnsino.html"];

const read = (f) => fs.readFileSync(`${RAW}/${f}`, "utf8");
const clean = (s) => s.replace(/\s+/g, " ").trim();

// 1. descobre os dados pessoais olhando as próprias páginas
const personal = new Map(); // valor real -> substituto
const historico = cheerio.load(read("historico.html"));
const ra = clean(historico("td").filter((_, e) => clean(historico(e).text()) === "Aluno:").first().next().text());
if (ra) personal.set(ra, "123456");

const lista = cheerio.load(read("listMatriculas.html"));
lista('table[id*="matriculas-table"] tbody tr[id]').each((_, tr) => {
  const numero = clean(lista(tr).find("td").first().text());
  if (numero) personal.set(numero, "999999");
});

// o nome do aluno aparece no topo, dentro do form de logout
for (const f of FILES.filter((f) => f.endsWith(".html"))) {
  const $ = cheerio.load(read(f));
  $("#logout-form *").each((_, e) => {
    const own = clean($(e).clone().children().remove().end().text());
    if (own.length > 3 && !/^sair$/i.test(own)) personal.set(own, "ALUNO DE TESTE");
  });
}

// ...e no cabeçalho de toda página: "RA - Nome Completo"
for (const f of FILES.filter((f) => f.endsWith(".html"))) {
  const [numero, ...nome] = clean(cheerio.load(read(f))("#identificacao").text()).split(" - ");
  if (numero) personal.set(numero, "123456");
  if (nome.length) personal.set(nome.join(" - "), "ALUNO DE TESTE");
}

// 2. aplica em todos os arquivos
fs.mkdirSync(OUT, { recursive: true });
for (const f of FILES) {
  let text = read(f);
  for (const [real, fake] of personal) text = text.split(real).join(fake);
  text = text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "aluno@exemplo.br")
    .replace(/(matricula(?:_id)?=)\d+/g, "$1999999")
    .replace(/;jsessionid=[^"?&<\s]+/g, "")
    .replace(/(name="javax\.faces\.ViewState"[^>]*value=")[^"]*/g, "$1VIEWSTATE")
    .replace(/(<update id="[^"]*ViewState[^"]*"><!\[CDATA\[)[^\]]*/g, "$1VIEWSTATE");
  fs.writeFileSync(`${OUT}/${f}`, text);

  const leaks = [...personal.keys()].filter((real) => text.includes(real));
  const suspicious = text.replaceAll("aluno@exemplo.br", "").replace(/<script[\s\S]*?<\/script>/g, "").match(/\b\d{11}\b|[\w.]+@[\w.]+\.\w+/g) ?? [];
  console.log(`${f}: ${text.length} bytes${leaks.length ? " — VAZOU DADO PESSOAL" : ""}${suspicious.length ? ` — conferir: ${suspicious.length} CPF/e-mail possíveis` : ""}`);
}
console.log(`${personal.size} valores pessoais substituídos.`);
