import * as THREE from "three";
import { inked, mesh, roundedBox, toon } from "../toon";

/**
 * Escenografía del sketch: comedor con pared empapelada, ventana con luna, cuadro, puerta
 * (con bisagra), mesa redonda, dos sillas, copas, florero y pastel; y la caja de regalo.
 * Unidades: los personajes miden 0,67. La mesa está en el origen; la cámara mira desde +Z.
 */
export interface DiningSet {
  root: THREE.Group;
  /** Hoja de la puerta: girar en Y para abrir (negativo abre hacia adentro). */
  door: THREE.Group;
  /** Luz que entra al abrir la puerta. */
  doorGlow: THREE.Mesh;
  /** Lo que solo existe de noche (velas, pastel, luna). */
  night: THREE.Object3D[];
  /** Lo que solo existe en el recuerdo de día (sol en la ventana). */
  day: THREE.Object3D[];
  glassL: THREE.Group;
  glassR: THREE.Group;
  gift: THREE.Group;
  phone: THREE.Group;
  candleFlame: THREE.Mesh;
  windowSky: THREE.MeshBasicMaterial;
  /** Puntos clave. */
  spots: {
    seatHusband: THREE.Vector3;
    seatWife: THREE.Vector3;
    doorway: THREE.Vector3;
  };
}

const INK = 0x1a120d;
/** Distancia de cada silla al centro de la mesa (las piernas no deben tocar el mantel). */
export const CHAIR_X = 0.66;
const DOOR_X = 1.15;
const DOOR_W = 0.56;
const DOOR_H = 1.05;
const T = 0.012; // grosor del contorno

