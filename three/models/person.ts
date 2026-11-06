import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { toonRamp } from "../toon";

/**
 * Personaje Kenney «mini characters» (CC0) con:
 *  - clips del propio modelo evaluados en un instante dado (seek: sin estado acumulado);
 *  - giros extra por hueso encima del clip (brindar, cruzar brazos, abrazar…);
 *  - una cara dibujada en un plano pegado a la cabeza (ojos grandes, sudor, ceja…).
 *
 * El modelo mide 0,67 de alto, mira hacia +Z y tiene 7 huesos:
 * root, leg-left, leg-right, torso, arm-left, arm-right, head.
 */

export type Face = "none" | "happy" | "love" | "shock" | "nervous" | "suspicious" | "angry" | "confused" | "proud" | "closed";

export type BoneName = "torso" | "head" | "arm-left" | "arm-right" | "leg-left" | "leg-right";

/** Segmento de clip: desde `at` (s) suena `clip`, con mezcla de `fade` s con el anterior. */
export interface ClipCue {
  at: number;
  clip: string;
  fade?: number;
  /** Velocidad (1 = normal). */
  speed?: number;
}

export interface PersonPose {
  x: number;
  y: number;
  z: number;
  ry: number;
  /** Giros extra por hueso (rad, ejes locales del hueso). */
  bones: Record<BoneName, { x: number; y: number; z: number }>;
  /** Temblor (0–1). */
  shake: number;
  /** Escala del pecho (orgullo) y encogerse (miedo): + infla, − encoge. */
  puff: number;
}

const BONES: BoneName[] = ["torso", "head", "arm-left", "arm-right", "leg-left", "leg-right"];

export const personRest = (): PersonPose => ({
  x: 0,
  y: 0,
  z: 0,
  ry: 0,
  bones: Object.fromEntries(BONES.map((b) => [b, { x: 0, y: 0, z: 0 }])) as PersonPose["bones"],
  shake: 0,
  puff: 0,
});

