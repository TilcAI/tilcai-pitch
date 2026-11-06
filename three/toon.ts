import * as THREE from "three";

/** Colores de la guía de marca de TilcAI. */
export const BRAND = {
  noche: 0x090618,
  violeta: 0x7546ff,
  lila: 0xc779ff,
  cian: 0x55e5de,
  blanco: 0xf3eff9,
} as const;

/** Naranja de Clawd. */
export const CLAWD = 0xd97757;

const ramps = new Map<number, THREE.DataTexture>();

/** Rampa de luz en pocos tonos, como un dibujo coloreado. */
export function toonRamp(steps = 3): THREE.DataTexture {
  const cached = ramps.get(steps);
  if (cached) return cached;
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = Math.round(105 + (150 * i) / Math.max(1, steps - 1));
    data.set([v, v, v, 255], i * 4);
  }
  const ramp = new THREE.DataTexture(data, steps, 1);
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  ramps.set(steps, ramp);
  return ramp;
}

export function toon(color: number, extra: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...extra });
}

/** Malla con sombras proyectadas y recibidas. */
export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, name?: string): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  if (name) m.name = name;
  return m;
}

/**
 * Contorno de tinta: la misma forma, un poco más grande y vista por dentro. Se agranda
 * desde el centro de la caja, así sirve para cajas y extrusiones centradas o no.
 */
export function inked(target: THREE.Mesh, thickness: number, color: number = BRAND.noche): THREE.Mesh {
  const geo = target.geometry;
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const outline = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  const sx = (size.x + thickness * 2) / Math.max(size.x, 1e-4);
  const sy = (size.y + thickness * 2) / Math.max(size.y, 1e-4);
  const sz = (size.z + thickness * 2) / Math.max(size.z, 1e-4);
  outline.scale.set(sx, sy, sz);
  outline.position.set(center.x * (1 - sx), center.y * (1 - sy), center.z * (1 - sz));
  outline.name = `${target.name || "mesh"}-ink`;
  outline.userData.ink = true;
  target.add(outline);
  return target;
}

/** Caja con bordes redondeados (extrusión biselada), centrada en el origen. */
export function roundedBox(w: number, h: number, d: number, r: number, segments = 3): THREE.BufferGeometry {
  const rr = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const shape = roundedRect(w - rr * 2, h - rr * 2, Math.max(0.001, rr * 0.5));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, d - rr * 2),
    bevelEnabled: true,
    bevelThickness: rr,
    bevelSize: rr,
    bevelSegments: segments,
    curveSegments: 6,
  });
  geo.center();
  return geo;
}

export function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/** Plano redondeado con UV de 0 a 1 (pantallas con video). */
export function roundedPlane(w: number, h: number, r: number): THREE.BufferGeometry {
  const geo = new THREE.ShapeGeometry(roundedRect(w, h, r), 12);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Interpolación suave entre 0 y 1. */
export const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export function disposeTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}