export function buildDiningSet(): DiningSet {
  const root = new THREE.Group();
  root.name = "set";
  const night: THREE.Object3D[] = [];
  const day: THREE.Object3D[] = [];

  // Piso de tablas.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), toon(0x9a6b45, { map: planksTexture() }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 0.6;
  floor.receiveShadow = true;
  root.add(floor);

  // Alfombra redonda bajo la mesa.
  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40), toon(0xa63d40));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.003;
  rug.receiveShadow = true;
  root.add(rug);
  const rugIn = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.72, 40), toon(0xe9c46a));
  rugIn.rotation.x = -Math.PI / 2;
  rugIn.position.y = 0.005;
  root.add(rugIn);

  // Pared del fondo y zócalo.
  const wallZ = -1.35;
  // Pared con el hueco de la puerta (para que se vea la luz al abrirse).
  const d0 = DOOR_X - DOOR_W / 2;
  const d1 = DOOR_X + DOOR_W / 2;
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-4.5, 0);
  wallShape.lineTo(d0, 0);
  wallShape.lineTo(d0, DOOR_H);
  wallShape.lineTo(d1, DOOR_H);
  wallShape.lineTo(d1, 0);
  wallShape.lineTo(4.5, 0);
  wallShape.lineTo(4.5, 3.2);
  wallShape.lineTo(-4.5, 3.2);
  wallShape.lineTo(-4.5, 0);
  const paper = wallpaperTexture();
  paper.repeat.set(2, 2);
  const wall = new THREE.Mesh(new THREE.ShapeGeometry(wallShape), toon(0xe7d3b1, { map: paper }));
  wall.position.set(0, 0, wallZ);
  wall.receiveShadow = true;
  root.add(wall);
  // Zócalo y moldura, cortados en la puerta.
  for (const [from, to] of [
    [-4.5, d0 - 0.08],
    [d1 + 0.08, 4.5],
  ]) {
    const w = to - from;
    const skirting = mesh(new THREE.BoxGeometry(w, 0.12, 0.04), toon(0x5b3a29));
    skirting.position.set(from + w / 2, 0.06, wallZ + 0.02);
    root.add(skirting);
    const rail = mesh(new THREE.BoxGeometry(w, 0.04, 0.03), toon(0x5b3a29));
    rail.position.set(from + w / 2, 0.62, wallZ + 0.015);
    root.add(rail);
  }

  // Ventana con luna (o sol de día) a la izquierda.
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x1d2a4a });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), skyMat);
  sky.position.set(-1.3, 1.05, wallZ + 0.005);
  root.add(sky);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
  moon.position.set(-1.1, 1.22, wallZ + 0.01);
  root.add(moon);
  night.push(moon);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  sun.position.set(-1.47, 1.2, wallZ + 0.01);
  root.add(sun);
  day.push(sun);
  const frameMat = toon(0xf5efe4);
  for (const [x, y, w, h] of [
    [-1.3, 1.47, 1.0, 0.06],
    [-1.3, 0.63, 1.0, 0.06],
    [-1.77, 1.05, 0.06, 0.9],
    [-0.83, 1.05, 0.06, 0.9],
    [-1.3, 1.05, 0.04, 0.82],
    [-1.3, 1.05, 0.9, 0.04],
  ]) {
    const bar = mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat);
    bar.position.set(x, y, wallZ + 0.03);
    inked(bar, 0.008, INK);
    root.add(bar);
  }
  // Cortinas.
  for (const x of [-1.91, -0.69]) {
    const curtain = mesh(new THREE.BoxGeometry(0.24, 1.05, 0.05), toon(0x8c2f39));
    curtain.position.set(x, 1.02, wallZ + 0.07);
    inked(curtain, 0.008, INK);
    root.add(curtain);
  }

  // Cuadro de un corazón sobre la mesa.
  const picture = mesh(new THREE.BoxGeometry(0.5, 0.36, 0.03), toon(0x5b3a29));
  picture.position.set(0, 1.25, wallZ + 0.02);
  inked(picture, 0.008, INK);
  root.add(picture);
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), new THREE.MeshBasicMaterial({ map: heartPictureTexture() }));
  canvas.position.set(0, 1.25, wallZ + 0.04);
  root.add(canvas);

  // Puerta a la derecha: marco, luz detrás y hoja con bisagra en el borde izquierdo.
  const doorX = DOOR_X;
  const doorW = DOOR_W;
  const doorH = DOOR_H;
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false });
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), glowMat);
  doorGlow.position.set(doorX, doorH / 2, wallZ - 0.25);
  root.add(doorGlow);
  const jamb = toon(0x6b4430);
  for (const [x, y, w, h] of [
    [doorX - doorW / 2 - 0.04, doorH / 2, 0.08, doorH + 0.08],
    [doorX + doorW / 2 + 0.04, doorH / 2, 0.08, doorH + 0.08],
    [doorX, doorH + 0.04, doorW + 0.16, 0.08],
  ]) {
    const bar = mesh(new THREE.BoxGeometry(w, h, 0.08), jamb);
    bar.position.set(x, y, wallZ + 0.04);
    inked(bar, 0.008, INK);
    root.add(bar);
  }
  const door = new THREE.Group();
  door.position.set(doorX - doorW / 2, 0, wallZ + 0.02);
  const leaf = mesh(new THREE.BoxGeometry(doorW, doorH, 0.04), toon(0x8a5a3c));
  leaf.position.set(doorW / 2, doorH / 2, 0);
  inked(leaf, 0.008, INK);
  door.add(leaf);
  for (const y of [0.3, 0.75]) {
    const panel = mesh(new THREE.BoxGeometry(doorW * 0.7, 0.3, 0.02), toon(0x7a4c31));
    panel.position.set(doorW / 2, y, 0.025);
    door.add(panel);
  }
  const knob = mesh(new THREE.SphereGeometry(0.025, 12, 8), toon(0xe9c46a));
  knob.position.set(doorW - 0.07, 0.5, 0.05);
  door.add(knob);
  root.add(door);

  // Mesa redonda con mantel.
  const table = new THREE.Group();
  table.name = "mesa";
  const top = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 32), toon(0x6b4430));
  top.position.y = 0.31;
  inked(top, T, INK);
  table.add(top);
  const cloth = mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.1, 32, 1, true), toon(0xf8f1e5, { side: THREE.DoubleSide }));
  cloth.position.y = 0.28;
  table.add(cloth);
  const clothTop = mesh(new THREE.CircleGeometry(0.36, 32), toon(0xf8f1e5));
  clothTop.rotation.x = -Math.PI / 2;
  clothTop.position.y = 0.327;
  table.add(clothTop);
  const leg = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 12), toon(0x5b3a29));
  leg.position.y = 0.15;
  table.add(leg);
  const foot = mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 20), toon(0x5b3a29));
  foot.position.y = 0.015;
  table.add(foot);
  root.add(table);

  // Sillas: él a la izquierda mirando a la derecha; ella al revés.
  const seatY = 0.19;
  const chair = (x: number, facing: number) => {
    const g = new THREE.Group();
    const wood = toon(0x7a4c31);
    const seat = mesh(roundedBox(0.26, 0.04, 0.26, 0.01), wood);
    seat.position.y = seatY;
    inked(seat, 0.008, INK);
    g.add(seat);
    const back = mesh(roundedBox(0.04, 0.34, 0.26, 0.01), wood);
    back.position.set(-0.12 * facing, seatY + 0.18, 0);
    inked(back, 0.008, INK);
    g.add(back);
    for (const [lx, lz] of [
      [-0.1, -0.1],
      [0.1, -0.1],
      [-0.1, 0.1],
      [0.1, 0.1],
    ]) {
      const l = mesh(new THREE.BoxGeometry(0.03, seatY, 0.03), wood);
      l.position.set(lx, seatY / 2, lz);
      g.add(l);
    }
    g.position.set(x, 0, 0);
    g.name = x < 0 ? "silla-el" : "silla-ella";
    root.add(g);
    return g;
  };
  chair(-CHAIR_X, 1);
  chair(CHAIR_X, -1);

  // Copas.
  const glass = () => {
    const g = new THREE.Group();
    const profile = [
      [0.0, 0],
      [0.035, 0],
      [0.035, 0.006],
      [0.006, 0.012],
      [0.006, 0.07],
      [0.03, 0.09],
      [0.038, 0.13],
      [0.034, 0.15],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const m = mesh(new THREE.LatheGeometry(profile, 16), toon(0xdfeef2, { transparent: true, opacity: 0.85 }));
    g.add(m);
    const wine = mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.035, 14), toon(0x8c1c2c));
    wine.position.y = 0.11;
    g.add(wine);
    return g;
  };
  const glassL = glass();
  glassL.position.set(-0.17, 0.33, 0.08);
  root.add(glassL);
  const glassR = glass();
  glassR.position.set(0.17, 0.33, 0.08);
  root.add(glassR);

  // Florero con flores.
  const vase = new THREE.Group();
  vase.name = "florero";
  const v = mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 14), toon(0x2a9d8f));
  v.position.y = 0.06;
  inked(v, 0.006, INK);
  vase.add(v);
  const petals = [0xe63946, 0xf4a261, 0xffffff, 0xe76f51, 0xf28482];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const stem = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4), toon(0x2d6a4f));
    stem.position.set(Math.cos(a) * 0.02, 0.17, Math.sin(a) * 0.02);
    stem.rotation.z = Math.cos(a) * 0.25;
    stem.rotation.x = -Math.sin(a) * 0.25;
    vase.add(stem);
    const flower = mesh(new THREE.IcosahedronGeometry(0.03, 0), toon(petals[i]));
    flower.position.set(Math.cos(a) * 0.05, 0.24 + (i % 2) * 0.02, Math.sin(a) * 0.05);
    inked(flower, 0.005, INK);
    vase.add(flower);
  }
  vase.position.set(0, 0.33, -0.17);
  root.add(vase);

  // Pastel con vela (solo de noche).
  const cake = new THREE.Group();
  cake.name = "pastel";
  const layer1 = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 24), toon(0xf6d7e0));
  layer1.position.y = 0.03;
  inked(layer1, 0.006, INK);
  cake.add(layer1);
  const layer2 = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 24), toon(0xffffff));
  layer2.position.y = 0.085;
  inked(layer2, 0.006, INK);
  cake.add(layer2);
  const cherry = mesh(new THREE.SphereGeometry(0.014, 10, 8), toon(0xc1121f));
  cherry.position.set(0.03, 0.12, 0.02);
  cake.add(cherry);
  const candle = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 8), toon(0x90e0ef));
  candle.position.y = 0.14;
  cake.add(candle);
  const candleFlame = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb703 }));
  candleFlame.scale.y = 1.8;
  candleFlame.position.y = 0.185;
  cake.add(candleFlame);
  cake.position.set(0, 0.33, 0.12);
  root.add(cake);
  night.push(cake);

  // Caja de regalo con moño.
  const gift = new THREE.Group();
  gift.name = "regalo";
  const box = mesh(roundedBox(0.2, 0.16, 0.2, 0.012), toon(0x7546ff));
  box.position.y = 0.08;
  inked(box, 0.008, INK);
  gift.add(box);
  const ribbonMat = toon(0x55e5de);
  const r1 = mesh(new THREE.BoxGeometry(0.205, 0.165, 0.04), ribbonMat);
  r1.position.y = 0.08;
  gift.add(r1);
  const r2 = mesh(new THREE.BoxGeometry(0.04, 0.165, 0.205), ribbonMat);
  r2.position.y = 0.08;
  gift.add(r2);
  for (const s of [-1, 1]) {
    const bow = mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12), ribbonMat);
    bow.position.set(s * 0.03, 0.18, 0);
    bow.rotation.set(0, Math.PI / 2, s * 0.6);
    gift.add(bow);
  }
  gift.visible = false;
  root.add(gift);

  // Celular (lo saca él bajo la mesa).
  const phone = new THREE.Group();
  const ph = mesh(roundedBox(0.06, 0.11, 0.012, 0.008), toon(0x222222));
  phone.add(ph);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.095), new THREE.MeshBasicMaterial({ color: 0x9ad1ff }));
  scr.position.z = 0.0065;
  phone.add(scr);
  phone.visible = false;
  root.add(phone);

  return {
    root,
    door,
    doorGlow,
    night,
    day,
    glassL,
    glassR,
    gift,
    phone,
    candleFlame,
    windowSky: skyMat,
    spots: {
      seatHusband: new THREE.Vector3(-CHAIR_X, seatY + 0.02, 0),
      seatWife: new THREE.Vector3(CHAIR_X, seatY + 0.02, 0),
      doorway: new THREE.Vector3(doorX + doorW / 2 - 0.1, 0, wallZ + 0.25),
    },
  };
}

