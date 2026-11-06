import { createTimeline, type Timeline } from "animejs";
import * as THREE from "three";
import { COLOR_AT, SKETCH_SECONDS } from "@/content/sketch";
import { FilmPass } from "../film";
import { Clawd } from "../models/clawd";
import { Person, type ClipCue, type Face } from "../models/person";
import { buildDiningSet, CHAIR_X, stickerSprite, type DiningSet } from "../models/set";

/**
 * «El aniversario olvidado» en 3D. Toda la coreografía está en una línea de tiempo de
 * anime.js en pausa: cada cuadro se hace `seek` al segundo de la película. Así el sketch se
 * puede pausar, saltar de escena o retroceder y siempre se ve igual en el mismo segundo.
 *
 * Los clips de los personajes Kenney y sus caras van en listas por segundo (más abajo) y
 * también se evalúan en el instante pedido.
 */

/** Cámara: posición, punto al que mira, apertura y sacudida. */
interface CamRig {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
  shake: number;
  roll: number;
}

/** Interruptores y mezclas que no son de un personaje. */
interface Fx {
  night: number;
  /** Regalo: 0 en manos de Claude, 1 en manos de ella; mesa: 0–1 lo deja en la mesa. */
  giftToWife: number;
  giftOnTable: number;
  giftShown: number;
  /** Copas en la mano (0 = en la mesa). */
  hGlass: number;
  wGlass: number;
  phoneShown: number;
  hearts: number;
  heartsBurst: number;
  /** Centro de los corazones en la escena. */
  heartX: number;
  heartY: number;
  heartZ: number;
  sweat: number;
  question: number;
  sparkle: number;
  exclaim: number;
  door: number;
  glow: number;
  /** Clawd visible. */
  clawd: number;
  /** Ella presente (en el recuerdo no está). */
  wife: number;
}

export interface Anchor {
  x: number;
  y: number;
}

const CAM_WIDE: Partial<CamRig> = { px: 0, py: 0.78, pz: 2.9, tx: 0, ty: 0.42, tz: -0.2, fov: 30 };

