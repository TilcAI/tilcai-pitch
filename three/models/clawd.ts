import * as THREE from "three";
import { CLAWD, inked, mesh, roundedBox, toon } from "../toon";

/**
 * Clawd, la mascota de Claude Code, en 3D: un bloque naranja con dos ojos altos, dos brazos
 * cortos a los lados y cuatro patas. Mira hacia +Z; los pies tocan y = 0; mide 1 de ancho.
 *
 * Rig de piezas rígidas (sin skinning): cada articulación es un grupo con su pivote.
 * Todo el movimiento sale de `pose` y del tiempo, así que se puede adelantar o
 * retroceder (el sketch hace seek) sin acumular estado.
 */
export interface ClawdPose {
  /** Paso de caminata: 0 quieto, 1 caminando. */
  walk: number;
  /** Velocidad del ciclo de pasos (pasos por segundo). */
  stride: number;
  /** Respiración (amplitud). */
  breathe: number;
  /** Aplastado (+) o estirado (−), para rebotes. */
  squash: number;
  /** Salto en unidades. */
  hop: number;
  /** Inclinación hacia adelante (rad). */
  lean: number;
  /** Ladeo lateral (rad). */
  tilt: number;
  /** Brazos: ángulo hacia adelante (rad, 0 = abajo, 1.5 = al frente). */
  armL: number;
  armR: number;
  /** Brazos: saludo/agitar (0–1). */
  waveR: number;
  /** Guiño del ojo derecho (0–1) y parpadeo de ambos (0–1). */
  wink: number;
  blink: number;
  /** Mirada: desplazamiento de los ojos (−1..1). */
  lookX: number;
  lookY: number;
  /** Ojos felices (arco) 0–1. */
  happy: number;
}

export const clawdRest = (): ClawdPose => ({
  walk: 0,
  stride: 2.2,
  breathe: 1,
  squash: 0,
  hop: 0,
  lean: 0,
  tilt: 0,
  armL: 0,
  armR: 0,
  waveR: 0,
  wink: 0,
  blink: 0,
  lookX: 0,
  lookY: 0,
  happy: 0,
});

const BODY_W = 1;
const BODY_H = 0.66;
const BODY_D = 0.56;
const LEG_H = 0.2;

export class Clawd {
  readonly group = new THREE.Group();
  readonly pose: ClawdPose = clawdRest();
  private readonly hips = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly eyes = new THREE.Group();
  private readonly eyeL: THREE.Group;
  private readonly eyeR: THREE.Group;
  private readonly smileL: THREE.Mesh;
  private readonly smileR: THREE.Mesh;
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly legs: THREE.Group[] = [];
  /** Punto entre los brazos donde va un objeto sostenido (coordenadas del grupo). */
  readonly hands = new THREE.Object3D();
  /** Fase propia para que dos Clawds no respiren igual. */
  phase = 0;

