"use client";

import { animate, type Timeline } from "animejs";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SCENES, SKETCH_SECONDS, sceneAt } from "@/content/sketch";
import type { Deck as DeckData } from "@/content/types";
import { FilmClock, type World } from "@/three/world";
import { revealSlide, settle } from "./reveal";
import { plain } from "./rich";
import { SketchOverlay } from "./SketchOverlay";
import { Slide } from "./Slide";
import { CHANNEL, clock as fmt, type DeckMessage, type DeckState } from "./sync";

export interface DeckMode {
  /** Diapositiva inicial (desde 0). */
  start: number;
  /** Avanza sola según los segundos de cada diapositiva. */
  auto: boolean;
  /** Segundo del sketch donde empezar (?t=), para revisar una escena. */
  filmAt?: number;
  /** Sketch congelado en filmAt (?hold), para capturas. */
  hold?: boolean;
  /** Sin ayuda ni barra (?clean). */
  clean?: boolean;
}

interface View {
  index: number;
  visit: number;
  leaving: { index: number; visit: number; back: boolean } | null;
  back: boolean;
}

/**
 * El pitch: lienzo de 1920 × 1080 (16:9) que se escala a la pantalla, con las diapositivas
 * en HTML y un único lienzo WebGL encima (gato, Clawd, teléfonos o el sketch).
 *
 * Teclas: → / espacio avanzar · ← volver · F pantalla completa · N notas · P ventana de
 * notas · A automático · T reiniciar tiempo · R repetir entrada · H ocultar barra.
 * En el sketch: espacio pausa, → / ← escena siguiente / anterior, S subtítulos.
 */