export class SketchAct {
  readonly scene = new THREE.Scene();
  // Planos cercano y lejano ajustados a la sala: más precisión de profundidad y sin
  // titileo entre superficies cercanas (la cámara nunca está a menos de ~1 unidad).
  readonly camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.3, 12);
  readonly film = new FilmPass();
  readonly ready: Promise<void>;
  private set!: DiningSet;
  private husband!: Person;
  private wife!: Person;
  private readonly clawd = new Clawd({ ink: 0 });
  private readonly cam: CamRig = { ...(CAM_WIDE as CamRig), shake: 0, roll: 0 };
  private readonly fx: Fx = {
    night: 1,
    giftToWife: 0,
    giftOnTable: 0,
    giftShown: 0,
    hGlass: 0,
    wGlass: 0,
    phoneShown: 0,
    hearts: 0,
    heartsBurst: 0,
    heartX: 0,
    heartY: 0.55,
    heartZ: 0.15,
    sweat: 0,
    question: 0,
    sparkle: 0,
    exclaim: 0,
    door: 0,
    glow: 0,
    clawd: 0,
    wife: 1,
  };
  private readonly clawdAt = { x: 1.15, z: -1.2, ry: 0, scale: 0.55 };
  private readonly clawdPush = { x: 0, z: 0 };
  private readonly hearts: THREE.Sprite[] = [];
  private readonly sweat = stickerSprite("sweat", 0.09);
  private readonly question = stickerSprite("question", 0.16);
  private readonly sparkle = stickerSprite("sparkle", 0.12);
  private readonly exclaim = stickerSprite("exclaim", 0.16);
  private readonly lights: { hemi: THREE.HemisphereLight; key: THREE.DirectionalLight; lamp: THREE.PointLight };
  private timeline: Timeline | null = null;
  private time = 0;
  private alive = true;

  constructor() {
    this.scene.background = new THREE.Color(0x120c08);
    this.camera.layers.enableAll();

    const hemi = new THREE.HemisphereLight(0xffffff, 0x5a5560, 1.3);
    const key = new THREE.DirectionalLight(0xfff6ea, 2.0);
    key.position.set(-1.5, 3, 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2.5;
    key.shadow.camera.right = 2.5;
    key.shadow.camera.top = 2.5;
    key.shadow.camera.bottom = -2.5;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.015;
    const lamp = new THREE.PointLight(0xffcf9e, 0.8, 3, 1.5);
    lamp.position.set(0, 0.9, 0.3);
    this.scene.add(hemi, key, lamp);
    this.lights = { hemi, key, lamp };

    for (let i = 0; i < 9; i++) {
      const h = stickerSprite("heart", 0.07 + (i % 3) * 0.02);
      this.hearts.push(h);
      this.scene.add(h);
    }
    this.scene.add(this.sweat, this.question, this.sparkle, this.exclaim);

    this.ready = this.build();
    if (process.env.NODE_ENV !== "production") (globalThis as unknown as { __sketch?: SketchAct }).__sketch = this;
  }

  private async build() {
    this.set = buildDiningSet();
    this.scene.add(this.set.root);
    const [husband, wife] = await Promise.all([
      Person.load("esposo", "/models/kenney/esposo.glb", "#da845d"),
      Person.load("esposa", "/models/kenney/esposa.glb", "#d27d58"),
    ]);
    if (!this.alive) {
      husband.dispose();
      wife.dispose();
      return;
    }
    this.husband = husband;
    this.wife = wife;
    this.scene.add(husband.group, wife.group, this.clawd.group);
    this.clawd.phase = 0.4;
    husband.clips = HUSBAND_CLIPS;
    wife.clips = WIFE_CLIPS;
    this.timeline = this.choreograph();
    this.seek(0);
  }

  /**
   * Solo para pruebas: cuántos vértices reales (con el esqueleto animado) de cada objeto
   * quedan dentro de los volúmenes sólidos de otro, y cuánto se hunden (en unidades).
   */
  debugOverlaps(): { a: string; b: string; n: number; depth: number }[] {
    if (!this.timeline) return [];
    this.scene.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const local = new THREE.Vector3();
    const inv = new THREE.Matrix4();
    const named = (name: string) => this.set.root.getObjectByName(name)!;

    /** Vértices en coordenadas del mundo de todas las mallas visibles de un objeto. */
    const verts = (root: THREE.Object3D) => {
      const out: THREE.Vector3[] = [];
      root.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh || !m.visible || m.userData.ink || c.layers.mask === 2) return;
        const sk = m as THREE.SkinnedMesh;
        if (sk.isSkinnedMesh) sk.skeleton.update();
        const pos = m.geometry.attributes.position;
        const step = Math.max(1, Math.floor(pos.count / 400));
        for (let i = 0; i < pos.count; i += step) {
          m.getVertexPosition(i, v);
          out.push(v.clone().applyMatrix4(m.matrixWorld));
        }
      });
      return out;
    };
    /** Volumen sólido: devuelve cuánto se hunde un punto (0 = fuera). */
    type Solid = (p: THREE.Vector3) => number;
    const box = (obj: THREE.Object3D, min: THREE.Vector3, max: THREE.Vector3): Solid => {
      inv.copy(obj.matrixWorld).invert();
      const m = inv.clone();
      return (p) => {
        local.copy(p).applyMatrix4(m);
        const d = Math.min(local.x - min.x, max.x - local.x, local.y - min.y, max.y - local.y, local.z - min.z, max.z - local.z);
        return d > 0 ? d : 0;
      };
    };
    const cylinder = (cx: number, cz: number, r: number, y0: number, y1: number): Solid => (p) => {
      const d = Math.min(r - Math.hypot(p.x - cx, p.z - cz), p.y - y0, y1 - p.y);
      return d > 0 ? d : 0;
    };
    const person = (g: THREE.Object3D): Solid =>
      box(g, new THREE.Vector3(-0.16, g.position.y > 0.05 ? 0.05 : 0.02, -0.1), new THREE.Vector3(0.16, 0.66, 0.1));

    const C = this.clawd.group;
    const k = 1;
    const solids: [string, Solid, boolean][] = [
      ["mesa", (p) => Math.max(cylinder(0, 0, 0.39, 0.24, 0.335)(p), cylinder(0, 0, 0.045, 0, 0.3)(p)), true],
      ["silla-el", box(named("silla-el"), new THREE.Vector3(-0.13, 0.17, -0.13), new THREE.Vector3(0.13, 0.21, 0.13)), true],
      ["silla-ella", box(named("silla-ella"), new THREE.Vector3(-0.13, 0.17, -0.13), new THREE.Vector3(0.13, 0.21, 0.13)), true],
      ["clawd", box(C, new THREE.Vector3(-0.5 * k, 0.2, -0.28), new THREE.Vector3(0.5 * k, 0.86, 0.28)), this.fx.clawd > 0.5],
      ["regalo", box(this.set.gift, new THREE.Vector3(-0.1, 0, -0.1), new THREE.Vector3(0.1, 0.165, 0.1)), this.set.gift.visible],
      ["esposo", person(this.husband.group), true],
      ["esposa", person(this.wife.group), this.fx.wife > 0.5],
      ["pastel", cylinder(0, 0.12, 0.1, 0.33, 0.45), this.fx.night > 0.5],
      ["florero", cylinder(0, -0.17, 0.045, 0.33, 0.45), true],
    ];
    const movers: [string, THREE.Object3D, boolean][] = [
      ["esposo", this.husband.group, true],
      ["esposa", this.wife.group, this.fx.wife > 0.5],
      ["clawd", C, this.fx.clawd > 0.5],
      ["regalo", this.set.gift, this.set.gift.visible],
    ];
    // Sentarse en su propia silla es esperado.
    const expected = new Set(["esposo|silla-el", "esposa|silla-ella"]);
    const out: { a: string; b: string; n: number; depth: number }[] = [];
    for (const [na, obj, on] of movers) {
      if (!on) continue;
      const pts = verts(obj);
      for (const [nb, solid, sOn] of solids) {
        if (!sOn || na === nb || expected.has(`${na}|${nb}`)) continue;
        let n = 0;
        let depth = 0;
        for (const p of pts) {
          const d = solid(p);
          if (d > 0.01) {
            n++;
            depth = Math.max(depth, d);
          }
        }
        if (n) out.push({ a: na, b: nb, n, depth: Math.round(depth * 100) / 100 });
      }
    }
    return out;
  }

  /** Lleva la escena al segundo `t` de la película. */
  seek(t: number) {
    if (!this.timeline) return;
    // El cine mudo corre a 18 cuadros por segundo.
    const shown = Math.min(t, FREEZE_AT);
    this.time = t;
    this.timeline.seek(Math.max(0, Math.min(SKETCH_SECONDS, shown)) * 1000);
    this.pose(shown);
    this.film.uniforms.uTime.value = t;
  }

  /** Posiciones en pantalla (px del lienzo de 1920 × 1080) sobre la cabeza de cada uno. */
  anchors(): Record<"esposo" | "esposa" | "claude", Anchor> {
    const v = new THREE.Vector3();
    const toScreen = (obj: THREE.Object3D, lift = 0): Anchor => {
      obj.getWorldPosition(v);
      v.y += lift;
      v.project(this.camera);
      return { x: (v.x * 0.5 + 0.5) * 1920, y: (0.5 - v.y * 0.5) * 1080 };
    };
    if (!this.husband) return { esposo: { x: 700, y: 300 }, esposa: { x: 1200, y: 300 }, claude: { x: 1400, y: 400 } };
    return {
      esposo: toScreen(this.husband.headTop),
      esposa: toScreen(this.wife.headTop),
      claude: toScreen(this.clawd.group, 0.55),
    };
  }

  render(renderer: THREE.WebGLRenderer) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.film.setSize(size.x, size.y);
    if (!this.timeline) {
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      return;
    }
    this.film.render(renderer, this.scene, this.camera);
  }

  dispose() {
    this.alive = false;
    this.timeline?.pause();
    this.husband?.dispose();
    this.wife?.dispose();
    this.film.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
    });
  }

  /* ------------------------------------------------------------ cada cuadro */

  private pose(t: number) {
    const { set, fx, husband, wife, clawd } = this;

    // Cámara.
    const c = this.cam;
    const shake = c.shake ? Math.sin(t * 83) * 0.02 * c.shake : 0;
    // Los planos se escribieron cerca; DOLLY los aleja a todos por igual.
    this.camera.position.set(
      c.tx + (c.px - c.tx) * DOLLY + shake,
      c.ty + (c.py - c.ty) * DOLLY + shake * 0.6,
      c.tz + (c.pz - c.tz) * DOLLY,
    );
    this.camera.lookAt(c.tx, c.ty, c.tz);
    this.camera.rotateZ(c.roll);
    if (this.camera.fov !== c.fov) {
      this.camera.fov = c.fov;
      this.camera.updateProjectionMatrix();
    }

    // Personajes (con colisiones resueltas en el piso).
    this.solveCollisions();
    husband.face = faceAt(HUSBAND_FACES, t);
    wife.face = faceAt(WIFE_FACES, t);
    husband.update(t);
    wife.group.visible = fx.wife > 0.5;
    wife.update(t);
    clawd.group.visible = fx.clawd > 0.5;
    clawd.group.position.set(this.clawdAt.x + this.clawdPush.x, 0, this.clawdAt.z + this.clawdPush.z);
    clawd.group.rotation.y = this.clawdAt.ry;
    clawd.group.scale.setScalar(this.clawdAt.scale);
    clawd.update(t);
    this.scene.updateMatrixWorld(true);

    // Noche o día.
    const n = fx.night;
    for (const o of set.night) o.visible = n > 0.5;
    for (const o of set.day) o.visible = n <= 0.5;
    set.windowSky.color.setHex(n > 0.5 ? 0x1d2a4a : 0x9fd3f2);
    this.lights.hemi.intensity = 1.2 + (1 - n) * 0.9;
    this.lights.key.intensity = 2.2 + (1 - n) * 0.8;
    this.lights.lamp.intensity = 0.8 * n;
    set.candleFlame.scale.set(1, 1.8 + Math.sin(t * 13) * 0.25, 1);

    // El color nace en la puerta: su centro en pantalla (0–1).
    const door = new THREE.Vector3(DOOR.x, DOOR.y, DOOR.z).project(this.camera);
    this.film.uniforms.uRevealAt.value.set(door.x * 0.5 + 0.5, door.y * 0.5 + 0.5);

    // Puerta y luz.
    set.door.rotation.y = -fx.door * 1.75;
    (set.doorGlow.material as THREE.MeshBasicMaterial).color.setScalar(0.25 + fx.glow * 0.75);

    // Copas: de la mesa a la mano.
    const tmp = new THREE.Vector3();
    const place = (obj: THREE.Object3D, home: THREE.Vector3, hand: THREE.Object3D, k: number) => {
      hand.getWorldPosition(tmp);
      tmp.y -= 0.07;
      obj.position.lerpVectors(home, tmp, k);
    };
    place(set.glassL, GLASS_HOME_L, husband.handR, fx.hGlass);
    place(set.glassR, GLASS_HOME_R, wife.handL, fx.wGlass);

    // Regalo: Claude → ella → mesa.
    set.gift.visible = fx.giftShown > 0.5;
    if (set.gift.visible) {
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      clawd.hands.getWorldPosition(a);
      a.y -= 0.08;
      wife.handL.getWorldPosition(b);
      wife.handR.getWorldPosition(tmp);
      b.add(tmp).multiplyScalar(0.5);
      b.y -= 0.06;
      a.lerp(b, fx.giftToWife).lerp(GIFT_TABLE, fx.giftOnTable);
      // Más chico en manos de ella: así las manos quedan a los lados de la caja, no dentro.
      const scale = 0.9 - 0.14 * fx.giftToWife * (1 - fx.giftOnTable) + Math.sin(fx.sparkle * Math.PI) * 0.15;
      if (fx.giftOnTable < 0.99) this.resolveGift(a, 0.1 * scale, 0.17 * scale);
      set.gift.position.copy(a);
      set.gift.rotation.y = this.clawdAt.ry * (1 - fx.giftToWife) - 0.6 * fx.giftToWife;
      set.gift.scale.setScalar(scale);
    }

    // Celular en la mano de él.
    set.phone.visible = fx.phoneShown > 0.5;
    if (set.phone.visible) {
      husband.handR.getWorldPosition(set.phone.position);
      set.phone.rotation.set(-0.9, husband.pose.ry, 0);
    }

    // Calcomanías.
    const head = new THREE.Vector3();
    husband.headTop.getWorldPosition(head);
    stick(this.sweat, fx.sweat, head.x + 0.13, head.y - 0.06 - (t % 1) * 0.05, head.z + 0.05);
    stick(this.question, fx.question, head.x, head.y + 0.1 + Math.sin(t * 5) * 0.015, head.z);
    stick(this.exclaim, fx.exclaim, head.x, head.y + 0.1, head.z);
    const eye = new THREE.Vector3();
    clawd.group.getWorldPosition(eye);
    stick(this.sparkle, fx.sparkle, eye.x + 0.12, eye.y + 0.36, eye.z + 0.2);
    this.sparkle.material.rotation = t * 3;
    this.hearts.forEach((h, i) => {
      const life = (t * 0.35 + i / this.hearts.length) % 1;
      const burst = fx.heartsBurst;
      const x = fx.heartX + (i % 3) * 0.2 - 0.2 + Math.sin(t * 1.5 + i) * 0.05 + (burst ? (i - 4) * 0.06 * burst : 0);
      stick(h, fx.hearts * Math.sin(life * Math.PI), x, fx.heartY + life * (0.6 + burst * 0.3), fx.heartZ + (i % 2) * 0.1 - 0.05);
      h.scale.setScalar((0.07 + (i % 3) * 0.02) * (1 + burst * 0.7));
    });
  }

  /**
   * Colisiones en el piso: cada personaje es un círculo y la mesa y las sillas son
   * obstáculos fijos. Se separan los círculos que se tocan (unas pasadas por cuadro) y el
   * resultado se guarda como corrección aparte, sin tocar la línea de tiempo: el mismo
   * segundo siempre da el mismo resultado, aunque se adelante o retroceda.
   */
  private solveCollisions() {
    const { husband: H, wife: W, fx } = this;
    interface Body {
      x: number;
      z: number;
      r: number;
      /** Sentado (o fuera de la sala): no se mueve, pero los demás lo esquivan. */
      pinned: boolean;
      on: boolean;
      out: { x: number; z: number };
      x0: number;
      z0: number;
    }
    const make = (x: number, z: number, r: number, pinned: boolean, on: boolean, out: { x: number; z: number }): Body => ({
      x, z, r, pinned, on, out, x0: x, z0: z,
    });
    const inRoom = this.clawdAt.z > -1.0;
    const bodies: Body[] = [
      make(H.pose.x, H.pose.z, PERSON_R, H.pose.y > 0.05, true, H.push),
      make(W.pose.x, W.pose.z, PERSON_R, W.pose.y > 0.05, fx.wife > 0.5, W.push),
      make(this.clawdAt.x, this.clawdAt.z, CLAWD_R * (this.clawdAt.scale / 0.55), !inRoom, fx.clawd > 0.5, this.clawdPush),
    ].filter((b) => b.on);

    for (let pass = 0; pass < 4; pass++) {
      for (const b of bodies) {
        if (b.pinned) continue;
        for (const o of OBSTACLES) separate(b, o, 1);
      }
      for (let i = 0; i < bodies.length; i++)
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i];
          const c = bodies[j];
          if (a.pinned && c.pinned) continue;
          const dx = c.x - a.x;
          const dz = c.z - a.z;
          const d = Math.hypot(dx, dz) || 1e-4;
          const overlap = a.r + c.r - d;
          if (overlap <= 0) continue;
          const wa = a.pinned ? 0 : c.pinned ? 1 : 0.5;
          const wc = 1 - wa;
          a.x -= (dx / d) * overlap * wa;
          a.z -= (dz / d) * overlap * wa;
          c.x += (dx / d) * overlap * wc;
          c.z += (dz / d) * overlap * wc;
        }
    }
    H.push.x = H.push.z = W.push.x = W.push.z = this.clawdPush.x = this.clawdPush.z = 0;
    for (const b of bodies) {
      b.out.x = b.x - b.x0;
      b.out.z = b.z - b.z0;
    }
  }

  /**
   * Colisiones del regalo (objeto liviano, origen en su base): se aparta de los cuerpos y
   * de la utilería que esté a su misma altura. Si queda apenas por debajo de la mesa,
   * se apoya encima en vez de atravesarla.
   */
  private resolveGift(p: THREE.Vector3, r: number, h: number) {
    const { husband: H, wife: W, set, fx } = this;
    const v = new THREE.Vector3();
    const colliders: { x: number; z: number; r: number; y0: number; y1: number }[] = [
      { x: H.group.position.x, z: H.group.position.z, r: PERSON_R, y0: H.group.position.y, y1: H.group.position.y + 0.7 },
      { x: this.clawd.group.position.x, z: this.clawd.group.position.z, r: CLAWD_R * (this.clawdAt.scale / 0.55), y0: 0, y1: 0.5 },
      { x: -CHAIR_X, z: 0, r: 0.16, y0: 0, y1: 0.56 },
      { x: CHAIR_X, z: 0, r: 0.16, y0: 0, y1: 0.56 },
      { x: 0, z: -0.17, r: 0.06, y0: 0.33, y1: 0.6 },
      ...(fx.night > 0.5 ? [{ x: 0, z: 0.12, r: 0.1, y0: 0.33, y1: 0.53 }] : []),
      ...[set.glassL, set.glassR].map((g) => {
        g.getWorldPosition(v);
        return { x: v.x, z: v.z, r: 0.045, y0: v.y, y1: v.y + 0.15 };
      }),
    ];
    if (fx.wife > 0.5)
      colliders.push({ x: W.group.position.x, z: W.group.position.z, r: PERSON_R, y0: W.group.position.y, y1: W.group.position.y + 0.7 });
    for (let pass = 0; pass < 4; pass++) {
      // Mesa: apoyarlo encima si está casi a la altura del tablero.
      const dTable = Math.hypot(p.x, p.z);
      if (dTable < TABLE_TOP_R + r * 0.5 && p.y < TABLE_TOP && p.y > TABLE_TOP - 0.16) p.y = TABLE_TOP;
      else if (dTable < TABLE_TOP_R + r && p.y < TABLE_TOP) {
        const k = (TABLE_TOP_R + r) / (dTable || 1e-4);
        p.x *= k;
        p.z *= k;
      }
      for (const c of colliders) {
        if (p.y + h < c.y0 || p.y > c.y1) continue;
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const d = Math.hypot(dx, dz) || 1e-4;
        const overlap = r + c.r - d;
        if (overlap <= 0) continue;
        p.x += (dx / d) * overlap;
        p.z += (dz / d) * overlap;
      }
    }
  }

  /* -------------------------------------------------------- la coreografía */

  private choreograph(): Timeline {
    const tl = createTimeline({ autoplay: false, defaults: { ease: "inOut(2)" } });
    const ms = (s: number) => s * 1000;
    const cut = (t: number, rig: Partial<CamRig>) => tl.set(this.cam, rig, ms(t));
    const move = (t: number, dur: number, target: object, props: Record<string, number>, ease = "inOut(2)") =>
      tl.add(target, { ...props, duration: ms(dur), ease }, ms(t));
    const set = (t: number, target: object, props: Record<string, number>) => tl.set(target, props, ms(t));
    const { fx, husband: H, wife: W, clawd: C, clawdAt: CA } = this;
    const u = this.film.uniforms;
    const hb = H.pose.bones;
    const wb = W.pose.bones;

    // Posiciones de partida: sentados frente a frente.
    const seatH = { x: -SEAT_X, y: 0.185, z: 0, ry: Math.PI / 2 - 0.62 };
    const seatW = { x: SEAT_X, y: 0.185, z: 0, ry: -Math.PI / 2 + 0.62 };
    Object.assign(H.pose, seatH);
    Object.assign(W.pose, seatW);
    set(0, H.pose, seatH);
    set(0, W.pose, seatW);
    set(0, u.uSilent, { value: 1 });
    set(0, u.uPillar, { value: 1 });
    set(0, u.uReveal, { value: 0 });

    // 00 · Cartel (0–3) y 01 · Brindis (3–9).
    cut(0, CAM_WIDE);
    move(3, 6, this.cam, { px: 0, py: 0.62, pz: 2.1, ty: 0.42, tz: 0 }, "inOut(1.5)");
    move(2.6, 1, fx, { hearts: 1 });
    move(4.4, 0.8, hb["arm-right"], { y: 1.3, z: -0.45 });
    move(4.4, 0.8, wb["arm-left"], { y: -1.3, z: 0.45 });
    move(4.4, 0.8, fx, { hGlass: 1, wGlass: 1 });
    move(5.6, 0.5, hb["arm-right"], { y: 1.55, z: -0.4 }, "out(3)");
    move(5.6, 0.5, wb["arm-left"], { y: -1.55, z: 0.4 }, "out(3)");
    move(6.6, 0.6, hb["arm-right"], { y: 1.3, z: -0.45 });
    move(6.6, 0.6, wb["arm-left"], { y: -1.3, z: 0.45 });
    move(7.8, 0.8, hb["arm-right"], { y: 0, z: 0 });
    move(7.8, 0.8, wb["arm-left"], { y: 0, z: 0 });
    move(7.8, 0.8, fx, { hGlass: 0, wGlass: 0 });
    move(8.4, 0.5, fx, { hearts: 0 });

    // 02 · El regalo olvidado (9–15): ella busca, él se congela.
    cut(9, { px: 0.05, py: 0.64, pz: 0.95, tx: 0.5, ty: 0.55, tz: 0, fov: 30 });
    move(9.4, 0.7, wb.head, { y: 0.5 });
    move(10.2, 0.7, wb.head, { y: -0.45 });
    move(11.0, 0.5, wb.head, { y: 0 });
    cut(11.6, { px: -0.02, py: 0.6, pz: 0.9, tx: -0.5, ty: 0.56, tz: 0, fov: 30 });
    move(11.6, 0.35, this.cam, { fov: 21 }, "out(3)");
    set(11.7, H.pose, { shake: 0.6 });
    move(12, 0.4, fx, { sweat: 1 });

    // 03 · El checkout (15–24): saca el celular bajo la mesa.
    cut(15, { px: -0.05, py: 0.62, pz: 1.25, tx: -0.45, ty: 0.45, tz: 0, fov: 30 });
    set(15, H.pose, { shake: 0 });
    move(15, 0.6, hb.head, { x: 0.45 });
    move(15, 0.6, hb["arm-right"], { y: 0.9, z: 0.35 });
    set(15.3, fx, { phoneShown: 1 });
    move(18.4, 0.15, this.cam, { shake: 1 });
    move(18.6, 0.4, this.cam, { shake: 0 });
    move(23.6, 0.3, fx, { sweat: 0 });

    // 04 · La sospecha (24–33).
    cut(24, { px: 0.0, py: 0.62, pz: 1.0, tx: 0.5, ty: 0.52, tz: 0, fov: 30 });
    set(24, hb.head, { x: 0 });
    set(24, fx, { phoneShown: 0 });
    set(24, hb["arm-right"], { y: 0, z: 0 });
    move(24.3, 0.8, wb["arm-left"], { y: -1.2, z: 0.55, x: 0.5 });
    move(24.3, 0.8, wb["arm-right"], { y: 1.2, z: -0.55, x: 0.5 });
    cut(28.8, { px: 0.0, py: 0.6, pz: 0.95, tx: -0.5, ty: 0.53, tz: 0, fov: 30 });
    move(28.8, 0.4, H.pose, { puff: -1, shake: 1 });
    set(28.8, fx, { sweat: 1 });
    cut(32, { px: 0.02, py: 0.62, pz: 0.85, tx: 0.5, ty: 0.57, tz: 0, fov: 26 });
    move(32, 0.3, wb.head, { z: 0.15 });

    // 05 · ¡PUM! (33–38.6).
    cut(33, { px: 0.25, py: 0.78, pz: 2.6, tx: 0.35, ty: 0.48, tz: -0.4, fov: 32 });
    set(33, H.pose, { puff: 0, shake: 0 });
    set(33, fx, { sweat: 0 });
    set(33, wb.head, { z: 0 });
    move(33, 0.18, fx, { door: 1, glow: 1 }, "out(4)");
    move(33, 0.12, this.cam, { shake: 1.6 });
    move(33.3, 0.6, this.cam, { shake: 0 });
    move(33.15, 0.35, hb.head, { y: 0.95 }, "out(3)");
    move(33.15, 0.35, wb.head, { y: 1.3 }, "out(3)");
    move(33.15, 0.35, wb["arm-left"], { y: 0, z: 0, x: 0 }, "out(3)");
    move(33.15, 0.35, wb["arm-right"], { y: 0, z: 0, x: 0 }, "out(3)");
    move(35, 3.6, this.cam, { px: 0.75, py: 0.62, pz: 1.4, tx: 1.15, ty: 0.48, tz: -1.3, fov: 30 }, "inOut(1.5)");

    // 06 · Claude (38.6–49): entra el color.
    set(38.5, fx, { clawd: 1, giftShown: 1 });
    set(38.5, CA, { x: 1.15, z: -1.2, ry: 0 });
    set(38.5, C.pose, { armL: 1.2, armR: 1.2 });
    move(COLOR_AT, 2.2, u.uReveal, { value: 2.4 }, "in(1.6)");
    move(COLOR_AT + 0.4, 1.4, u.uPillar, { value: 0 }, "inOut(3)");
    set(COLOR_AT + 2.3, u.uSilent, { value: 0 });
    move(38.9, 0.25, C.pose, { squash: 0.25 }, "out(2)");
    move(39.15, 0.3, C.pose, { squash: 0, hop: 0.12 }, "out(2)");
    move(39.45, 0.25, C.pose, { hop: 0 }, "in(2)");
    move(39.0, 2.8, this.cam, { px: 0.45, py: 0.68, pz: 2.2, tx: 0.65, ty: 0.42, tz: -0.2 }, "inOut(1.5)");
    set(39.6, C.pose, { walk: 1 });
    move(39.6, 2.2, CA, { x: CLAWD_SPOT.x, z: CLAWD_SPOT.z, ry: -1.0 }, "linear");
    set(41.8, C.pose, { walk: 0 });
    move(41.8, 0.25, C.pose, { squash: 0.2 });
    move(42.05, 0.3, C.pose, { squash: 0 }, "outElastic(1, .5)");
    move(41.4, 0.5, hb.head, { y: 0.55 });
    move(41.4, 0.5, wb.head, { y: 0.4 });
    cut(41.8, { px: 0.2, py: 0.62, pz: 1.45, tx: 0.82, ty: 0.38, tz: 0.2, fov: 30 });
    move(45, 0.4, C.pose, { lean: 0.2, armL: 1.5, armR: 1.5 });
    move(45.2, 0.7, fx, { giftToWife: 1, sparkle: 1 }, "inOut(3)");
    move(45.9, 0.3, fx, { sparkle: 0 });
    move(45.6, 0.4, C.pose, { lean: 0, armL: 0, armR: 0 });
    move(45.4, 0.5, wb.head, { y: 0, x: 0.1 });
    // Recibe el regalo sentada: brazos al frente.
    move(45.3, 0.45, wb["arm-left"], { y: -1.02, z: 0.32 });
    move(45.3, 0.45, wb["arm-right"], { y: 1.02, z: -0.32 });
    cut(48, { px: -0.02, py: 0.6, pz: 0.9, tx: -0.5, ty: 0.55, tz: 0, fov: 28 });
    set(48, H.pose, { shake: 0.3 });

    // 07 · ¿Yo pedí eso? (49–56): mira el regalo, a Claude, el regalo…
    cut(49, { px: -0.02, py: 0.62, pz: 0.88, tx: -0.5, ty: 0.56, tz: 0, fov: 28 });
    set(49, H.pose, { shake: 0 });
    [49.6, 50.4, 51.2, 52.0, 52.8].forEach((t, i) => move(t, 0.18, hb.head, { y: i % 2 ? 0.5 : 0.1 }, "out(3)"));
    move(50.2, 0.3, fx, { question: 1 }, "outBack(2)");
    move(55.4, 0.3, fx, { question: 0 });

    // 08 · El guiño (56–61).
    set(56, CA, { ry: -0.35 });
    cut(56, { px: 0.8, py: 0.45, pz: 1.7, tx: CLAWD_SPOT.x, ty: 0.3, tz: CLAWD_SPOT.z, fov: 30 });
    move(56.3, 1, this.cam, { pz: 1.35, fov: 26 }, "inOut(2)");
    move(57.4, 0.15, C.pose, { wink: 1 }, "out(2)");
    move(57.5, 0.3, fx, { sparkle: 1 }, "outBack(2)");
    move(57.55, 0.2, C.pose, { tilt: 0.12 });
    move(58.4, 0.15, C.pose, { wink: 0, tilt: 0 });
    move(58.4, 0.3, fx, { sparkle: 0 });
    move(59.6, 1.2, this.cam, { roll: -0.25, fov: 34 }, "in(2)");
    move(60.2, 0.8, u.uFlash, { value: 1 }, "in(2)");

    // 09 · Tres semanas antes (61–78): recuerdo de día.
    set(61, u.uFlash, { value: 0 });
    set(61, this.cam, { roll: 0 });
    set(61, u.uMemory, { value: 1 });
    set(61, fx, { night: 0, wife: 0, giftShown: 0, hearts: 0, door: 0, glow: 0 });
    set(61, H.pose, { x: -0.38, y: 0, z: 0.66, ry: 0.95 });
    set(61, hb.head, { y: 0, x: 0 });
    set(61, CA, { x: 0.42, z: 0.76, ry: -0.95, scale: 0.55 });
    cut(61, { px: 0.05, py: 0.55, pz: 2.15, tx: 0.02, ty: 0.33, tz: 0.65, fov: 30 });
    move(64, 0.4, hb["arm-right"], { y: 0.6, z: -0.6 });
    move(65.2, 0.4, hb["arm-right"], { y: 0.3, z: -0.3 });
    move(66.4, 0.4, hb["arm-right"], { y: 0.8, z: -0.9 });
    move(68.4, 0.5, hb["arm-right"], { y: 0, z: 0 });
    move(69.4, 0.3, C.pose, { lean: 0.22 });
    move(69.7, 0.3, C.pose, { lean: 0 });
    move(70.0, 0.3, C.pose, { lean: 0.22 });
    move(70.3, 0.3, C.pose, { lean: 0, waveR: 1 });
    move(72.4, 0.3, C.pose, { waveR: 0 });
    move(71.6, 0.5, hb["arm-right"], { y: 1.2, z: -0.2 });
    set(71.8, fx, { phoneShown: 1 });
    move(71.6, 0.5, hb.head, { x: 0.35, y: 0.2 });
    move(74.8, 0.6, u.uMemory, { value: 0 });
    move(74.6, 0.5, u.uFlash, { value: 0.9 }, "in(2)");

    // De vuelta al presente.
    set(75.2, u.uFlash, { value: 0 });
    set(75.2, fx, { night: 1, wife: 1, giftShown: 1, giftToWife: 1, phoneShown: 0, door: 1, glow: 0.4 });
    set(75.2, H.pose, seatH);
    set(75.2, wb["arm-left"], { y: -1.02, z: 0.32 });
    set(75.2, wb["arm-right"], { y: 1.02, z: -0.32 });
    set(75.2, hb.head, { x: 0, y: 0 });
    set(75.2, hb["arm-right"], { y: 0, z: 0 });
    set(75.2, CA, { x: CLAWD_SPOT.x, z: CLAWD_SPOT.z, ry: -1.0 });
    cut(75.2, { px: -0.02, py: 0.62, pz: 0.88, tx: -0.5, ty: 0.56, tz: 0, fov: 28 });
    move(75.6, 0.3, fx, { exclaim: 1 }, "outBack(2)");
    move(77.4, 0.3, fx, { exclaim: 0 });

    // 10 · Todo estaba planeado (78–90).
    cut(78, { px: 0.15, py: 0.66, pz: 2.0, tx: 0.2, ty: 0.42, tz: 0, fov: 30 });
    move(78.2, 0.6, H.pose, { puff: 1 });
    move(78.2, 0.6, hb.torso, { x: -0.18 });
    move(78.4, 0.5, hb["arm-left"], { y: -1.2, z: 0.2 });
    move(79.4, 0.4, hb["arm-left"], { y: -0.9, z: 0.6 });
    move(80.2, 0.4, hb["arm-left"], { y: 0, z: 0 });
    // Ella deja el regalo en la mesa; él se baja de la silla y ella se levanta.
    move(81.2, 0.6, fx, { giftOnTable: 1 });
    move(81.5, 0.4, wb["arm-left"], { y: 0, z: 0 });
    move(81.5, 0.4, wb["arm-right"], { y: 0, z: 0 });
    move(81.4, 0.4, H.pose, { puff: 0 });
    move(81.4, 0.4, hb.torso, { x: 0 });
    cut(82, { px: 0.05, py: 0.6, pz: 1.75, tx: 0, ty: 0.36, tz: 0.45, fov: 30 });
    move(82, 0.22, H.pose, { y: 0.06, x: -SEAT_X, z: 0.2 }, "out(2)");
    move(82.22, 0.25, H.pose, { y: 0, z: 0.4 }, "in(2)");
    move(82.1, 0.45, W.pose, { y: 0, x: SEAT_X, z: 0.4 }, "inOut(2)");
    // Caminan uno hacia el otro por delante de la mesa.
    move(82.55, 0.3, H.pose, { ry: Math.PI / 2 - 0.45 });
    move(82.55, 0.3, W.pose, { ry: -Math.PI / 2 + 0.45 });
    move(82.65, 0.85, H.pose, { x: -HUG_X, z: 0.62 }, "inOut(1.5)");
    move(82.65, 0.85, W.pose, { x: HUG_X, z: 0.62 }, "inOut(1.5)");
    // Se abrazan.
    move(83.45, 0.4, hb["arm-right"], { y: 1.35, z: -0.12 });
    move(83.45, 0.4, hb["arm-left"], { y: -1.35, z: 0.12 });
    move(83.45, 0.4, wb["arm-right"], { y: 1.35, z: -0.12 });
    move(83.45, 0.4, wb["arm-left"], { y: -1.35, z: 0.12 });
    move(83.45, 0.4, hb.torso, { x: 0.14 });
    move(83.45, 0.4, wb.torso, { x: 0.14 });
    move(84.0, 0.5, hb.torso, { z: 0.08 });
    move(84.0, 0.5, wb.torso, { z: -0.08 });
    move(84.5, 0.5, hb.torso, { z: -0.06 });
    move(84.5, 0.5, wb.torso, { z: 0.06 });
    // Corazones alrededor de la pareja.
    set(83.3, fx, { heartX: 0, heartY: 0.62, heartZ: 0.62, heartsBurst: 0 });
    move(83.6, 0.5, fx, { hearts: 1, heartsBurst: 1 }, "outBack(2)");
    // Gracias de reojo y guiño.
    move(85, 0.4, hb.head, { y: 0.3 });
    move(85.7, 0.15, C.pose, { wink: 1 });
    move(86.3, 0.15, C.pose, { wink: 0, happy: 1 });
    move(84.6, 2.4, this.cam, { px: 0.1, py: 0.85, pz: 2.5, ty: 0.4, tz: 0.4 }, "out(2)");

    return tl;
  }
}

