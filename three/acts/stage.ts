import { animate } from "animejs";
import * as THREE from "three";
import type { HostPose, StageCue } from "@/content/types";
import { TilcaiCat } from "../models/cat";
import { Clawd } from "../models/clawd";
import { buildPhone, makeVideo, videoTexture, type Phone } from "../models/phone";
import { BRAND } from "../toon";

/**
 * Escenario de las diapositivas: el gato de TilcAI, Clawd y los dos teléfonos de la demo.
 * Las posiciones se dan en píxeles del lienzo de 1920 × 1080 (100 px = 1 unidad), igual
 * que en el pitch de Optipagos; anime.js las mueve al cambiar de diapositiva.
 */
const W = 19.2;
const H = 10.8;
const FOV = 30;
const DISTANCE = H / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);

interface Place {
  /** Personajes: centro de los pies; teléfonos: centro. En px. */
  x: number;
  y: number;
  /** Alto en px. */
  h: number;
  ry: number;
  rz: number;
}

type ActorName = "cat" | "clawd" | "claudePhone" | "vaquitaPhone";

/** Gestos por pose: se mezclan con anime.js. */
interface Mood {
  catWave: number;
  catTilt: number;
  clawdWave: number;
  clawdHappy: number;
  clawdTilt: number;
}

const OFF: Record<ActorName, Place> = {
  cat: { x: 2600, y: 900, h: 420, ry: -0.5, rz: 0 },
  clawd: { x: 2500, y: 950, h: 220, ry: -0.6, rz: 0 },
  claudePhone: { x: 1300, y: 1750, h: 760, ry: 0.2, rz: -0.4 },
  vaquitaPhone: { x: 1650, y: 1750, h: 760, ry: -0.2, rz: 0.4 },
};

const HOST: Record<HostPose, { places: Partial<Record<ActorName, Place>>; mood?: Partial<Mood> }> = {
  cover: {
    places: {
      cat: { x: 1390, y: 860, h: 560, ry: -0.42, rz: 0 },
      clawd: { x: 1730, y: 960, h: 190, ry: -0.45, rz: 0 },
    },
    mood: { catTilt: 0.06 },
  },
  problem: { places: { clawd: { x: 1760, y: 1000, h: 170, ry: -0.5, rz: 0 } }, mood: { clawdTilt: 0.18 } },
  solution: {
    places: {
      cat: { x: 1700, y: 330, h: 210, ry: -0.5, rz: 0 },
      clawd: { x: 1830, y: 330, h: 95, ry: -0.8, rz: 0 },
    },
  },
  flow: { places: { cat: { x: 1760, y: 1010, h: 190, ry: -0.6, rz: 0 } } },
  evidence: { places: { cat: { x: 1770, y: 300, h: 190, ry: -0.6, rz: 0 } }, mood: { catTilt: 0.1 } },
  roadmap: { places: { clawd: { x: 220, y: 1000, h: 140, ry: 0.7, rz: 0 } } },
  team: { places: { cat: { x: 1760, y: 1010, h: 190, ry: -0.6, rz: 0 } } },
  closing: {
    places: {
      cat: { x: 1380, y: 880, h: 540, ry: -0.35, rz: 0 },
      clawd: { x: 1730, y: 965, h: 210, ry: -0.45, rz: 0 },
    },
    mood: { catWave: 1, clawdWave: 1, clawdHappy: 1 },
  },
};

const PHONES: Record<"hero" | "side", Partial<Record<ActorName, Place>>> = {
  hero: {
    claudePhone: { x: 1180, y: 560, h: 800, ry: 0.22, rz: -0.035 },
    vaquitaPhone: { x: 1600, y: 575, h: 800, ry: -0.22, rz: 0.04 },
    cat: { x: 1855, y: 1050, h: 120, ry: -0.7, rz: 0 },
  },
  side: {
    claudePhone: { x: 1380, y: 600, h: 640, ry: 0.16, rz: -0.03 },
    vaquitaPhone: { x: 1700, y: 612, h: 640, ry: -0.18, rz: 0.04 },
  },
};

const REST_MOOD: Mood = { catWave: 0, catTilt: 0, clawdWave: 0, clawdHappy: 0, clawdTilt: 0 };

