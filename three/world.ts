import * as THREE from "three";
import { SKETCH_SECONDS } from "@/content/sketch";
import type { StageCue } from "@/content/types";
import { SketchAct, type Anchor } from "./acts/sketch";
import { StageAct } from "./acts/stage";

/**
 * Reloj del sketch. Lo avanza el mundo mientras se ve el sketch; el Deck lo pausa, lo
 * mueve de escena y lo comparte con la ventana de notas.
 */
export class FilmClock {
  t = 0;
  playing = false;
  /** Se llama en cada cuadro con el segundo actual (para la capa HTML del sketch). */
  readonly listeners = new Set<(t: number, anchors: Record<string, Anchor>) => void>();
  play() {
    if (this.t >= SKETCH_SECONDS) this.t = 0;
    this.playing = true;
  }
  pause() {
    this.playing = false;
  }
  seek(t: number) {
    this.t = Math.max(0, Math.min(SKETCH_SECONDS, t));
  }
}

/**
 * Un solo WebGLRenderer para todo el pitch, sobre las diapositivas. Dibuja el escenario de
 * las diapositivas (gato, Clawd, teléfonos) o el sketch, según la diapositiva actual.
 */
export class World {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly stage: StageAct;
  private readonly sketch: SketchAct;
  private mode: "stage" | "sketch" = "stage";
  private frame = 0;
  private last = performance.now();
  private readonly started = performance.now();
  private hidden = false;

  constructor(
    canvas: HTMLCanvasElement,
    videos: { claude: string; vaquita: string },
    readonly clock: FilmClock,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(1920, 1080, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.stage = new StageAct(videos);
    this.sketch = new SketchAct();
    document.addEventListener("visibilitychange", this.onVisibility);
    this.frame = requestAnimationFrame(this.tick);
  }

  get sketchReady() {
    return this.sketch.ready;
  }

  setPixelRatio(ratio: number) {
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(1920, 1080, false);
  }

  setCue(cue: StageCue | undefined, still = false) {
    this.mode = cue?.act === "sketch" ? "sketch" : "stage";
    if (this.mode === "stage") this.stage.setCue(cue, still);
    else this.stage.setCue(undefined, true);
  }

  /** Dibuja un cuadro ahora mismo (modo PDF / capturas). */
  renderNow() {
    this.draw(performance.now());
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.stage.dispose();
    this.sketch.dispose();
    this.renderer.dispose();
  }

  private onVisibility = () => {
    this.hidden = document.hidden;
    this.last = performance.now();
  };

  private tick = (now: number) => {
    this.frame = requestAnimationFrame(this.tick);
    if (this.hidden) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.mode === "sketch" && this.clock.playing) {
      this.clock.t = Math.min(SKETCH_SECONDS, this.clock.t + dt);
      if (this.clock.t >= SKETCH_SECONDS) this.clock.playing = false;
    }
    this.draw(now);
  };

  private draw(now: number) {
    const time = (now - this.started) / 1000;
    if (this.mode === "sketch") {
      this.sketch.seek(this.clock.t);
      this.sketch.render(this.renderer);
      const anchors = this.sketch.anchors();
      for (const fn of this.clock.listeners) fn(this.clock.t, anchors);
    } else {
      this.stage.update(time);
      this.stage.render(this.renderer);
    }
  }
}