/** Radios de colisión en el piso (los personajes miden 0,67 de alto). */
const PERSON_R = 0.15;
/** Clawd es una caja de 0,55 × 0,31 (a escala): el radio cubre su media diagonal. */
const CLAWD_R = 0.36;

/** Dónde se queda Clawd después de entrar (sin tocar a la esposa sentada ni su silla). */
const CLAWD_SPOT = { x: 1.12, z: 0.46 };

/** Mitad de la distancia entre los dos al abrazarse (torsos que se tocan, sin atravesarse). */
const HUG_X = 0.23;

/** Tablero de la mesa (altura y radio con el mantel). */
const TABLE_TOP = 0.335;
const TABLE_TOP_R = 0.37;

/** Obstáculos fijos: la mesa y las dos sillas. */
const OBSTACLES = [
  { x: 0, z: 0, r: 0.38 },
  { x: -CHAIR_X, z: 0, r: 0.16 },
  { x: CHAIR_X, z: 0, r: 0.16 },
];

function separate(b: { x: number; z: number; r: number }, o: { x: number; z: number; r: number }, weight: number) {
  const dx = b.x - o.x;
  const dz = b.z - o.z;
  const d = Math.hypot(dx, dz) || 1e-4;
  const overlap = b.r + o.r - d;
  if (overlap <= 0) return;
  b.x += (dx / d) * overlap * weight;
  b.z += (dz / d) * overlap * weight;
}

