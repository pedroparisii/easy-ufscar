/**
 * Os ícones do site, escolhidos pelo texto: o da disciplina sai do nome dela; o de um prazo
 * ou aviso, do título (prova, lista, experimento, aula suspensa...).
 *
 * Não existe lista de disciplinas: são regras por palavra-chave, e vale a primeira que
 * bater. Por isso a ordem importa: o assunto vem antes do formato ("Laboratório de Física"
 * é física, não laboratório) e o específico antes do genérico ("Educação Física" antes de
 * "física"). O que não bate em nada fica com o livro.
 */

import {
  Apple, AppWindow, File, FileArchive, FileImage, FileSpreadsheet, FileText, FileType, Link2, CalendarClock, CalendarX, Check, ClipboardCheck, FilePenLine, FolderOpen, LifeBuoy,
  Lightbulb, ListChecks, ListTodo, MapPin, MessagesSquare, NotebookPen, Upload, Video,
 Atom, AudioWaveform, BadgeCheck, Binary, Blocks, BookOpen, BookOpenText, Bot, Braces, Brain,
  BrainCircuit, Briefcase, Building2, Calculator, Camera, ChartColumn, CircuitBoard, Clapperboard, ClipboardList,
  CloudSun, Code, Cog, Coins, Cpu, Database, Dices, Dna, DraftingCompass, Droplets, Dumbbell, Factory, FileCode,
  FileSearch, Flame, FlaskConical, FlaskRound, Gamepad2, Gauge, Gem, GraduationCap, Grid3x3, Hand, HandHeart,
  Handshake, HardHat, HeartPulse, Hourglass, KeyRound, Landmark, Languages, Leaf, ListTree, type LucideIcon, Map,
  Megaphone, MessageCircleQuestion, Microscope, Mountain, MousePointerClick, Move3d, Music, Network, Palette,
  PawPrint, PenLine, Pi, Pill, Plane, Presentation, Rainbow, Rocket, Route, Scale, School, Server, Shapes,
  SquareFunction, Stethoscope, Sun, Telescope, Terminal, TreePine, TrendingUp, Triangle, Truck, Users, Waypoints,
  Wheat, Zap,
} from "lucide-react";
import { cn } from "cn";

