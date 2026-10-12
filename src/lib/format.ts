/**
 * Texto que a tela mostra: datas, números e nomes do jeito que gente fala.
 * Funções puras. Toda data é exibida no horário de Brasília (o AVA manda em UTC).
 */

const TZ = "America/Sao_Paulo";
const HOUR = 60 * 60 * 1000;

/** "2026-10-12" no horário de Brasília */
const diaSP = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

/** quantos dias do calendário faltam (negativo = já passou) */
export function diasAte(data: string, agora = new Date()): number {
  return Math.round((Date.parse(diaSP(new Date(data))) - Date.parse(diaSP(agora))) / (24 * HOUR));
}

/** "hoje, 23:59" · "amanhã, 23:59" · "sexta, 23:59" · "30 de out., 23:59" */
export function quando(data: string, agora = new Date()): string {
  const d = new Date(data);
  const dias = diasAte(data, agora);
  const dia =
    dias === 0 ? "hoje"
    : dias === 1 ? "amanhã"
    : dias === -1 ? "ontem"
    : dias > 1 && dias < 7 ? d.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long" }).replace("-feira", "")
    : d.toLocaleDateString("pt-BR", { timeZone: TZ, day: "numeric", month: "short" });
  return `${dia}, ${d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })}`;
}

export const GRUPOS = ["Atrasado", "Hoje", "Esta semana", "Depois"] as const;
export type Grupo = (typeof GRUPOS)[number];

/** Em que bloco do Início o prazo entra. null = já passou e não ficou pendente: some. */
export function grupo(prazo: { data: string; atrasado: boolean; entregue?: boolean }, agora = new Date()): Grupo | null {
  if (prazo.atrasado && !prazo.entregue) return "Atrasado";
  if (Date.parse(prazo.data) < agora.getTime()) return null;
  const dias = diasAte(prazo.data, agora);
  return dias === 0 ? "Hoje" : dias <= 7 ? "Esta semana" : "Depois";
}

/** vence em até 48h */
export function urgente(data: string, agora = new Date()): boolean {
  const falta = Date.parse(data) - agora.getTime();
  return falta > 0 && falta <= 48 * HOUR;
}

/** "Entrega amanhã, 23:59" · "Fecha sexta, 23:59" · "Venceu ontem, 23:59" */
export function prazoTexto(prazo: { data: string; atrasado: boolean; evento: string; entregue?: boolean }, agora = new Date()): string {
  if (prazo.entregue) return `Entregue · prazo ${quando(prazo.data, agora)}`;
  const verbo = prazo.atrasado ? "Venceu" : prazo.evento === "open" ? "Abre" : prazo.evento === "close" ? "Fecha" : "Entrega";
  return `${verbo} ${quando(prazo.data, agora)}`;
}

/** "há 5 min" · "há 2 h" · "ontem" */
export function haQuanto(data: string | number, agora = new Date()): string {
  const min = Math.floor((agora.getTime() - new Date(data).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 24 * 60) return `há ${Math.floor(min / 60)} h`;
  const dias = Math.floor(min / (24 * 60));
  return dias === 1 ? "ontem" : dias < 30 ? `há ${dias} dias` : new Date(data).toLocaleDateString("pt-BR", { timeZone: TZ });
}

/** 7.5 -> "7,5" · 83.33333 -> "83,3" · null -> "—" */
export function numero(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

const MINUSCULAS = new Set(["a", "à", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "no", "o", "para"]);
const SIGLAS = /^(ia|ti|tcc|ii|iii|iv|vi|vii|viii)$/;

/** O SIGA e o AVA escrevem tudo em maiúsculas: "CÁLCULO DIFERENCIAL E INTEGRAL 1" -> "Cálculo Diferencial e Integral 1" */
export function nomeDisciplina(nome: string): string {
  if (nome !== nome.toUpperCase()) return nome;
  return nome.toLowerCase().split(" ").map((w, i) => {
    if (SIGLAS.test(w)) return w.toUpperCase();
    if (i > 0 && MINUSCULAS.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}

/** fração 0–1 da nota, pra barra. null quando não dá pra desenhar (sem nota ou máximo 0). */
export function fracao(valor: number | null | undefined, max: number | null | undefined): number | null {
  if (valor == null || !max || max <= 0) return null;
  return Math.min(1, Math.max(0, valor / max));
}

interface Aula {
  dia: string;
  inicio: string;
  fim: string;
  local: string | null;
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOME_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
/** "8:00" -> 480, pra comparar horários */
const minutos = (hora: string) => Number(hora.split(":")[0]) * 60 + Number(hora.split(":")[1] ?? 0);

/** "Ter 8:00–12:00 · AT2-111" */
export function aulaTexto(aula: Aula, comDia = true): string {
  return [`${comDia ? `${aula.dia} ` : ""}${aula.inicio}–${aula.fim}`, aula.local].filter(Boolean).join(" · ");
}

/**
 * As aulas que faltam hoje; se não tem mais nenhuma, as do próximo dia com aula.
 * `quando` é "Hoje", "Amanhã" ou o dia da semana.
 */
export function proximasAulas<T extends { horarios: Aula[] }>(disciplinas: T[], agora = new Date()) {
  const hoje = new Date(`${diaSP(agora)}T12:00:00Z`).getUTCDay();
  const [hora = "0", minuto = "0"] = agora.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).split(":");
  const agoraMin = Number(hora) * 60 + Number(minuto);

  for (let daqui = 0; daqui < 7; daqui++) {
    const dia = (hoje + daqui) % 7;
    const aulas = disciplinas
      .flatMap((disciplina) => disciplina.horarios.map((aula) => ({ disciplina, aula })))
      .filter(({ aula }) => aula.dia === DIAS[dia] && (daqui > 0 || minutos(aula.fim) > agoraMin))
      .sort((a, b) => minutos(a.aula.inicio) - minutos(b.aula.inicio));
    if (aulas.length) return { quando: daqui === 0 ? "Hoje" : daqui === 1 ? "Amanhã" : NOME_DIA[dia] ?? "", aulas };
  }
  return null;
}

/** "340 kB", "1,2 MB" */
export function tamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