/** Cuadro congelado del final: desde aquí la escena deja de avanzar. */
const FREEZE_AT = 87.2;

/** Distancia de cámara: 1 = la escrita en cada plano. */
const DOLLY = 1.45;

/** Centro del vano de la puerta (de three/models/set.ts). */
const DOOR = { x: 1.15, y: 0.5, z: -1.3 };

const GLASS_HOME_L = new THREE.Vector3(-0.17, 0.33, 0.08);
const GLASS_HOME_R = new THREE.Vector3(0.17, 0.33, 0.08);
/** Lugar libre en la mesa para el regalo (lejos del pastel, el florero y las copas). */
const GIFT_TABLE = new THREE.Vector3(0.17, 0.335, -0.16);

/** Cadera de cada uno sentado: sobre su silla, un poco hacia la mesa. */
const SEAT_X = CHAIR_X - 0.06;

/* --------------------------------------------- clips y caras por segundo */

const HUSBAND_CLIPS: ClipCue[] = [
  { at: 0, clip: "sit" },
  { at: 61, clip: "idle", fade: 0 },
  { at: 64, clip: "interact-right", fade: 0.2, speed: 0.6 },
  { at: 66.5, clip: "idle", fade: 0.3 },
  { at: 75.2, clip: "sit", fade: 0 },
  { at: 82.05, clip: "idle", fade: 0.3 },
  { at: 82.65, clip: "walk", fade: 0.15 },
  { at: 83.45, clip: "idle", fade: 0.2 },
];