  constructor({ ink = 0.018, inkColor = 0x1a0f0a }: { ink?: number; inkColor?: number } = {}) {
    this.group.name = "clawd";
    const skin = toon(CLAWD);
    const dark = new THREE.MeshBasicMaterial({ color: 0x1b120e });

    this.hips.position.y = LEG_H;
    this.group.add(this.hips);
    this.hips.add(this.body);

    const torso = mesh(roundedBox(BODY_W, BODY_H, BODY_D, 0.05), skin, "torso");
    torso.position.y = BODY_H / 2;
    if (ink) inked(torso, ink, inkColor);
    this.body.add(torso);

    // Ojos: rectángulos altos en la cara; el pivote en su centro para parpadear.
    const eyeGeo = roundedBox(0.1, 0.2, 0.04, 0.015);
    const makeEye = (x: number) => {
      const g = new THREE.Group();
      g.position.set(x, BODY_H * 0.58, BODY_D / 2 + 0.006);
      g.add(new THREE.Mesh(eyeGeo, dark));
      this.eyes.add(g);
      return g;
    };
    this.eyeL = makeEye(-0.2);
    this.eyeR = makeEye(0.2);
    // Ojos felices: un arco (media dona) que reemplaza al ojo.
    const arc = new THREE.TorusGeometry(0.055, 0.018, 6, 14, Math.PI);
    this.smileL = new THREE.Mesh(arc, dark);
    this.smileR = new THREE.Mesh(arc, dark);
    for (const [s, x] of [
      [this.smileL, -0.2],
      [this.smileR, 0.2],
    ] as const) {
      s.position.set(x, BODY_H * 0.56, BODY_D / 2 + 0.02);
      s.visible = false;
      this.eyes.add(s);
    }
    this.body.add(this.eyes);

    // Brazos: bloques cortos en los costados, pivote en el hombro.
    const armGeo = roundedBox(0.16, 0.2, 0.26, 0.035);
    for (const [arm, side] of [
      [this.armL, -1],
      [this.armR, 1],
    ] as const) {
      arm.position.set(side * (BODY_W / 2 + 0.02), BODY_H * 0.48, 0);
      const m = mesh(armGeo, skin, "arm");
      m.position.set(side * 0.07, -0.06, 0);
      if (ink) inked(m, ink, inkColor);
      arm.add(m);
      this.body.add(arm);
    }

    // Cuatro patas: dos a cada lado, adelante y atrás.
    const legGeo = roundedBox(0.13, LEG_H + 0.04, 0.15, 0.03);
    for (const [x, z] of [
      [-0.34, 0.12],
      [-0.2, -0.12],
      [0.2, -0.12],
      [0.34, 0.12],
    ]) {
      const leg = new THREE.Group();
      leg.position.set(x, LEG_H, z);
      const m = mesh(legGeo, skin, "leg");
      m.position.y = -LEG_H / 2 + 0.01;
      if (ink) inked(m, ink, inkColor);
      leg.add(m);
      this.group.add(leg);
      this.legs.push(leg);
    }

    this.hands.position.set(0, LEG_H + BODY_H * 0.35, BODY_D / 2 + 0.22);
    this.body.add(this.hands);
  }

  /** Alto total (sin salto), para escalar en pantalla. */
  get height() {
    return LEG_H + BODY_H;
  }

  /** Aplica la pose en el instante `time` (segundos). */
  update(time: number) {
    const p = this.pose;
    const t = time + this.phase;
    const step = Math.sin(t * Math.PI * p.stride);
    const walk = p.walk;

    // Patas alternadas en diagonal.
    this.legs.forEach((leg, i) => {
      const s = i === 0 || i === 2 ? step : -step;
      leg.rotation.x = s * 0.55 * walk;
    });

    const breath = Math.sin(t * 2.1) * 0.012 * p.breathe;
    const bounce = Math.abs(step) * 0.045 * walk;
    this.hips.position.y = LEG_H + bounce + p.hop;
    const sq = p.squash + breath;
    this.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    this.body.rotation.set(p.lean, 0, p.tilt + step * 0.05 * walk);

    // Brazos: balanceo al caminar + pose. La rotación −x lleva el brazo hacia adelante.
    const swing = step * 0.35 * walk;
    this.armL.rotation.set(-p.armL + swing, 0, 0);
    const wave = p.waveR ? Math.sin(t * 14) * 0.5 * p.waveR : 0;
    this.armR.rotation.set(-p.armR - swing, 0, wave - p.waveR * 1.2);

    // Ojos: parpadeo automático cada ~3,4 s, más guiño y mirada.
    const auto = blinkCurve((t % 3.4) / 3.4);
    const open = 1 - Math.max(p.blink, auto);
    const happy = p.happy > 0.5;
    this.eyeL.scale.y = Math.max(0.08, open);
    this.eyeR.scale.y = Math.max(0.08, open * (1 - p.wink));
    this.eyeL.visible = !happy;
    this.eyeR.visible = !happy;
    this.smileL.visible = happy;
    this.smileR.visible = happy;
    this.eyes.position.set(p.lookX * 0.06, p.lookY * 0.04, 0);
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
    });
  }
}

/** Parpadeo rápido al final de cada ciclo. */
function blinkCurve(x: number): number {
  const d = Math.abs(x - 0.96) / 0.03;
  return d < 1 ? 1 - d : 0;
}