/* --------------------------------------------------------------- texturas */

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Filtrado anisotrópico: el piso y la pared vistos en ángulo no titilan.
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  return tex;
}

function planksTexture() {
  return canvasTexture(
    256,
    256,
    (g) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? "#f0e6dc" : "#fbf5ef";
        g.fillRect(0, i * 32, 256, 30);
        g.fillStyle = "#c9b8a6";
        g.fillRect(0, i * 32 + 30, 256, 2);
        g.fillRect(((i * 97) % 200) + 20, i * 32, 2, 30);
      }
    },
    [6, 4],
  );
}

function wallpaperTexture() {
  return canvasTexture(
    128,
    128,
    (g) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = "#eadfcb";
      for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 14, 128);
      g.fillStyle = "#d9c7a7";
      for (let y = 16; y < 128; y += 32)
        for (let x = 23; x < 128; x += 32) {
          g.beginPath();
          g.arc(x, y, 3, 0, Math.PI * 2);
          g.fill();
        }
    },
    [18, 6],
  );
}

function heartPictureTexture() {
  return canvasTexture(256, 170, (g) => {
    g.fillStyle = "#f4e3c1";
    g.fillRect(0, 0, 256, 170);
    g.fillStyle = "#c1121f";
    const x = 128;
    const y = 80;
    const s = 46;
    g.beginPath();
    g.moveTo(x, y + s * 0.9);
    g.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
    g.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.9);
    g.fill();
  });
}