export class StageAct {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 100);
  private readonly cat = new TilcaiCat();
  private readonly clawd = new Clawd({ ink: 0 });
  private readonly phones: Record<"claudePhone" | "vaquitaPhone", Phone>;
  private readonly videos: HTMLVideoElement[];
  private readonly textures: THREE.VideoTexture[];
  private readonly places: Record<ActorName, Place>;
  private readonly mood: Mood = { ...REST_MOOD };
  private readonly heights: Record<ActorName, number>;
  private cue: StageCue | undefined;

  constructor(videos: { claude: string; vaquita: string }) {
    this.camera.position.set(0, 0, DISTANCE);
    this.scene.add(new THREE.HemisphereLight(0xf3eff9, 0x3b2a7a, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.3);
    key.position.set(-5, 6, 10);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(BRAND.lila, 2.2);
    rim.position.set(6, 3, -6);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(BRAND.cian, 0.6);
    fill.position.set(6, -3, 4);
    this.scene.add(fill);

    this.videos = [makeVideo(videos.claude), makeVideo(videos.vaquita)];
    this.textures = this.videos.map(videoTexture);
    const claude = buildPhone({
      screenAspect: 540 / 1170,
      screenHeight: 1.9,
      bezel: 0.045,
      radius: 0.17,
      screenRadius: 0.13,
      depth: 0.11,
      color: 0x231a45,
      edge: BRAND.lila,
      island: true,
    });
    const vaquita = buildPhone({
      screenAspect: 540 / 1170,
      screenHeight: 1.9,
      bezel: 0.04,
      radius: 0.11,
      screenRadius: 0.08,
      depth: 0.1,
      color: 0x1b3f4a,
      edge: BRAND.cian,
      island: false,
    });
    claude.screen.map = this.textures[0];
    vaquita.screen.map = this.textures[1];
    this.phones = { claudePhone: claude, vaquitaPhone: vaquita };

    this.scene.add(this.cat.group, this.clawd.group, claude.group, vaquita.group);
    this.places = structuredClone(OFF);
    this.heights = { cat: this.cat.height, clawd: this.clawd.height, claudePhone: claude.height, vaquitaPhone: vaquita.height };
    this.clawd.phase = 1.3;
  }

  /** Cambia de pose: los que no están en la nueva salen por un costado o por abajo. */
  setCue(cue: StageCue | undefined, still = false) {
    const previous = this.cue;
    this.cue = cue;
    const targets: Partial<Record<ActorName, Place>> =
      cue?.act === "host" ? HOST[cue.pose].places : cue?.act === "phones" ? PHONES[cue.pose] : {};
    const mood = { ...REST_MOOD, ...(cue?.act === "host" ? HOST[cue.pose].mood : {}) };
    for (const name of Object.keys(this.places) as ActorName[]) {
      const to = targets[name] ?? OFF[name];
      if (still) Object.assign(this.places[name], to);
      else animate(this.places[name], { ...to, duration: targets[name] ? 1000 : 600, ease: targets[name] ? "outBack(1.1)" : "in(2)" });
    }
    if (still) Object.assign(this.mood, mood);
    else animate(this.mood, { ...mood, duration: 700, ease: "inOut(2)" });

    const phonesOn = cue?.act === "phones";
    const wasOn = previous?.act === "phones";
    if (phonesOn && !wasOn) {
      for (const v of this.videos) {
        v.currentTime = 0;
        void v.play().catch(() => undefined);
      }
    } else if (!phonesOn) {
      for (const v of this.videos) v.pause();
    }
  }

  update(time: number) {
    this.cat.pose.wave = this.mood.catWave;
    this.cat.pose.headTilt = this.mood.catTilt;
    this.clawd.pose.waveR = this.mood.clawdWave;
    this.clawd.pose.happy = this.mood.clawdHappy;
    this.clawd.pose.tilt = this.mood.clawdTilt;
    this.cat.update(time);
    this.clawd.update(time);

    const objects: Record<ActorName, THREE.Object3D> = {
      cat: this.cat.group,
      clawd: this.clawd.group,
      claudePhone: this.phones.claudePhone.group,
      vaquitaPhone: this.phones.vaquitaPhone.group,
    };
    (Object.keys(objects) as ActorName[]).forEach((name, i) => {
      const { x, y, h, ry, rz } = this.places[name];
      const obj = objects[name];
      const visible = x > -400 && x < 2450 && y < 1500;
      obj.visible = visible;
      if (!visible) return;
      const scale = h / 100 / this.heights[name];
      const isPhone = name.endsWith("Phone");
      const bob = isPhone ? Math.sin(time * 1.1 + i * 1.7) * 0.06 : 0;
      // Teléfonos: centro; personajes: pies.
      obj.position.set(x / 100 - W / 2, H / 2 - y / 100 + bob, 0);
      obj.rotation.set(isPhone ? Math.sin(time * 0.7 + i) * 0.03 : 0, ry + (isPhone ? Math.sin(time * 0.5 + i) * 0.04 : 0), rz);
      obj.scale.setScalar(scale);
    });
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const v of this.videos) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
    for (const t of this.textures) t.dispose();
  }
}
