import * as THREE from "three";

/**
 * Posproceso del sketch, en una pasada sobre dos renders (color+profundidad y normales):
 *
 *  - tinta: contornos negros detectando saltos de profundidad y de normales;
 *  - cine mudo (uSilent): sepia/blanco y negro, grano, rayas, polvo, viñeta, parpadeo;
 *  - cuadro 4:3 (uPillar) que se abre a 16:9;
 *  - color de 2010 (uReveal): un círculo que nace en uRevealAt y cubre la imagen;
 *  - recuerdo (uMemory): tono lila con borde de nube;
 *  - destello (uFlash) y fundido a negro (uFade).
 */
export class FilmPass {
  readonly color: THREE.WebGLRenderTarget;
  readonly normals: THREE.WebGLRenderTarget;
  readonly uniforms = {
    tColor: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    tNormal: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
    uNear: { value: 0.1 },
    uFar: { value: 30 },
    uTime: { value: 0 },
    uSilent: { value: 1 },
    uPillar: { value: 1 },
    uReveal: { value: 0 },
    uRevealAt: { value: new THREE.Vector2(0.75, 0.45) },
    uMemory: { value: 0 },
    uFlash: { value: 0 },
    uFade: { value: 0 },
    uInk: { value: 1 },
  };
  private readonly quad: THREE.Mesh;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly normalMaterial = new THREE.MeshNormalMaterial();

  constructor(width = 1920, height = 1080) {
    const depth = new THREE.DepthTexture(width, height);
    depth.type = THREE.UnsignedIntType;
    this.color = new THREE.WebGLRenderTarget(width, height, { depthTexture: depth, samples: 0 });
    this.color.texture.colorSpace = THREE.SRGBColorSpace;
    this.normals = new THREE.WebGLRenderTarget(width, height);
    this.uniforms.tColor.value = this.color.texture;
    this.uniforms.tDepth.value = depth;
    this.uniforms.tNormal.value = this.normals.texture;
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false }),
    );
    this.scene.add(this.quad);
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.uniforms.uNear.value = camera.near;
    this.uniforms.uFar.value = camera.far;
    const layers = camera.layers.mask;

    // 1) Color (todas las capas: personajes, utilería, caras y calcomanías).
    camera.layers.enableAll();
    renderer.setRenderTarget(this.color);
    renderer.clear();
    renderer.render(scene, camera);

    // 2) Normales solo de la geometría (capa 0): de ahí salen los contornos.
    camera.layers.set(0);
    const bg = scene.background;
    scene.background = null;
    scene.overrideMaterial = this.normalMaterial;
    renderer.setRenderTarget(this.normals);
    renderer.setClearColor(0x8080ff, 1);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    scene.background = bg;
    renderer.setClearColor(0x000000, 0);
    camera.layers.mask = layers;

    // 3) Composición en pantalla.
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.color.depthTexture?.dispose();
    this.color.dispose();
    this.normals.dispose();
    this.normalMaterial.dispose();
    (this.quad.material as THREE.Material).dispose();
    this.quad.geometry.dispose();
  }
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2 uResolution;
uniform float uNear, uFar, uTime, uSilent, uPillar, uReveal, uMemory, uFlash, uFade, uInk;
uniform vec2 uRevealAt;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float depthAt(vec2 uv) {
  float z = texture2D(tDepth, uv).x;
  return perspectiveDepthToViewZ(z, uNear, uFar);
}