// as palavras estão sem acento e em minúsculas, como o nome fica depois de `semAcento`
const REGRAS: [RegExp, LucideIcon][] = [
  // nomes que enganam as regras de baixo
  [/libras|lingua brasileira de sinais/, Hand],
  [/educacao fisica|atividade fisica|esporte|ginastica|treinamento/, Dumbbell],
  [/mecanica (quantica|classica|estatistica|analitica)|fisica (estatistica|matematica)/, Atom],
  [/matematica financeira|financ|contabil|custos|investimento|mercado de capitais|tribut/, Coins],
  [/direito|legislacao|juridic/, Scale],
  [/producao(?! de texto)|manufatura/, Factory],
  [/pesquisa operacional|otimizacao|programacao (linear|inteira|matematica)/, Route],

  // computação
  [/inteligencia artificial|\bia\b|aprendizado (de maquina|profundo)|machine learning|redes neurais|mineracao de dados|ciencia de dados/, BrainCircuit],
  [/bancos? de dados|\bsql\b/, Database],
  [/seguranca (da informacao|de redes|de sistemas|computacional|cibernetica)|criptografia/, KeyRound],
  [/sistemas distribuidos|\bredes\b|internet/, Network],
  [/de computadores|microprocessador|microcontrolador|(sistemas|circuitos|logica) digita|sistemas embarcados|hardware/, Cpu],
  [/sistemas operacionais/, Terminal],
  [/compiladores|linguagens formais|automatos|teoria da computacao|computabilidade/, FileCode],
  [/grafos/, Waypoints],
  [/estruturas? de dados/, ListTree],
  [/algoritmos/, Binary],
  [/computacao grafica|processamento de imagens|visao computacional|realidade virtual/, Shapes],
  [/interacao humano|interface|usabilidade|experiencia do usuario/, MousePointerClick],
  [/jogos/, Gamepad2],
  [/robotica/, Bot],
  [/software|\bweb\b|dispositivos moveis|desenvolvimento de sistemas/, AppWindow],
  [/sistemas de informacao/, Server],
  [/programacao|orientacao a objetos|orientad[ao] a objetos/, Code],

  // matemática e estatística
  [/estatistica|inferencia|regressao|amostragem|analise de dados/, ChartColumn],
  [/probabilidade|estocastic/, Dices],
  [/(calculo|analise|metodos) numeric/, Calculator],
  [/calculo|equacoes diferenciais|\bseries\b|analise (real|matematica|complexa)|variaveis complexas/, SquareFunction],
  [/geometria analitica|vetores/, Move3d],
  [/algebra linear|matrizes/, Grid3x3],
  [/geometria|trigonometria/, Triangle],
  [/matematica discreta|\blogica|teoria dos numeros|combinatoria|conjuntos/, Braces],
  [/matematica|algebr/, Pi],

  // terra, vida e ambiente (antes de "física" por causa de "geografia física")
  [/geografia|cartografia|geoprocessamento|topografia|sensoriamento|geotecnologia/, Map],
  [/clima|meteorologia/, CloudSun],
  [/\bsolos?\b|geologia|mineralogia|pedologia|paleontologia/, Mountain],
  [/genetica|molecular|genomica|evolucao/, Dna],
  [/florest|silvicultura|dendrologia|madeira|arborizacao/, TreePine],
  [/botanica|vegetal|vegetais|plantas/, Leaf],
  [/zoologia|animal|animais|fauna|vertebrados|entomologia/, PawPrint],
  [/\bagro|agricultura|fitotecnia|irrigacao|cultivo/, Wheat],
  [/ecologia|ambiental|meio ambiente|sustentabilidade|conservacao|recursos naturais|biodiversidade/, Leaf],
  [/bioquimica/, FlaskRound],
  [/anatomia|fisiologia|histologia|embriologia/, HeartPulse],
  [/farmac/, Pill],
  [/saude|enfermagem|epidemiologia|medicina|clinica|patologia/, Stethoscope],
  [/nutricao|alimentos/, Apple],
  [/biologia|celular|citologia|microbiologia|imunologia|parasitologia/, Microscope],

  // química e física
  [/quimica|estequiometria/, FlaskConical],
  [/eletronica|circuitos/, CircuitBoard],
  [/eletromagnetismo|eletric|eletrotecnica|sistemas de potencia/, Zap],
  [/termodinamica|transferencia de calor|fenomenos de transporte|\bcalor\b|combustao/, Flame],
  [/fluidos|hidraulica|hidrologia|saneamento/, Droplets],
  [/\boptica|fotonica/, Rainbow],
  [/\bondas\b|acustica|vibracoes|\bsinais\b/, AudioWaveform],
  [/astronomia|astrofisica|cosmologia/, Telescope],
  [/fisica|relatividade/, Atom],

  // engenharias
  [/desenho tecnico|expressao grafica|\bcad\b|desenho/, DraftingCompass],
  [/mecanica|dinamica|estatica|cinematica|resistencia dos materiais|elementos de maquinas|maquinas/, Cog],
  [/qualidade/, BadgeCheck],
  [/controle|automacao|instrumentacao/, Gauge],
  [/materiais|metalurgia|polimeros|ceramic/, Gem],
  [/seguranca do trabalho|ergonomia|higiene/, HardHat],
  [/construcao|estruturas|concreto|edificac|civil|arquitetura|urbanismo/, Building2],
  [/energia|renovave/, Sun],
  [/logistica|cadeia de suprimentos|\btransportes?\b/, Truck],
  [/fabricacao|processos|operacoes unitarias|reatores|industrial/, Factory],

  // linguagens e artes
  [/ingles|espanhol|frances|alemao|lingua estrangeira|idioma|traducao/, Languages],
  [/literatura|poesia/, BookOpenText],
  [/portugues|linguistica|gramatica|fonetica|leitura|redacao|producao de textos?|escrita|comunicacao e expressao/, PenLine],
  [/musica|musical/, Music],
  [/teatro|cinema|audiovisual/, Clapperboard],
  [/fotografia/, Camera],
  [/\bartes?\b|estetica|design/, Palette],

  // humanas
  [/psico|cognit|comportamento/, Brain],
  [/filosofia|epistemologia/, MessageCircleQuestion],
  [/historia/, Hourglass],
  [/etica/, Handshake],
  [/politic|teoria do estado|governo|gestao publica/, Landmark],
  [/infancia|infantil|crianca|ludic/, Blocks],
  [/didatica|pedagog|ensino|educacao|aprendizagem|alfabetizacao|curriculo|escola|docencia/, School],
  [/sociologia|sociedade|antropologia|\bcultura|social|gestao de pessoas|recursos humanos|lideranca/, Users],

  // negócios e turismo
  [/\b(micro|macro)?econ/, TrendingUp],
  [/marketing|publicidade|vendas/, Megaphone],
  [/empreended|inovacao|startup/, Rocket],
  [/turismo|turistic|hotelaria|hospitalidade|viagens|lazer|eventos/, Plane],
  [/projetos?|planejamento|gestao|gerencia|administracao|organizac/, ClipboardList],

  // quando o nome só diz o formato, ou é genérico demais
  [/trabalho de (conclusao|graduacao)|\btcc\b|monografia/, GraduationCap],
  [/estagio/, Briefcase],
  [/metodologia|pesquisa|cientific/, FileSearch],
  [/seminario|comunicacao/, Presentation],
  [/extensao|\bacie|comunidade/, HandHeart],
  [/laboratorio|experimental|pratica/, FlaskConical],
  [/computacao|computacional|informatica/, Code],
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function iconeDisciplina(nome: string): LucideIcon {
  const limpo = semAcento(nome);
  return REGRAS.find(([regra]) => regra.test(limpo))?.[1] ?? BookOpen;
}

// o que é a atividade, pelo título: vale pra prazo e pra aviso
const ATIVIDADES: [RegExp, LucideIcon][] = [
  [/\bprovas?\b|\bexame|avaliacao|\bp[1-4]\b|substitutiva|recuperacao/, NotebookPen],
  [/experimento|\bexp ?\d|relatorio|laboratorio|pratica/, FlaskConical],
  [/video|gravacao/, Video],
  [/seminario|apresentacao|\bpitch\b/, Presentation],
  [/projeto/, Lightbulb],
  [/\blistas?\b|exercicio/, ListTodo],
  [/questionario|\bquiz|\btestes?\b|\bt[1-4]\b/, ListChecks],
  [/forum|discussao|debate/, MessagesSquare],
  [/leitura|resenha|fichamento|resumo|artigo/, BookOpenText],
  [/codigo|implementacao|programa\b/, Code],
  [/trabalho|redacao|ensaio|\btexto/, FilePenLine],
];

/** Ícone de um prazo. \`tipo\` é o módulo do Moodle ("assign", "quiz"...), usado quando o título não diz nada. */
export function iconePrazo(titulo: string, tipo: string): LucideIcon {
  const limpo = semAcento(titulo);
  const peloTitulo = ATIVIDADES.find(([regra]) => regra.test(limpo))?.[1];
  return peloTitulo ?? (tipo === "quiz" ? ListChecks : tipo === "forum" ? MessagesSquare : tipo === "assign" ? Upload : CalendarClock);
}

// o que o professor costuma avisar; o que muda a agenda do aluno vem primeiro
const AVISOS: [RegExp, LucideIcon][] = [
  [/suspens|cancel|nao havera|sem aula|feriado|paralisacao|greve/, CalendarX],
  [/\bsala\b|\blocal\b|predio|auditorio/, MapPin],
  [/monitoria|atendimento|duvidas|plantao/, LifeBuoy],
  [/prorrog|adiad|adiamento|nova data|remarc|reposicao|mudanca|alteracao|horario|comecando|atras/, CalendarClock],
  [/\bnotas?\b|resultado|gabarito|correcao|vista de prova|\bmedias?\b/, ClipboardCheck],
];
const MATERIAL = /material|slides?|arquivo|disponive|apostila|bibliografia|\.\w{2,4}$/;

export function iconeAviso(titulo: string): LucideIcon {
  const limpo = semAcento(titulo);
  const regra = [...AVISOS, ...ATIVIDADES].find(([r]) => r.test(limpo));
  return regra?.[1] ?? (MATERIAL.test(limpo) ? FolderOpen : Megaphone);
}

export const iconeEntregue = Check;

const MATERIAIS: Record<string, LucideIcon> = {
  pdf: FileText, doc: FileType, docx: FileType, odt: FileType, txt: FileType, tex: FileType,
  ppt: Presentation, pptx: Presentation, odp: Presentation, pps: Presentation, ppsx: Presentation,
  xls: FileSpreadsheet, xlsx: FileSpreadsheet, ods: FileSpreadsheet, csv: FileSpreadsheet,
  zip: FileArchive, rar: FileArchive, "7z": FileArchive, gz: FileArchive,
  png: FileImage, jpg: FileImage, jpeg: FileImage, gif: FileImage, svg: FileImage,
  mp4: Video, mkv: Video, webm: Video, video: Video,
  py: FileCode, c: FileCode, cpp: FileCode, h: FileCode, java: FileCode, js: FileCode, ipynb: FileCode, m: FileCode, r: FileCode, sql: FileCode,
  link: Link2, pagina: BookOpenText,
};

/** Ícone de um material do AVA, pelo formato (extensão do arquivo, "link", "video", "pagina"). */
export function iconeMaterial(formato: string): LucideIcon {
  return MATERIAIS[formato] ?? File;
}

/** Um ícone num círculo com a cor da disciplina: a versão grande do ponto colorido. */
export function Icone({ icone: Desenho, cor, className }: { icone: LucideIcon; cor: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", className)}
      style={{ color: cor, background: `color-mix(in oklab, ${cor} 14%, transparent)` }}
    >
      <Desenho className="size-[55%]" strokeWidth={1.75} />
    </span>
  );
}
