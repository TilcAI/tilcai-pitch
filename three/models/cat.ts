import * as THREE from "three";
import { BRAND, inked, mesh, roundedBox, toon } from "../toon";

/**
 * El gato de TilcAI en 3D, sacado del isotipo (cabeza con orejas desiguales, ojos altos,
 * cuerpo recto, cola en S y el punto de la «i» flotando). Las medidas vienen del PNG de
 * 450 px de la guía de marca; 450 px = 1 unidad de alto. Mira hacia +Z; pies en y = 0.
 *
 * Piezas: cabeza (con pivote en el cuello), ojos (parpadean), cuerpo, cola (pivote en la
 * base) y punto. Igual que Clawd, todo sale de `pose` y del tiempo.
 */
export interface CatPose {
  breathe: number;
  /** Cabeza: ladeo (z) y giro (y), rad. */
  headTilt: number;
  headTurn: number;
  /** Cola: amplitud del meneo. */
  wag: number;
  /** Punto de la «i»: altura extra y giro. */
  dotLift: number;
  dotSpin: number;
  hop: number;
  squash: number;
  lean: number;
  blink: number;
  lookX: number;
  /** Saludo con la cola (agita rápido). */
  wave: number;
}

export const catRest = (): CatPose => ({
  breathe: 1,
  headTilt: 0,
  headTurn: 0,
  wag: 1,
  dotLift: 0,
  dotSpin: 0,
  hop: 0,
  squash: 0,
  lean: 0,
  blink: 0,
  lookX: 0,
  wave: 0,
});

const PX = 1 / 450;
const DEPTH = 0.2;
const ORIGIN_X = 225;
const ORIGIN_Y = 447;

/** Coordenadas del PNG (y hacia abajo) → unidades relativas a un pivote. */
const at = (x: number, y: number, pivot: [number, number] = [ORIGIN_X, ORIGIN_Y]) =>
  new THREE.Vector2((x - pivot[0]) * PX, (pivot[1] - y) * PX);

const NECK: [number, number] = [150, 214];
const TAIL: [number, number] = [318, 424];
const DOT: [number, number] = [403, 175];

function extrude(shape: THREE.Shape, depth = DEPTH): THREE.BufferGeometry {
  const bevel = 0.018;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  return geo;
}

function headShape(): THREE.Shape {
  const p = (x: number, y: number) => at(x, y, NECK);
  const s = new THREE.Shape();
  const m = (x: number, y: number) => s.moveTo(p(x, y).x, p(x, y).y);
  const l = (x: number, y: number) => s.lineTo(p(x, y).x, p(x, y).y);
  const q = (cx: number, cy: number, x: number, y: number) => {
    const c = p(cx, cy);
    const e = p(x, y);
    s.quadraticCurveTo(c.x, c.y, e.x, e.y);
  };
  m(0, 66);
  l(44, 8);
  q(52, -2, 60, 8); // punta de la oreja izquierda
  l(86, 44);
  l(266, 44);
  l(342, 16);
  q(362, 9, 356, 28); // punta de la oreja derecha
  l(276, 200);
  q(268, 216, 250, 216);
  l(16, 216);
  q(0, 216, 0, 200);
  l(0, 66);
  return s;
}

function bodyShape(): THREE.Shape {
  const s = new THREE.Shape();
  const v = (x: number, y: number) => at(x, y);
  const m = (x: number, y: number) => s.moveTo(v(x, y).x, v(x, y).y);
  const l = (x: number, y: number) => s.lineTo(v(x, y).x, v(x, y).y);
  const c = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    const a = v(x1, y1);
    const b = v(x2, y2);
    const e = v(x, y);
    s.bezierCurveTo(a.x, a.y, b.x, b.y, e.x, e.y);
  };
  m(89, 205);
  l(206, 205);
  c(212, 300, 214, 370, 236, 388);
  c(250, 398, 280, 400, 340, 400);
  l(340, 447);
  l(104, 447);
  c(94, 447, 89, 442, 89, 432);
  l(89, 205);
  return s;
}