void main() {
  vec2 uv = vUv;
  float silentT = floor(uTime * 18.0) / 18.0;          // el proyector va a 18 cuadros por segundo

  // Cuadro 4:3 que se abre a 16:9 (1440 de 1920 px).
  float half4x3 = 0.375;
  float halfW = mix(0.5, half4x3, uPillar);
  float inFrame = step(abs(uv.x - 0.5), halfW);

  // Vaivén del proyector durante el cine mudo.
  vec2 jitter = vec2(0.0, (hash(vec2(silentT, 1.0)) - 0.5) * 0.004) * uSilent;
  vec2 suv = uv + jitter;

  vec3 col = texture2D(tColor, suv).rgb;

  // Tinta: bordes por profundidad y por normales.
  vec2 px = 1.0 / uResolution * 1.6;
  float dC = depthAt(suv);
  float dd = 0.0;
  vec3 nC = texture2D(tNormal, suv).rgb;
  float nd = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = i == 0 ? vec2(px.x, 0.0) : i == 1 ? vec2(-px.x, 0.0) : i == 2 ? vec2(0.0, px.y) : vec2(0.0, -px.y);
    dd += abs(depthAt(suv + o) - dC);
    nd += distance(texture2D(tNormal, suv + o).rgb, nC);
  }
  float edge = max(smoothstep(0.04, 0.12, dd / max(0.4, -dC * 0.35)), smoothstep(0.35, 0.8, nd));
  col = mix(col, vec3(0.06, 0.045, 0.04), edge * uInk * 0.92);

  // Color de 2010: más saturado, cálido y con un leve resplandor.
  vec3 modern = col;
  float lum = dot(modern, vec3(0.299, 0.587, 0.114));
  modern = mix(vec3(lum), modern, 0.92);
  modern *= vec3(1.03, 1.0, 0.97);
  modern = pow(modern, vec3(0.97));

  // Cine mudo: sepia, contraste, grano, parpadeo, rayas y polvo.
  float g = dot(col, vec3(0.299, 0.587, 0.114));
  g = smoothstep(0.02, 0.98, g * 1.08);
  vec3 sepia = mix(vec3(g), vec3(g) * vec3(1.07, 0.96, 0.78), 0.75);
  float flicker = 1.0 + (hash(vec2(silentT, 7.0)) - 0.5) * 0.12;
  sepia *= flicker;
  sepia += (hash(uv * uResolution + silentT * 91.0) - 0.5) * 0.11;
  float scratchX = hash(vec2(floor(silentT * 3.0), 3.0));
  float scratch = smoothstep(0.0015, 0.0, abs(uv.x - scratchX)) * step(0.55, hash(vec2(silentT, 9.0)));
  sepia = mix(sepia, vec3(0.92, 0.86, 0.72), scratch * 0.6);
  float dust = step(0.9985, hash(floor(uv * vec2(320.0, 180.0)) + silentT));
  sepia = mix(sepia, vec3(0.08), dust);
  vec2 vc = (uv - 0.5) * vec2(1.0 / (halfW * 2.0), 1.0);
  sepia *= 1.0 - smoothstep(0.35, 0.78, length(vc)) * 0.55;

  // El color invade desde la puerta (uRevealAt) con borde orgánico.
  vec2 ar = vec2(uResolution.x / uResolution.y, 1.0);
  float r = length((uv - uRevealAt) * ar);
  float wobble = (noise(uv * 9.0 + uTime) - 0.5) * 0.12;
  float colorMask = 1.0 - smoothstep(uReveal - 0.06, uReveal + 0.06, r + wobble);
  colorMask = max(colorMask, step(0.999, uReveal * 0.33));
  float silentMask = uSilent * (1.0 - colorMask);
  vec3 outCol = mix(modern, sepia, silentMask);
  // Halo cálido en el frente del color.
  float front = smoothstep(0.08, 0.0, abs(r + wobble - uReveal)) * step(0.01, uReveal) * uSilent;
  outCol += vec3(1.0, 0.62, 0.35) * front * 0.35;

  // Recuerdo: lila, más claro y con borde de nube.
  vec3 memory = mix(outCol, vec3(dot(outCol, vec3(0.3, 0.59, 0.11))) * vec3(0.95, 0.85, 1.12) + 0.08, 0.55);
  float cloud = smoothstep(0.62, 0.42, length((uv - 0.5) * ar * vec2(0.72, 1.0)) + (noise(uv * 7.0 + uTime * 0.3) - 0.5) * 0.12);
  memory = mix(vec3(0.93, 0.88, 1.0), memory, cloud);
  outCol = mix(outCol, memory, uMemory);

  outCol = mix(outCol, vec3(1.0), uFlash);
  outCol = mix(outCol, vec3(0.0), uFade);
  outCol *= inFrame;
  gl_FragColor = vec4(outCol, 1.0);
}
`;
