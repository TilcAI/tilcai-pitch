import * as THREE from "three";
import { BRAND, roundedPlane, roundedRect, toon } from "../toon";

/**
 * Teléfono hecho con geometría (adaptado del pitch de Optipagos): cuerpo biselado, contorno,
 * vidrio y una pantalla que muestra un video. Mira hacia +Z.
 */
export interface PhoneSpec {
  screenAspect: number;
  screenHeight: number;
  bezel: number;
  radius: number;
  screenRadius: number;
  depth: number;
  color: number;
  edge: number;
  island: boolean;
}

export interface Phone {
  group: THREE.Group;
  screen: THREE.MeshBasicMaterial;
  height: number;
}

export function buildPhone(spec: PhoneSpec): Phone {
  const sh = spec.screenHeight;
  const sw = sh * spec.screenAspect;
  const bw = sw + spec.bezel * 2 + 0.05;
  const bh = sh + spec.bezel * 2 + 0.05;
  const group = new THREE.Group();

  const body = new THREE.Mesh(roundedSlab(bw, bh, spec.depth, spec.radius), toon(spec.color));
  group.add(body);

  // Canto luminoso: la misma forma un poco más grande, vista por dentro.
  const edge = new THREE.Mesh(
    roundedSlab(bw + 0.05, bh + 0.05, spec.depth + 0.04, spec.radius + 0.025),
    new THREE.MeshBasicMaterial({ color: spec.edge, side: THREE.BackSide }),
  );
  group.add(edge);

  const front = spec.depth / 2 + 0.031;
  const glass = new THREE.Mesh(
    roundedPlane(sw + spec.bezel * 2, sh + spec.bezel * 2, spec.screenRadius + spec.bezel),
    new THREE.MeshBasicMaterial({ color: 0x05040c }),
  );
  glass.position.z = front;
  group.add(glass);

  const screen = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const display = new THREE.Mesh(roundedPlane(sw, sh, spec.screenRadius), screen);
  display.position.z = front + 0.002;
  group.add(display);

  if (spec.island) {
    const pill = new THREE.Mesh(roundedPlane(0.28, 0.07, 0.035), new THREE.MeshBasicMaterial({ color: 0x020205 }));
    pill.position.set(0, sh / 2 - 0.07, front + 0.004);
    group.add(pill);
  } else {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), new THREE.MeshBasicMaterial({ color: 0x020205 }));
    hole.position.set(0, sh / 2 - 0.05, front + 0.004);
    group.add(hole);
  }

  const button = (x: number, y: number, h: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, h, spec.depth * 0.5), toon(BRAND.noche));
    m.position.set(x, y, 0);
    group.add(m);
  };
  button(bw / 2 + 0.03, sh * 0.18, 0.28);
  button(-bw / 2 - 0.03, sh * 0.25, 0.18);
  button(-bw / 2 - 0.03, sh * 0.08, 0.18);

  return { group, screen, height: bh };
}

/** Cuerpo: rectángulo redondeado con los bordes biselados. */
function roundedSlab(w: number, h: number, depth: number, r: number): THREE.BufferGeometry {
  const bevel = depth * 0.45;
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, Math.max(0.01, r - bevel)), {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 10,
  });
  geo.center();
  return geo;
}

export function makeVideo(src: string): HTMLVideoElement {
  const video = document.createElement("video");
  video.src = src;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  return video;
}

export function videoTexture(video: HTMLVideoElement): THREE.VideoTexture {
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