export function Deck({ deck, mode }: { deck: DeckData; mode: DeckMode }) {
  const total = deck.slides.length;
  const clamp = useCallback((i: number) => Math.min(total - 1, Math.max(0, i)), [total]);
  const [view, setView] = useState<View>(() => ({ index: clamp(mode.start), visit: 0, leaving: null, back: false }));
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState(!mode.clean);
  const [notes, setNotes] = useState(false);
  /** Ayuda fijada con «?»; sin fijar, aparece al pasar el mouse por arriba. */
  const [help, setHelp] = useState(false);
  const [auto, setAuto] = useState(mode.auto);
  const [subtitles, setSubtitles] = useState(true);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [slideAt, setSlideAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const filmClock = useMemo(() => new FilmClock(), []);
  useEffect(() => {
    // Solo en desarrollo: acceso al reloj del sketch para las pruebas cuadro a cuadro.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __film?: FilmClock }).__film = filmClock;
  }, [filmClock]);
  const [film, setFilm] = useState({ t: 0, playing: false });

  const currentRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const timeline = useRef<Timeline | null>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const slide = deck.slides[view.index];
  const isSketch = slide.layout === "sketch";

  const go = useCallback(
    (next: number, replay = false) =>
      setView((v) => {
        const index = clamp(next);
        if (index === v.index && !replay) return v;
        const back = index < v.index;
        return { index, visit: v.visit + 1, back, leaving: replay ? null : { index: v.index, visit: v.visit, back } };
      }),
    [clamp],
  );
  const step = useCallback((delta: number) => go(viewRef.current.index + delta), [go]);

  // Dentro del sketch, → y ← saltan de escena dentro del tramo; en los bordes, pasan de
  // diapositiva (el sketch está partido: 0–78 s antes de presentar TilcAI y 78–90 s después).
  const advance = useCallback(
    (delta: number) => {
      const current = deck.slides[viewRef.current.index];
      if (current.layout !== "sketch") return step(delta);
      const { from, to } = filmRange(current);
      const scene = sceneAt(filmClock.t);
      if (delta > 0) {
        const next = SCENES.find((s) => s.from > scene.from && s.from < to);
        if (!next || filmClock.t >= filmClock.end - 0.05) return step(1);
        filmClock.seek(next.from);
        filmClock.play();
      } else {
        const inScene = filmClock.t - Math.max(scene.from, from);
        if (scene.from <= from && inScene < 1) return step(-1);
        const prev = inScene > 1.5 || scene.from <= from ? scene : SCENES[Math.max(0, SCENES.indexOf(scene) - 1)];
        filmClock.seek(Math.max(from, prev.from));
      }
    },
    [deck.slides, filmClock, step],
  );

  const toggleFilm = useCallback(() => {
    if (filmClock.playing) filmClock.pause();
    else filmClock.play();
  }, [filmClock]);

  // El lienzo ocupa la pantalla sin deformarse (16:9, con bandas si hace falta).
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Un solo mundo 3D durante toda la presentación.
  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    let created: World | null = null;
    let alive = true;
    import("@/three/world").then(({ World }) => {
      if (!alive || !canvasRef.current) return;
      created = new World(canvasRef.current, deck.videos, filmClock);
      world.current = created;
      created.setCue(deck.slides[viewRef.current.index].stage);
    });
    return () => {
      alive = false;
      created?.dispose();
      world.current = null;
    };
  }, [ready, deck, filmClock]);

  useEffect(() => {
    world.current?.setPixelRatio(Math.min(2, window.devicePixelRatio * scale));
  }, [scale, ready]);

  // Cada diapositiva nueva: entrada animada (o completa si se vuelve atrás).
  useLayoutEffect(() => {
    const root = currentRef.current;
    if (!ready || !root) return;
    timeline.current?.complete();
    timeline.current = null;
    setSlideAt(Date.now());
    world.current?.setCue(deck.slides[view.index].stage);
    if (view.back) {
      settle(root);
      return;
    }
    const tl = revealSlide(root, Math.min(5200, deck.slides[view.index].seconds * 300));
    timeline.current = tl;
    const delay = window.setTimeout(() => tl.play(), 260);
    return () => window.clearTimeout(delay);
  }, [ready, view.index, view.visit, view.back, deck.slides]);

  // El sketch arranca al entrar (en su tramo) y se pausa al salir.
  useEffect(() => {
    if (!isSketch) {
      filmClock.pause();
      return;
    }
    const { from, to } = filmRange(deck.slides[view.index]);
    // Un tramo que no es el final se detiene justo antes del corte de cámara.
    filmClock.end = to >= SKETCH_SECONDS ? to : to - 0.05;
    const at = mode.filmAt !== undefined && view.visit === 0 ? mode.filmAt : from;
    filmClock.seek(view.back ? filmClock.end : Math.min(filmClock.end, Math.max(from, at)));
    filmClock.pause();
    if (view.back || mode.hold) return;
    const id = window.setTimeout(() => filmClock.play(), 700);
    return () => window.clearTimeout(id);
  }, [isSketch, view.index, view.visit, view.back, filmClock, mode.filmAt, mode.hold, deck.slides]);

  // La que se va sale hacia un lado y se desvanece.
  useEffect(() => {
    const el = leavingRef.current;
    const leaving = view.leaving;
    if (!el || !leaving) return;
    const dir = leaving.back ? 1 : -1;
    const anim = animate(el, { translateX: [0, dir * 140], opacity: [1, 0], duration: 420, ease: "in(2)" });
    anim.then(() => setView((v) => (v.leaving?.visit === leaving.visit ? { ...v, leaving: null } : v)));
    return () => {
      anim.cancel();
    };
  }, [view.leaving]);

  // Estado para el reloj y la ventana de notas.
  const channel = useRef<BroadcastChannel | null>(null);
  const live = useRef({ index: view.index, startedAt, slideAt, auto, subtitles });
  const message = useCallback(
    (): DeckState => ({ type: "state", ...live.current, now: Date.now(), film: { t: filmClock.t, playing: filmClock.playing } }),
    [filmClock],
  );
  useEffect(() => {
    live.current = { index: view.index, startedAt, slideAt, auto, subtitles };
    channel.current?.postMessage(message());
  }, [view.index, startedAt, slideAt, auto, subtitles, message]);

  // Reloj: tiempo total, por diapositiva, sketch y modo automático.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setFilm({ t: filmClock.t, playing: filmClock.playing });
      channel.current?.postMessage(message());
      const state = live.current;
      const current = deck.slides[state.index];
      if (!state.auto || state.index >= total - 1) return;
      const done =
        current.layout === "sketch" ? filmClock.t >= filmClock.end - 0.01 : t - state.slideAt >= current.seconds * 1000;
      if (done) {
        state.slideAt = t;
        step(1);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [deck.slides, total, step, filmClock, message]);

  useEffect(() => {
    if (!help) return;
    const id = window.setTimeout(() => setHelp(false), 6000);
    return () => window.clearTimeout(id);
  }, [help]);

  // Ventana de notas: se sincroniza y también controla. Mismo navegador: BroadcastChannel;
  // otro dispositivo (Tailscale): el relé /api/sync, consultado cada 250 ms.
  const handle = useRef<(msg: DeckMessage) => void>(() => undefined);
  useEffect(() => {
    handle.current = (msg: DeckMessage) => {
      if (msg.type === "next") advance(1);
      else if (msg.type === "prev") advance(-1);
      else if (msg.type === "go") go(msg.index);
      else if (msg.type === "timer") setStartedAt(Date.now());
      else if (msg.type === "auto") setAuto((a) => !a);
      else if (msg.type === "film-toggle") toggleFilm();
      else if (msg.type === "film-seek") filmClock.seek(msg.t);
      else if (msg.type === "subtitles") setSubtitles((s) => !s);
      else if (msg.type === "hello") channel.current?.postMessage(message());
    };
  }, [advance, go, toggleFilm, filmClock, message]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CHANNEL);
    channel.current = bc;
    bc.onmessage = (event: MessageEvent<DeckMessage>) => handle.current(event.data);
    return () => {
      bc.close();
      channel.current = null;
    };
  }, []);

  useEffect(() => {
    let since = -1; // la primera respuesta solo marca desde dónde leer: no repite comandos viejos
    let busy = false;
    const id = window.setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: message(), since: Math.max(0, since) }),
        });
        const data = (await res.json()) as { commands: { id: number; msg: DeckMessage }[]; last: number };
        if (since >= 0) for (const c of data.commands) handle.current(c.msg);
        since = data.last;
      } catch {
        // sin red: el pitch sigue funcionando solo
      } finally {
        busy = false;
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [message]);

  // Teclado.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const sketch = deck.slides[viewRef.current.index].layout === "sketch";
      const actions: Record<string, () => void> = {
        arrowright: () => advance(1),
        pagedown: () => advance(1),
        enter: () => advance(1),
        " ": () => (sketch ? toggleFilm() : advance(1)),
        arrowleft: () => advance(-1),
        pageup: () => advance(-1),
        backspace: () => advance(-1),
        home: () => go(0),
        end: () => go(total - 1),
        f: () => toggleFullscreen(),
        n: () => setNotes((v) => !v),
        h: () => setHud((v) => !v),
        a: () => setAuto((v) => !v),
        s: () => setSubtitles((v) => !v),
        t: () => setStartedAt(Date.now()),
        r: () => go(viewRef.current.index, true),
        p: () => window.open("/notas", "tilcai-notas", "popup,width=1100,height=820"),
        "?": () => setHelp((v) => !v),
      };
      const action = actions[key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, go, toggleFilm, total, deck.slides]);

  const elapsed = now - startedAt;
  const planned = deck.slides.reduce((sum, s) => sum + s.seconds, 0);
  const slideElapsed = isSketch ? (film.t - filmRange(slide).from) * 1000 : now - slideAt;
  const scene = sceneAt(film.t);

  return (
    <div className="pitch">
      <div className="pitch-frame" style={{ width: 1920 * scale, height: 1080 * scale }}>
        <div className="pitch-stage" style={{ transform: `scale(${scale})` }} onClick={() => advance(1)}>
          <div className="backdrop" />
          {ready && view.leaving && (
            <div ref={leavingRef} key={`s${view.leaving.index}-${view.leaving.visit}`} className="slide-holder is-leaving">
              <Slide slide={deck.slides[view.leaving.index]} deck={deck} index={view.leaving.index} total={total} />
            </div>
          )}
          {ready && (
            <div ref={currentRef} key={`s${view.index}-${view.visit}`} className={`slide-holder layout-${slide.layout}`}>
              <Slide slide={slide} deck={deck} index={view.index} total={total} />
            </div>
          )}
          <canvas ref={canvasRef} className={`world${isSketch ? " is-sketch" : ""}`} aria-hidden="true" />
          {ready && isSketch && <SketchOverlay clock={filmClock} subtitles={subtitles} />}
        </div>
      </div>

      {hud && (
        <div className="hud-zone">
        <div className="hud" aria-hidden="true">
          <div className="hud-bar">
            {deck.slides.map((s, i) => (
              <span key={s.id} style={{ flexGrow: s.seconds }} className={i < view.index ? "is-done" : i === view.index ? "is-now" : ""}>
                {i === view.index && <i style={{ width: `${Math.min(100, (slideElapsed / (s.seconds * 1000)) * 100)}%` }} />}
              </span>
            ))}
          </div>
          <p className="hud-text">
            {view.index + 1}/{total} · {slide.section}
            {isSketch && (
              <>
                {" "}
                · escena {scene.n} «{scene.title}» · {fmt(film.t * 1000)}/{fmt(filmRange(slide).to * 1000)}
                {!film.playing && " · pausa"}
              </>
            )}{" "}
            · <b className={elapsed > planned * 1000 ? "is-late" : ""}>{fmt(elapsed)}</b> / {fmt(planned * 1000)}
            {auto && " · automático"}
          </p>
        </div>
        </div>
      )}

      {notes && (
        <aside className="notes-panel">
          <p className="notes-meta">
            <b>{slide.section}</b> · {fmt(slideElapsed)} / {fmt(slide.seconds * 1000)}
            {view.index < total - 1 && <> · sigue: {plain(deck.slides[view.index + 1].title)}</>}
          </p>
          <p className="notes-script">{isSketch ? `${scene.title}: ${scene.action}` : plain(slide.script)}</p>
        </aside>
      )}

      {!mode.clean && (
        <div className={`help-zone${help ? " is-pinned" : ""}`}>
          <p className="help">
            → avanzar · ← volver · F pantalla completa · N notas · P ventana del guion · A automático · T reiniciar tiempo · En
            el sketch: espacio pausa, → ← escenas, S subtítulos · ? fijar esta ayuda
          </p>
        </div>
      )}
    </div>
  );
}

/** Tramo del sketch de una diapositiva (todo el sketch si no lo indica). */
function filmRange(slide: DeckData["slides"][number]) {
  return slide.film ?? { from: 0, to: SKETCH_SECONDS };
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => undefined);
}