const WIFE_CLIPS: ClipCue[] = [
  { at: 0, clip: "sit" },
  { at: 45.4, clip: "sit", fade: 0 },
  { at: 61, clip: "idle", fade: 0 },
  { at: 75.2, clip: "sit", fade: 0 },
  { at: 81.5, clip: "sit", fade: 0.3 },
  { at: 82.1, clip: "idle", fade: 0.3 },
  { at: 82.65, clip: "walk", fade: 0.15 },
  { at: 83.45, clip: "idle", fade: 0.2 },
];

type FaceCue = [number, Face];

const HUSBAND_FACES: FaceCue[] = [
  [0, "happy"],
  [11.6, "shock"],
  [15, "nervous"],
  [18.5, "shock"],
  [21, "nervous"],
  [24, "nervous"],
  [33.1, "shock"],
  [41.4, "shock"],
  [49, "confused"],
  [56, "confused"],
  [61, "happy"],
  [64, "none"],
  [72, "happy"],
  [75.2, "shock"],
  [75.7, "happy"],
  [78, "proud"],
  [83, "love"],
  [85, "proud"],
];

const WIFE_FACES: FaceCue[] = [
  [0, "happy"],
  [9, "love"],
  [24, "suspicious"],
  [32, "angry"],
  [33.1, "shock"],
  [45.6, "love"],
  [75.2, "happy"],
  [82, "love"],
];

function faceAt(cues: FaceCue[], t: number): Face {
  let face: Face = "none";
  for (const [at, f] of cues) if (t >= at) face = f;
  return face;
}

function stick(sprite: THREE.Sprite, alpha: number, x: number, y: number, z: number) {
  sprite.visible = alpha > 0.01;
  sprite.material.opacity = Math.min(1, alpha);
  sprite.position.set(x, y, z);
}