export class Person {
  readonly group = new THREE.Group();
  readonly pose: PersonPose = personRest();
  readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly bones = new Map<string, THREE.Object3D>();
  /** Última pose del mixer, antes de los gestos adicionales de la coreografía. */
  private readonly clipPose = new Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }>();
  private readonly faceMat: THREE.MeshToonMaterial;
  private readonly faces = new Map<Face, THREE.CanvasTexture>();
  /** Mano derecha e izquierda: puntos donde se cuelga un objeto. */
  readonly handR = new THREE.Object3D();
  readonly handL = new THREE.Object3D();
  readonly headTop = new THREE.Object3D();
  clips: ClipCue[] = [{ at: 0, clip: "idle" }];
  /** Corrección de colisiones en el piso (no toca la pose de la línea de tiempo). */
  readonly push = { x: 0, z: 0 };
  face: Face = "none";

  private constructor(
    readonly name: string,
    root: THREE.Object3D,
    animations: THREE.AnimationClip[],
    skin: string,
  ) {
    this.group.name = name;
    this.group.add(root);
    root.traverse((obj) => {
      if ((obj as THREE.Bone).isBone || ["root", ...BONES].includes(obj.name)) {
        this.bones.set(obj.name, obj);
        this.clipPose.set(obj, { p: obj.position.clone(), q: obj.quaternion.clone(), s: obj.scale.clone() });
      }
      const m = obj as THREE.SkinnedMesh;
      if (m.isMesh) {
        const old = m.material as THREE.MeshStandardMaterial;
        m.material = new THREE.MeshToonMaterial({ map: old.map, gradientMap: toonRamp(), side: THREE.FrontSide });
        old.dispose();
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
      }
    });
    this.mixer = new THREE.AnimationMixer(root);
    for (const clip of animations) {
      const action = this.mixer.clipAction(clip);
      action.play();
      action.setEffectiveWeight(0);
      this.actions.set(clip.name, action);
    }

    // Cara: plano delante de la cabeza (coordenadas locales del hueso «head»).
    const head = this.bones.get("head")!;
    // Con luz, como la cabeza: así el parche de piel no se nota.
    // Desplazamiento de profundidad: el plano siempre gana frente a la cabeza y no titila
    // (z-fighting) cuando se mueve la cámara.
    this.faceMat = new THREE.MeshToonMaterial({
      transparent: true,
      depthWrite: false,
      gradientMap: toonRamp(),
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -8,
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), this.faceMat);
    // La cara del modelo está en z ≈ 0,160 (y algunos relieves en 0,168): el plano va 1,6 cm
    // por delante para no compartir profundidad con ellos.
    face.position.set(0, 0.125, 0.176);
    face.renderOrder = 2;
    face.layers.set(1);
    face.name = "face";
    head.add(face);
    for (const f of FACE_NAMES) this.faces.set(f, drawFace(f, skin));

    const armR = this.bones.get("arm-right")!;
    const armL = this.bones.get("arm-left")!;
    this.handR.position.set(-0.27, -0.01, 0.02);
    this.handL.position.set(0.27, -0.01, 0.02);
    armR.add(this.handR);
    armL.add(this.handL);
    this.headTop.position.set(0, 0.36, 0);
    head.add(this.headTop);
  }

  static async load(name: string, url: string, skin: string): Promise<Person> {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new Person(name, gltf.scene, gltf.animations, skin);
  }

  /** Coloca el personaje en el instante `t` (segundos del sketch). */
  update(t: number) {
    // 1) Quitar solo los gestos del cuadro anterior. El mixer omite escribir propiedades
    // que no cambiaron: volver al reposo aquí borraría partes constantes del clip (por
    // ejemplo, las piernas sentadas), causando saltos entre reposo y animación.
    for (const [obj, r] of this.clipPose) {
      obj.position.copy(r.p);
      obj.quaternion.copy(r.q);
      obj.scale.copy(r.s);
    }

    // 2) Clip actual (y el anterior, mientras se mezclan).
    for (const action of this.actions.values()) action.setEffectiveWeight(0);
    const i = this.clips.findLastIndex((c) => t >= c.at);
    const cur = this.clips[Math.max(0, i)];
    const prev = i > 0 ? this.clips[i - 1] : undefined;
    const fade = cur.fade ?? 0.25;
    const w = prev && fade > 0 ? Math.min(1, (t - cur.at) / fade) : 1;
    this.applyClip(cur, t, w);
    if (prev && w < 1) this.applyClip(prev, t, 1 - w);
    this.mixer.update(0);

    // Guardar la pose base antes de sumar gestos: ni se pierden canales constantes del
    // clip ni se acumulan giros/escala al pausar, repetir o retroceder en el sketch.
    for (const [obj, r] of this.clipPose) {
      r.p.copy(obj.position);
      r.q.copy(obj.quaternion);
      r.s.copy(obj.scale);
    }

    // 3) Giros extra por hueso.
    const e = new THREE.Euler();
    const q = new THREE.Quaternion();
    for (const name of BONES) {
      const b = this.pose.bones[name];
      if (!b.x && !b.y && !b.z) continue;
      const bone = this.bones.get(name);
      if (!bone) continue;
      q.setFromEuler(e.set(b.x, b.y, b.z));
      bone.quaternion.multiply(q);
    }
    const torso = this.bones.get("torso");
    if (torso && this.pose.puff) torso.scale.multiplyScalar(1 + this.pose.puff * 0.12);

    // 4) Lugar en la escena y temblor.
    const shake = this.pose.shake ? Math.sin(t * 61) * 0.012 * this.pose.shake : 0;
    this.group.position.set(this.pose.x + this.push.x + shake, this.pose.y, this.pose.z + this.push.z);
    this.group.rotation.y = this.pose.ry;

    // 5) Cara.
    const tex = this.face === "none" ? null : (this.faces.get(this.face) ?? null);
    if (this.faceMat.map !== tex) {
      this.faceMat.map = tex;
      this.faceMat.visible = !!tex;
      this.faceMat.needsUpdate = true;
    }
  }

  private applyClip(cue: ClipCue, t: number, weight: number) {
    const action = this.actions.get(cue.clip);
    if (!action) return;
    const d = action.getClip().duration;
    const local = (t - cue.at) * (cue.speed ?? 1);
    action.time = d > 0 ? ((local % d) + d) % d : 0;
    action.setEffectiveWeight(weight);
  }

  dispose() {
    this.mixer.stopAllAction();
    for (const tex of this.faces.values()) tex.dispose();
    this.faceMat.dispose();
  }
}

const FACE_NAMES: Face[] = ["happy", "love", "shock", "nervous", "suspicious", "angry", "confused", "proud", "closed"];

