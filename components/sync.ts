/** Mensajes entre el pitch (/) y la vista de notas (/notas), por BroadcastChannel. */
export const CHANNEL = "tilcai-pitch";

export interface DeckState {
  type: "state";
  index: number;
  startedAt: number;
  slideAt: number;
  auto: boolean;
  /** Reloj del pitch al enviar (para corregir la diferencia de hora entre dispositivos). */
  now: number;
  /** Segundo del sketch y si corre (solo cuenta en la diapositiva del sketch). */
  film: { t: number; playing: boolean };
  subtitles: boolean;
}

export type DeckMessage =
  | DeckState
  | { type: "hello" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "go"; index: number }
  | { type: "timer" }
  | { type: "auto" }
  | { type: "film-toggle" }
  | { type: "film-seek"; t: number }
  | { type: "subtitles" };

/** 83 000 ms → "1:23". */
export function clock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