/* ------------------------------------------------------------ calcomanías */

/** Sprite 2D dibujado en un lienzo (corazón, gota, signo, destello). */
export function stickerSprite(kind: "heart" | "sweat" | "question" | "sparkle" | "exclaim", size: number): THREE.Sprite {
  const tex = canvasTexture(128, 128, (g) => {
    g.lineJoin = "round";
    g.lineCap = "round";
    const ink = "#16110f";
    if (kind === "heart") {
      g.fillStyle = "#e63946";
      g.strokeStyle = ink;
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(64, 108);
      g.bezierCurveTo(4, 64, 22, 14, 64, 40);
      g.bezierCurveTo(106, 14, 124, 64, 64, 108);
      g.fill();
      g.stroke();
    } else if (kind === "sweat") {
      g.fillStyle = "#8ecae6";
      g.strokeStyle = ink;
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(64, 14);
      g.bezierCurveTo(64, 14, 104, 70, 96, 88);
      g.arc(64, 84, 32, 0.1, Math.PI - 0.1);
      g.bezierCurveTo(24, 70, 64, 14, 64, 14);
      g.fill();
      g.stroke();
    } else if (kind === "question" || kind === "exclaim") {
      g.font = "900 110px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineWidth = 12;
      g.strokeStyle = "#ffffff";
      g.strokeText(kind === "question" ? "?" : "!", 64, 70);
      g.fillStyle = ink;
      g.fillText(kind === "question" ? "?" : "!", 64, 70);
    } else {
      g.fillStyle = "#ffffff";
      g.strokeStyle = "#ffd166";
      g.lineWidth = 5;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 ? 18 : 58;
        g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.stroke();
    }
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.setScalar(size);
  sprite.layers.set(1);
  sprite.renderOrder = 5;
  return sprite;
}