/** Cola: cinta que sigue la línea central de la S, más fina hacia la punta, con punta redonda. */
function tailShape(): THREE.Shape {
  const center: [number, number, number][] = [
    // x, y, ancho
    [300, 424, 46],
    [362, 424, 47],
    [402, 414, 54],
    [419, 384, 60],
    [413, 348, 62],
    [397, 314, 62],
    [390, 284, 62],
    [394, 258, 58],
    [400, 240, 46],
  ];
  const pts = center.map(([x, y]) => at(x, y, TAIL));
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  pts.forEach((pt, i) => {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dir = next.clone().sub(prev).normalize();
    const n = new THREE.Vector2(-dir.y, dir.x);
    const w = (center[i][2] / 2) * PX;
    left.push(pt.clone().addScaledVector(n, w));
    right.push(pt.clone().addScaledVector(n, -w));
  });
  const s = new THREE.Shape();
  s.moveTo(left[0].x, left[0].y);
  s.splineThru(left.slice(1));
  // Punta redonda: semicírculo alrededor del último punto.
  const tip = pts[pts.length - 1];
  const r = (center[center.length - 1][2] / 2) * PX;
  const a0 = Math.atan2(left[left.length - 1].y - tip.y, left[left.length - 1].x - tip.x);
  s.absarc(tip.x, tip.y, r, a0, a0 - Math.PI, true);
  s.splineThru(right.slice(0, -1).reverse());
  s.lineTo(left[0].x, left[0].y);
  return s;
}

export class TilcaiCat {
  readonly group = new THREE.Group();
  readonly pose: CatPose = catRest();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly eyes: THREE.Object3D[] = [];
  private readonly tail = new THREE.Group();
  private readonly dot = new THREE.Group();
  phase = 0;

  constructor({ color = BRAND.blanco, ink = 0, inkColor = BRAND.noche }: { color?: number; ink?: number; inkColor?: number } = {}) {
    this.group.name = "tilcai-cat";
    const fur = toon(color);
    const eyeMat = new THREE.MeshBasicMaterial({ color: BRAND.noche });
    this.group.add(this.body);

    const body = mesh(extrude(bodyShape()), fur, "cat-body");
    if (ink) inked(body, ink, inkColor);
    this.body.add(body);

    const neck = at(...NECK);
    this.head.position.set(neck.x, neck.y, 0);
    const head = mesh(extrude(headShape(), DEPTH + 0.02), fur, "cat-head");
    if (ink) inked(head, ink, inkColor);
    this.head.add(head);
    const eyeGeo = roundedBox(28 * PX, 58 * PX, 0.03, 0.02);
    for (const x of [77, 172]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      const e = at(x, 134, NECK);
      eye.position.set(e.x, e.y, (DEPTH + 0.02) / 2 + 0.004);
      this.head.add(eye);
      this.eyes.push(eye);
    }
    this.body.add(this.head);

    const tailBase = at(...TAIL);
    this.tail.position.set(tailBase.x, tailBase.y, 0);
    const tail = mesh(extrude(tailShape(), DEPTH - 0.02), fur, "cat-tail");
    if (ink) inked(tail, ink, inkColor);
    this.tail.add(tail);
    this.body.add(this.tail);

    const d = at(...DOT);
    this.dot.position.set(d.x, d.y, 0);
    const disc = mesh(new THREE.CylinderGeometry(39 * PX, 39 * PX, DEPTH - 0.02, 32), fur, "cat-dot");
    disc.rotation.x = Math.PI / 2;
    if (ink) inked(disc, ink, inkColor);
    this.dot.add(disc);
    this.body.add(this.dot);
  }

  get height() {
    return 1;
  }

  update(time: number) {
    const p = this.pose;
    const t = time + this.phase;
    const breath = Math.sin(t * 2) * 0.012 * p.breathe;
    const sq = p.squash + breath;
    this.body.scale.set(1 + sq * 0.4, 1 - sq, 1);
    this.body.position.y = p.hop;
    this.body.rotation.z = -p.lean;

    this.head.rotation.set(Math.sin(t * 0.9) * 0.02 * p.breathe, p.headTurn, p.headTilt + Math.sin(t * 1.3) * 0.025 * p.breathe);
    this.tail.rotation.z = Math.sin(t * 2.4) * 0.07 * p.wag + Math.sin(t * 13) * 0.16 * p.wave;
    this.dot.position.y = at(...DOT).y + Math.sin(t * 2.2 + 0.6) * 0.025 * p.breathe + p.dotLift;
    this.dot.rotation.y = p.dotSpin;

    const blink = Math.max(p.blink, blinkAt((t % 4.1) / 4.1));
    for (const eye of this.eyes) {
      eye.scale.y = Math.max(0.08, 1 - blink);
      eye.position.x = (eye === this.eyes[0] ? at(77, 0, NECK).x : at(172, 0, NECK).x) + p.lookX * 0.02;
    }
  }
}

function blinkAt(x: number) {
  const d = Math.abs(x - 0.95) / 0.025;
  return d < 1 ? 1 - d : 0;
}
