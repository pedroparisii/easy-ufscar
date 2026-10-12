import { describe, expect, it } from "vitest";
import { aulaTexto, fracao, grupo, haQuanto, nomeDisciplina, numero, prazoTexto, proximasAulas, quando, urgente } from "./format.ts";

// segunda, 12/10/2026, 10:00 em Brasília
const agora = new Date("2026-10-12T13:00:00Z");

describe("datas", () => {
  it("entrega 23:59 de Brasília chega do AVA como o dia seguinte em UTC", () => {
    expect(quando("2026-10-13T02:59:00Z", agora)).toBe("hoje, 23:59");
    expect(quando("2026-10-14T02:59:00Z", agora)).toBe("amanhã, 23:59");
    expect(quando("2026-10-12T02:59:00Z", agora)).toBe("ontem, 23:59");
    expect(quando("2026-10-17T02:59:00Z", agora)).toBe("sexta, 23:59");
    expect(quando("2026-10-31T02:59:00Z", agora)).toBe("30 de out., 23:59");
  });

  it("agrupa os prazos do Início", () => {
    expect(grupo({ data: "2026-10-12T02:59:00Z", atrasado: true }, agora)).toBe("Atrasado");
    expect(grupo({ data: "2026-10-12T02:59:00Z", atrasado: false }, agora)).toBeNull();
    expect(grupo({ data: "2026-10-13T02:59:00Z", atrasado: false }, agora)).toBe("Hoje");
    expect(grupo({ data: "2026-10-19T02:59:00Z", atrasado: false }, agora)).toBe("Esta semana");
    expect(grupo({ data: "2026-10-31T02:59:00Z", atrasado: false }, agora)).toBe("Depois");
  });

  it("urgente = vence em até 48h", () => {
    expect(urgente("2026-10-14T02:59:00Z", agora)).toBe(true);
    expect(urgente("2026-10-19T02:59:00Z", agora)).toBe(false);
    expect(urgente("2026-10-12T02:59:00Z", agora)).toBe(false);
  });

  it("fala o que acontece na data", () => {
    expect(prazoTexto({ data: "2026-10-14T02:59:00Z", atrasado: false, evento: "due" }, agora)).toBe("Entrega amanhã, 23:59");
    expect(prazoTexto({ data: "2026-10-31T02:59:00Z", atrasado: false, evento: "close" }, agora)).toBe("Fecha 30 de out., 23:59");
    expect(prazoTexto({ data: "2026-10-12T02:59:00Z", atrasado: true, evento: "due" }, agora)).toBe("Venceu ontem, 23:59");
  });

  it("há quanto tempo", () => {
    expect(haQuanto("2026-10-12T12:55:00Z", agora)).toBe("há 5 min");
    expect(haQuanto("2026-10-12T10:00:00Z", agora)).toBe("há 3 h");
    expect(haQuanto("2026-10-11T10:00:00Z", agora)).toBe("ontem");
  });
});

describe("números e nomes", () => {
  it("nota em pt-BR, sem inventar zero", () => {
    expect(numero(7.5)).toBe("7,5");
    expect(numero(83.33333)).toBe("83,3");
    expect(numero(null)).toBe("—");
  });

  it("barra de nota só quando dá pra desenhar", () => {
    expect(fracao(7.5, 10)).toBe(0.75);
    expect(fracao(12, 10)).toBe(1);
    expect(fracao(null, 10)).toBeNull();
    expect(fracao(5, 0)).toBeNull();
  });

  it("tira o nome da disciplina das maiúsculas", () => {
    expect(nomeDisciplina("CÁLCULO DIFERENCIAL E INTEGRAL 1")).toBe("Cálculo Diferencial e Integral 1");
    expect(nomeDisciplina("APLICAÇÕES DE IA GENERATIVA")).toBe("Aplicações de IA Generativa");
    expect(nomeDisciplina("Tópicos em Redes")).toBe("Tópicos em Redes");
  });
});

describe("aulas", () => {
  const disciplinas = [
    { nome: "ED", horarios: [{ dia: "Seg", inicio: "8:00", fim: "12:00", local: "LEC" }] },
    { nome: "Física", horarios: [{ dia: "Seg", inicio: "14:00", fim: "18:00", local: "ATLAB-108" }] },
    { nome: "Arq", horarios: [{ dia: "Ter", inicio: "8:00", fim: "12:00", local: null }] },
  ];

  it("mostra o que falta hoje, e depois o próximo dia com aula", () => {
    // segunda 10:00: a aula da manhã ainda está acontecendo
    expect(proximasAulas(disciplinas, agora)?.aulas.map((a) => a.disciplina.nome)).toEqual(["ED", "Física"]);
    // segunda 13:00: só a da tarde
    expect(proximasAulas(disciplinas, new Date("2026-10-12T16:00:00Z"))).toMatchObject({ quando: "Hoje", aulas: [{ disciplina: { nome: "Física" } }] });
    // segunda 19:00: acabou, mostra terça
    expect(proximasAulas(disciplinas, new Date("2026-10-12T22:00:00Z"))).toMatchObject({ quando: "Amanhã", aulas: [{ disciplina: { nome: "Arq" } }] });
    // quarta: a próxima é segunda
    expect(proximasAulas(disciplinas, new Date("2026-10-14T13:00:00Z"))?.quando).toBe("Segunda");
    expect(proximasAulas([], agora)).toBeNull();
  });

  it("escreve horário e sala", () => {
    expect(aulaTexto({ dia: "Ter", inicio: "8:00", fim: "12:00", local: "AT2-111" })).toBe("Ter 8:00–12:00 · AT2-111");
    expect(aulaTexto({ dia: "Ter", inicio: "8:00", fim: "12:00", local: null }, false)).toBe("8:00–12:00");
  });
});
