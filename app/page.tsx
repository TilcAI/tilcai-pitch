import { Deck } from "@/components/Deck";
import deck from "@/content/deck";

// Pitch de TilcAI (texto en content/deck.ts; guion del sketch en content/sketch.ts).
//
//   /            en vivo: → avanza, P abre la ventana del guion, F pantalla completa
//   /?s=2        empieza en la diapositiva 2 (el sketch)
//   /?s=2&t=38   el sketch desde el segundo 38 (para revisar una escena)
//   /?auto       avanza sola con los tiempos del guion (para ensayar)
export default async function PitchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const start = Number(one(params.s)) || 1;
  const filmAt = one(params.t) !== undefined ? Number(one(params.t)) : undefined;
  return <Deck deck={deck} mode={{ start: start - 1, auto: "auto" in params, filmAt, hold: "hold" in params, clean: "clean" in params }} />;
}
