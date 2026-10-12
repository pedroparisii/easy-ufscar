import {
  Atom, BookOpen, BrainCircuit, Building2, Cpu, Dumbbell, Factory, FlaskConical, Hand, Leaf, ListTree, Map, Network,
  CalendarClock, CalendarX, ClipboardCheck, FolderOpen, Lightbulb, ListChecks, ListTodo, MapPin, Megaphone, NotebookPen,
  Upload, PenLine, Pi, Route, Scale, SquareFunction, TrendingUp,
} from "lucide-react";
import { describe, expect, it } from "vitest";
import { iconeAviso, iconeDisciplina, iconePrazo } from "./icone.tsx";

describe("ícone pelo nome da disciplina", () => {
  it("ignora acento e caixa", () => {
    expect(iconeDisciplina("CÁLCULO DIFERENCIAL E INTEGRAL 1")).toBe(SquareFunction);
    expect(iconeDisciplina("Física Geral 1")).toBe(Atom);
  });

  it("o assunto vence o formato", () => {
    expect(iconeDisciplina("Laboratório de Arquitetura de Computadores")).toBe(Cpu);
    expect(iconeDisciplina("Laboratório Integrado")).toBe(FlaskConical);
  });

  it("nomes que enganam", () => {
    expect(iconeDisciplina("Estruturas de Dados")).toBe(ListTree);
    expect(iconeDisciplina("Estruturas de Concreto")).toBe(Building2);
    expect(iconeDisciplina("Estruturas Algébricas")).toBe(Pi);
    expect(iconeDisciplina("Educação Física Escolar")).toBe(Dumbbell);
    expect(iconeDisciplina("Geografia Física")).toBe(Map);
    expect(iconeDisciplina("Língua Brasileira de Sinais")).toBe(Hand);
    expect(iconeDisciplina("Redes Neurais")).toBe(BrainCircuit);
    expect(iconeDisciplina("Redes de Computadores")).toBe(Network);
    expect(iconeDisciplina("Programação Linear")).toBe(Route);
    expect(iconeDisciplina("Leitura e Produção de Textos")).toBe(PenLine);
    expect(iconeDisciplina("Planejamento e Controle da Produção")).toBe(Factory);
    expect(iconeDisciplina("Direito Ambiental")).toBe(Scale);
    expect(iconeDisciplina("Educação Ambiental")).toBe(Leaf);
    expect(iconeDisciplina("Microeconomia")).toBe(TrendingUp);
  });

  it("sem regra, fica o livro", () => {
    expect(iconeDisciplina("Tópicos Especiais 2")).toBe(BookOpen);
  });
});

describe("ícone de prazo e de aviso", () => {
  it("prazo: pelo título, e pelo tipo do Moodle quando o título não diz nada", () => {
    expect(iconePrazo("Experimento 3 - Entrega (03/10/2026)", "assign")).toBe(FlaskConical);
    expect(iconePrazo("Projeto I - IA Generativa para Atividade Criativa", "assign")).toBe(Lightbulb);
    expect(iconePrazo("Lista 4 - Prompt I", "quiz")).toBe(ListTodo);
    expect(iconePrazo("P2", "quiz")).toBe(NotebookPen);
    expect(iconePrazo("Atividade 5", "assign")).toBe(Upload);
    expect(iconePrazo("Atividade 5", "quiz")).toBe(ListChecks);
  });

  it("aviso: o que muda a agenda vence o assunto", () => {
    expect(iconeAviso("Suspensão da Aula no dia 11/09")).toBe(CalendarX);
    expect(iconeAviso("Prorrogação do questionário 1")).toBe(CalendarClock);
    expect(iconeAviso("Mudança de sala")).toBe(MapPin);
    expect(iconeAviso("Notas da P1")).toBe(ClipboardCheck);
    expect(iconeAviso("Primeira lista disponível")).toBe(ListTodo);
    expect(iconeAviso("Atualização no material de aula")).toBe(FolderOpen);
    expect(iconeAviso("Aviso importante")).toBe(Megaphone);
  });
});