/**
 * Dibuja una expresión en un lienzo de 512 × 256 (0,36 × 0,18 en la cabeza). Primero un
 * parche de piel tapa los ojos del modelo; luego van ojos, cejas y extras.
 */
function drawFace(face: Face, skin: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  const ink = "#16110f";
  g.lineCap = "round";
  g.lineJoin = "round";

  // Parche de piel sobre los ojos originales (salvo «sudor», que conserva la cara).
  g.fillStyle = skin;
  roundRect(g, 96, 84, 320, 132, 34);
  g.fill();

  const eyeL = 186;
  const eyeR = 326;
  const eyeY = 150;
  const brow = (x: number, y: number, angle: number, w = 56) => {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.strokeStyle = ink;
    g.lineWidth = 13;
    g.beginPath();
    g.moveTo(-w / 2, 0);
    g.lineTo(w / 2, 0);
    g.stroke();
    g.restore();
  };
  const dotEye = (x: number, y: number, r = 15) => {
    g.fillStyle = ink;
    g.beginPath();
    g.ellipse(x, y, r * 0.8, r * 1.15, 0, 0, Math.PI * 2);
    g.fill();
  };
  const bigEye = (x: number, y: number, px: number, py: number) => {
    g.fillStyle = "#fffdf8";
    g.strokeStyle = ink;
    g.lineWidth = 9;
    g.beginPath();
    g.ellipse(x, y, 40, 50, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = ink;
    g.beginPath();
    g.arc(x + px, y + py, 10, 0, Math.PI * 2);
    g.fill();
  };
  const arcEye = (x: number, y: number, up = true) => {
    g.strokeStyle = ink;
    g.lineWidth = 12;
    g.beginPath();
    if (up) g.arc(x, y + 12, 26, Math.PI * 1.1, Math.PI * 1.9);
    else g.arc(x, y - 14, 26, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();
  };
  const heart = (x: number, y: number, s: number) => {
    g.fillStyle = "#e0245e";
    g.beginPath();
    g.moveTo(x, y + s * 0.9);
    g.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
    g.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.9);
    g.fill();
  };
  const halfLid = (x: number, y: number) => {
    dotEye(x, y + 6, 15);
    g.fillStyle = skin;
    g.fillRect(x - 30, y - 34, 60, 34);
    g.strokeStyle = ink;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(x - 26, y);
    g.lineTo(x + 26, y);
    g.stroke();
  };

  switch (face) {
    case "happy":
      arcEye(eyeL, eyeY);
      arcEye(eyeR, eyeY);
      g.fillStyle = "rgba(240,110,110,0.45)";
      g.beginPath();
      g.ellipse(eyeL - 40, eyeY + 50, 26, 13, 0, 0, Math.PI * 2);
      g.ellipse(eyeR + 40, eyeY + 50, 26, 13, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case "love":
      heart(eyeL, eyeY, 30);
      heart(eyeR, eyeY, 30);
      break;
    case "shock":
      bigEye(eyeL, eyeY - 4, 0, 0);
      bigEye(eyeR, eyeY - 4, 0, 0);
      brow(eyeL, 72, -0.12);
      brow(eyeR, 72, 0.12);
      break;
    case "nervous":
      dotEye(eyeL + 14, eyeY);
      dotEye(eyeR + 14, eyeY);
      brow(eyeL, 104, 0.32, 50);
      brow(eyeR, 104, -0.32, 50);
      break;
    case "suspicious":
      halfLid(eyeL, eyeY);
      halfLid(eyeR, eyeY);
      brow(eyeL, 108, 0.1, 50);
      brow(eyeR, 92, -0.35, 54);
      break;
    case "angry":
      halfLid(eyeL, eyeY);
      halfLid(eyeR, eyeY);
      brow(eyeL, 106, 0.4, 56);
      brow(eyeR, 106, -0.4, 56);
      break;
    case "confused":
      dotEye(eyeL, eyeY, 13);
      bigEye(eyeR, eyeY - 4, 8, -6);
      brow(eyeL, 108, 0.2, 46);
      brow(eyeR, 78, -0.15, 56);
      break;
    case "proud":
      arcEye(eyeL, eyeY);
      arcEye(eyeR, eyeY);
      brow(eyeL, 98, -0.18, 50);
      brow(eyeR, 98, 0.18, 50);
      break;
    case "closed":
      arcEye(eyeL, eyeY, false);
      arcEye(eyeR, eyeY, false);
      break;
    default:
      break;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
