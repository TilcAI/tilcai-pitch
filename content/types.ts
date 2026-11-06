/**
 * Forma del pitch. El texto vive en content/deck.ts y content/sketch.ts; el motor
 * (components/ y three/) solo lo dibuja.
 *
 * Marcas dentro de cualquier texto:
 *   *palabras*   se resaltan en violeta
 *   [[dato]]     dato por confirmar: sale con borde punteado
 */

export type Layout =
  | "cover"
  | "sketch"
  | "statement"
  | "cards"
  | "flow"
  | "demo"
  | "evidence"
  | "roadmap"
  | "team"
  | "closing";

export type Status = "verificado" | "mainnet" | "publicado" | "laboratorio" | "pendiente";

export interface Item {
  title: string;
  text?: string;
  /** Cifra o etiqueta corta (roadmap: cuándo; evidence: valor). */
  value?: string;
  status?: Status;
  /** Foto (equipo), ruta dentro de /public. */
  photo?: string;
  /** Ícono simple de components/icons.tsx. */
  icon?: IconName;
}

export type IconName =
  | "chat"
  | "quote"
  | "shield"
  | "check"
  | "bolt"
  | "link"
  | "receipt"
  | "wallet"
  | "store"
  | "agent"
  | "lock"
  | "clock"
  | "users"
  | "globe";

/** Qué hace el escenario 3D en cada diapositiva. */
export type StageCue =
  | { act: "host"; pose: HostPose }
  | { act: "sketch" }
  | { act: "phones"; pose: "hero" | "side" };

export type HostPose = "cover" | "problem" | "solution" | "flow" | "evidence" | "roadmap" | "team" | "closing";

export interface SlideData {
  id: string;
  section: string;
  layout: Layout;
  /** Segundos previstos al hablar. */
  seconds: number;
  title: string;
  lead?: string;
  items?: Item[];
  note?: string;
  footnote?: string;
  stage?: StageCue;
  /** Sketch: tramo de la película (segundos) que muestra esta diapositiva. */
  film?: { from: number; to: number };
  /** Guion del presentador (vista de notas). */
  script: string;
}

export interface Deck {
  name: string;
  url: string;
  event: string;
  /** Videos de la demo en los teléfonos (public/video). Reemplazar por los reales. */
  videos: { claude: string; vaquita: string };
  slides: SlideData[];
}

/* ---------------------------------------------------------------- sketch */

export type Speaker = "esposo" | "esposa" | "claude" | "narrador";

export interface Line {
  /** Segundo del sketch en que empieza. */
  at: number;
  /** Cuánto dura en pantalla (intertítulo, burbuja o subtítulo). */
  dur: number;
  who: Speaker;
  /** Pensamiento (burbuja) o diálogo (voz). */
  kind: "dice" | "piensa" | "pantalla";
  text: string;
  /** Pieza especial en pantalla en vez de cartel o burbuja. */
  fx?: "title" | "pum" | "checkout" | "calendar" | "mandate" | "end";
}

export interface SketchScene {
  n: number;
  title: string;
  from: number;
  to: number;
  place: string;
  emotion: string;
  /** Acción, en una o dos frases (notas). */
  action: string;
  camera: string;
  sound: string;
  lines: Line[];
}
