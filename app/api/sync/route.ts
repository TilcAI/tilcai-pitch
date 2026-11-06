import type { DeckMessage, DeckState } from "@/components/sync";

/**
 * Relé entre el pitch y la vista del guion cuando están en dispositivos distintos
 * (por ejemplo, el pitch en el proyector y /notas en un teléfono por Tailscale).
 * En el mismo navegador basta BroadcastChannel; esto es el camino por la red.
 *
 *   POST { state, since }   el pitch publica su estado y recoge los comandos pendientes
 *   GET                     /notas lee el último estado
 *   PUT  { msg }            /notas envía un comando (siguiente, pausa…)
 *
 * El estado vive en memoria del proceso: reiniciar el servidor lo borra.
 */
interface Relay {
  state: DeckState | null;
  commands: { id: number; msg: DeckMessage }[];
  next: number;
}

const g = globalThis as typeof globalThis & { __tilcaiRelay?: Relay };
const relay: Relay = (g.__tilcaiRelay ??= { state: null, commands: [], next: 1 });

const ALLOWED = new Set(["next", "prev", "go", "timer", "auto", "film-toggle", "film-seek", "subtitles"]);

export async function GET() {
  return Response.json({ state: relay.state }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { state?: DeckState; since?: number } | null;
  if (body?.state?.type === "state") relay.state = body.state;
  const since = Number(body?.since) || 0;
  const commands = relay.commands.filter((c) => c.id > since);
  return Response.json({ commands, last: relay.next - 1 }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { msg?: DeckMessage } | null;
  const msg = body?.msg;
  if (!msg || !ALLOWED.has(msg.type)) return Response.json({ ok: false }, { status: 400 });
  relay.commands.push({ id: relay.next++, msg });
  if (relay.commands.length > 50) relay.commands.splice(0, relay.commands.length - 50);
  return Response.json({ ok: true });
}
