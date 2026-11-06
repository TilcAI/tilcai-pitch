"use client";

import { useEffect, useRef, useState } from "react";
import { COLOR_AT, SCENES, SKETCH_SECONDS, sceneAt } from "@/content/sketch";
import type { Deck, Line } from "@/content/types";
import { plain } from "./rich";
import { CHANNEL, clock, type DeckMessage, type DeckState } from "./sync";

const WHO: Record<Line["who"], string> = {
  esposo: "Esposo",
  esposa: "Esposa",
  claude: "Claude",
  narrador: "Pantalla",
};
const KIND: Record<Line["kind"], string> = {
  dice: "dice",
  piensa: "piensa",
  pantalla: "en pantalla",
};

/**
 * Vista del guion (/notas): sigue al pitch abierto en otra ventana del mismo navegador y lo
 * controla. En el sketch resalta la escena y la línea que corresponde al segundo actual,
 * con cuenta regresiva para quien dobla la siguiente voz.
 */
export function Notes({ deck }: { deck: Deck }) {
  const [state, setState] = useState<DeckState | null>(null);
  const [received, setReceived] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  /** Diferencia entre el reloj del pitch y el de este dispositivo. */
  const [offset, setOffset] = useState(0);
  const [remote, setRemote] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  /** Última vez que llegó estado por BroadcastChannel (mismo navegador). */
  const lastLocal = useRef(0);
  const currentLine = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const accept = (next: DeckState, local: boolean) => {
      const t = Date.now();
      setState(next);
      setReceived(t);
      setOffset(next.now ? next.now - t : 0);
      setRemote(!local);
    };
    const bc = new BroadcastChannel(CHANNEL);
    channel.current = bc;
    bc.onmessage = (event: MessageEvent<DeckMessage>) => {
      if (event.data.type !== "state") return;
      lastLocal.current = Date.now();
      accept(event.data, true);
    };
    bc.postMessage({ type: "hello" } satisfies DeckMessage);

    // Sin pitch en este navegador (p. ej. teléfono por Tailscale): leer el relé.
    let busy = false;
    const poll = window.setInterval(async () => {
      if (busy || Date.now() - lastLocal.current < 1500) return;
      busy = true;
      try {
        const res = await fetch("/api/sync", { cache: "no-store" });
        const data = (await res.json()) as { state: DeckState | null };
        if (data.state && Date.now() - lastLocal.current >= 1500) accept(data.state, false);
      } catch {
        // sin red: se reintenta
      } finally {
        busy = false;
      }
    }, 250);
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => {
      bc.close();
      window.clearInterval(id);
      window.clearInterval(poll);
    };
  }, []);

  const send = (msg: DeckMessage) => {
    if (Date.now() - lastLocal.current < 1500) channel.current?.postMessage(msg);
    else
      void fetch("/api/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msg }),
      }).catch(() => undefined);
  };
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const map: Record<string, DeckMessage> = {
        arrowright: { type: "next" },
        pagedown: { type: "next" },
        arrowleft: { type: "prev" },
        pageup: { type: "prev" },
        " ": { type: "film-toggle" },
        t: { type: "timer" },
        a: { type: "auto" },
        s: { type: "subtitles" },
      };
      const msg = map[key];
      if (!msg) return;
      event.preventDefault();
      sendRef.current(msg);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Segundo del sketch interpolado entre mensajes (llegan cada 200 ms).
  const filmT = state
    ? Math.min(
        SKETCH_SECONDS,
        state.film.t + (state.film.playing ? (now - received) / 1000 : 0),
      )
    : 0;
  const scene = sceneAt(filmT);
  const lineKey = SCENES.flatMap((s) => s.lines).find(
    (l) => filmT >= l.at && filmT < l.at + l.dur,
  );

  useEffect(() => {
    currentLine.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [scene.n, lineKey?.at]);

  if (!state) {
    return (
      <main className="notes-window">
        <p className="notes-wait">
          Esperando al pitch… Ábrelo en otra ventana de este navegador (tecla P) o en
          cualquier equipo de la red: esta vista se conecta sola.
        </p>
      </main>
    );
  }

  const slides = deck.slides;
  const slide = slides[state.index];
  const next = slides[state.index + 1];
  const deckNow = now + offset;
  const elapsed = deckNow - state.startedAt;
  const isSketch = slide.layout === "sketch";
  const slideElapsed = isSketch ? (filmT - (slide.film?.from ?? 0)) * 1000 : deckNow - state.slideAt;
  const planned = slides.reduce((sum, s) => sum + s.seconds, 0);
  const target =
    slides.slice(0, state.index + 1).reduce((sum, s) => sum + s.seconds, 0) *
    1000;
  const upcoming = SCENES.flatMap((s) => s.lines).find(
    (l) => l.at > filmT && l.who !== "narrador",
  );

  return (
    <main className="notes-window">
      <header className="notes-top">
        <span className="notes-kicker">{slide.section}</span>
        <span className="notes-link">{remote ? "red" : "local"}</span>
        <span className="notes-count">
          {state.index + 1} / {slides.length}
        </span>
        <dl className="notes-clocks">
          <div className={slideElapsed > slide.seconds * 1000 ? "is-late" : ""}>
            <dt>{isSketch ? "sketch" : "diapositiva"}</dt>
            <dd>
              {clock(slideElapsed)}{" "}
              <small>/ {clock(slide.seconds * 1000)}</small>
            </dd>
          </div>
          <div className={elapsed > target ? "is-late" : ""}>
            <dt>total</dt>
            <dd>
              {clock(elapsed)} <small>/ {clock(planned * 1000)}</small>
            </dd>
          </div>
        </dl>
      </header>

      {isSketch ? (
        <section className="script">
          <div className="script-sticky">
            <div
              className="script-bar"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                send({
                  type: "film-seek",
                  t: ((e.clientX - r.left) / r.width) * SKETCH_SECONDS,
                });
              }}
            >
              {SCENES.map((s) => (
                <span
                  key={s.n}
                  className={`script-seg${s.n === scene.n ? " is-now" : ""}${s.from >= COLOR_AT ? " is-color" : ""}`}
                  style={{ flexGrow: s.to - s.from }}
                  title={`${s.n}. ${s.title}`}
                >
                  {s.n}
                </span>
              ))}
              <i
                className="script-head"
                style={{ left: `${(filmT / SKETCH_SECONDS) * 100}%` }}
              />
            </div>
            <p className="script-cue">
              {state.film.playing ? "▶" : "❚❚"} {clock(filmT * 1000)} · escena{" "}
              {scene.n}: <b>{scene.title}</b>
              {upcoming && (
                <>
                  {" "}
                  · próxima voz:{" "}
                  <b className={`who-${upcoming.who}`}>
                    {WHO[upcoming.who]}
                  </b>{" "}
                  en {Math.max(0, upcoming.at - filmT).toFixed(1)} s
                </>
              )}
            </p>
          </div>
          <ol className="scenes">
            {SCENES.map((s) => {
              const isNow = s.n === scene.n;
              return (
                <li
                  key={s.n}
                  className={`scene${isNow ? " is-now" : ""}${filmT >= s.to ? " is-past" : ""}`}
                >
                  <button
                    type="button"
                    className="scene-head"
                    onClick={() => send({ type: "film-seek", t: s.from })}
                  >
                    <span className="scene-time">
                      {clock(s.from * 1000)}–{clock(s.to * 1000)}
                    </span>
                    <span className="scene-title">
                      {s.n}. {s.title}
                    </span>
                    <span className="scene-era">
                      {s.from < COLOR_AT ? "cine mudo" : "color"}
                    </span>
                  </button>
                  <p className="scene-action">{s.action}</p>
                  <p className="scene-meta">
                    🎥 {s.camera} · 🔊 {s.sound}
                  </p>
                  {s.lines.length > 0 && (
                    <ul className="lines">
                      {s.lines.map((l) => {
                        const live = filmT >= l.at && filmT < l.at + l.dur;
                        return (
                          <li
                            key={l.at}
                            ref={live ? currentLine : undefined}
                            className={`line who-${l.who}${live ? " is-live" : ""}${filmT >= l.at + l.dur ? " is-past" : ""}`}
                          >
                            <span className="line-time">
                              {clock(l.at * 1000)}
                            </span>
                            <span className="line-who">
                              {WHO[l.who]} <small>{KIND[l.kind]}</small>
                            </span>
                            <span className="line-text">{l.text}</span>
                            {live && (
                              <i
                                className="line-progress"
                                style={{
                                  width: `${((filmT - l.at) / l.dur) * 100}%`,
                                }}
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <section className="talk">
          <h1 className="notes-title">{plain(slide.title)}</h1>
          <p className="notes-body">{slide.script}</p>
          {next && (
            <p className="notes-next">
              Sigue: <b>{plain(next.title)}</b>
            </p>
          )}
        </section>
      )}

      <nav className="notes-controls">
        <button type="button" onClick={() => send({ type: "prev" })}>
          ← {isSketch ? "Escena anterior" : "Anterior"}
        </button>
        {isSketch && (
          <button
            type="button"
            className="is-primary"
            onClick={() => send({ type: "film-toggle" })}
          >
            {state.film.playing ? "Pausa" : "Reproducir"}
          </button>
        )}
        <button
          type="button"
          className={isSketch ? "" : "is-primary"}
          onClick={() => send({ type: "next" })}
        >
          {isSketch ? "Escena siguiente" : "Siguiente"} →
        </button>
        {isSketch && (
          <button type="button" onClick={() => send({ type: "subtitles" })}>
            Subtítulos: {state.subtitles ? "sí" : "no"}
          </button>
        )}
        <button type="button" onClick={() => send({ type: "timer" })}>
          Reiniciar tiempo
        </button>
        <button type="button" onClick={() => send({ type: "auto" })}>
          {state.auto ? "Detener automático" : "Automático"}
        </button>
      </nav>
    </main>
  );
}
