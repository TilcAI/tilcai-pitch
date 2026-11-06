# Requerimientos: animaciones 3D lowpoly para el pitch de Tilcai

Referencia: `optipagos-frontend/components/pitch/` (optipagos.optus.lat/pitch).
Ahí el 3D es **procedural** (`phones.ts`: geometrías creadas en código, `MeshToonMaterial` con `gradientMap`, contorno con una malla `BackSide`) y **anime.js v4** (`animate`, `createTimeline`) mueve cámara/objetos por slide. Este documento cubre el caso distinto: **modelos externos ya riggeados** (personajes/objetos con esqueleto).

---

## 1. Stack técnico

| Pieza | Versión / detalle |
|---|---|
| `three` | ^0.186 (igual que optipagos) + `@types/three` |
| `animejs` | ^4.5 (timeline para coreografía, cámara, props) |
| React | 19 (canvas montado en un componente cliente; `useEffect` crea/destruye el renderer) |
| Loaders (vienen con three) | `three/examples/jsm/loaders/GLTFLoader.js`, `DRACOLoader.js` (opcional), `utils/SkeletonUtils.js` (clonar modelos riggeados) |
| Herramientas opcionales | `gltf-transform` (optimizar/comprimir), `gltfjsx` (generar componente), Blender (retocar rig/clips) |

Si el proyecto es Next.js: el componente del canvas debe ser `"use client"` y cargarse con `dynamic(..., { ssr: false })`.

## 2. Qué tipo de modelo se necesita

**Formato: glTF 2.0 binario (`.glb`)**. Es el estándar de three; FBX/OBJ/Collada funcionan pero pesan más y son más frágiles.

Requisitos del modelo:

1. **Rig (armature/skin)** con huesos exportados como `SkinnedMesh`. Humanoide si se quiere reutilizar animaciones entre personajes.
2. **Animation clips incluidos** en el `.glb` (idle, walk, wave, talk, point, celebrate…). Three los expone en `gltf.animations` y se reproducen con `AnimationMixer`.
3. **Lowpoly**: ideal < 5 000 triángulos por personaje, < 20 000 por escena. Flat shading o colores sólidos/paleta de textura pequeña.
4. **Texturas mínimas**: colores por vértice, o una sola paleta (≤ 512×512). Evita PBR pesado; el look del pitch es toon/flat.
5. **Escala y orientación**: 1 unidad = 1 m, +Y arriba, origen en los pies, transformaciones aplicadas (Apply All Transforms en Blender).
6. **Licencia comercial** (ver §4): CC0 o CC-BY (con atribución).
7. *(Opcional)* **Shape keys / morph targets** para expresiones faciales o boca.

Qué conviene según la escena del pitch:

| Necesidad | Tipo de modelo |
|---|---|
| Personas (usuario, cliente, comerciante) | Personajes humanoides lowpoly riggeados con idle/walk/wave |
| Animales / mascotas | Animales lowpoly riggeados |
| Productos (celular, tarjeta, caja, moneda) | Props **sin rig**; se animan con anime.js (posición/rotación/escala) |
| Escenario (ciudad, tienda, mercado) | Kit de props/edificios lowpoly estáticos (`InstancedMesh` si se repiten) |

## 3. Qué se necesita para animar (técnica)

### 3.1 Animación esquelética (clips del modelo)
- `AnimationMixer(model)` por personaje, `mixer.clipAction(clip)`; **`mixer.update(delta)` en cada frame** del loop.
- Transiciones entre clips con `fadeIn/fadeOut` o `crossFadeTo` (0.2–0.4 s).
- Varios personajes iguales: clonar con `SkeletonUtils.clone(gltf.scene)` (un `.clone()` normal rompe el skinning).
- Retargeting entre rigs distintos: solo si comparten nombres de huesos (Mixamo-style); si no, usar clips del propio modelo.

### 3.2 Coreografía con anime.js (lo que ya hace optipagos)
- anime.js **no** reproduce clips: mueve **propiedades**. Animar `position`, `rotation`, `scale`, `camera.position`, `material.opacity`, pasando el objeto three como target.
- Un `createTimeline()` por slide: entra el personaje, cambia el clip del mixer en un `call()`/callback, se mueve la cámara, aparecen props.
- Sincronizar con el deck: `Deck.tsx` (en optipagos) dispara el timeline del slide; al salir del slide, `pause()` + `revert()` y liberar.
- Para scrub/sync determinista: controlar `mixer.setTime()` desde el progreso del timeline en vez de dejarlo correr libre.

### 3.3 Render y look
- `WebGLRenderer({ alpha: true, antialias: true })`, `outputColorSpace = SRGBColorSpace`, `setPixelRatio(min(devicePixelRatio, 2))`.
- Luces: `HemisphereLight` + `DirectionalLight` (como `phones.ts`). Sin sombras o con una sola sombra suave.
- Estilo: reemplazar materiales por `MeshToonMaterial` + `gradientMap` de 3 tonos y contorno (malla duplicada `BackSide`, escalada). En `SkinnedMesh` el contorno debe compartir el mismo skeleton (usar `SkinnedMesh` con `bind` al mismo esqueleto) o usar post-proceso de outline.
- Cámara: `PerspectiveCamera` fija, animada por timeline.
- Loop con `requestAnimationFrame` (o `renderer.setAnimationLoop`); pausar cuando el slide/pestaña no está visible.

### 3.4 Rendimiento y ciclo de vida
- Cargar `.glb` una vez (caché), precargar el siguiente slide.
- Comprimir con `gltf-transform optimize` (Draco/Meshopt, quantize, dedup). Meta: < 1 MB por personaje.
- `dispose()` de geometrías, materiales, texturas y `renderer.dispose()` al desmontar.
- Un solo `WebGLRenderer` compartido para todo el deck; evitar un canvas por slide.
- Fallback: si `prefers-reduced-motion`, mostrar pose estática.

## 4. Dónde conseguir los modelos

Gratis / licencia permisiva (verificar licencia de cada archivo; CC0 no requiere atribución, CC-BY sí):

| Fuente | Qué hay | Licencia típica |
|---|---|---|
| **Quaternius** (quaternius.com) | Packs lowpoly riggeados y animados: personajes, animales, ciudad, fantasía, sci-fi. **Mejor primera opción.** | CC0 |
| **Kenney** (kenney.nl) | Kits estáticos y algunos personajes lowpoly; props, ciudad, UI | CC0 |
| **Poly Pizza** (poly.pizza) | Miles de modelos lowpoly (ex Google Poly), descarga `.glb` | CC0 / CC-BY |
| **Mixamo** (mixamo.com) | Subir/elegir personaje y bajar **animaciones** (rig humanoide estándar), FBX → convertir a GLB en Blender | Gratis con cuenta Adobe, uso comercial permitido; no redistribuir como asset suelto |
| **Sketchfab** (filtro: Downloadable + lowpoly + Animated) | Gran variedad; descargar glTF | Varía por modelo (revisar) |
| **itch.io** (assets 3D lowpoly) | Packs de artistas independientes | Varía |
| **OpenGameArt** | Modelos y animaciones | Varía (CC0/CC-BY) |
| **Blender** (propio) | Crear/riggear/animar; exportar glTF con "Animation" y "Skinning" activados | Propia |

Alternativa si no hay modelo: generar rig propio en Blender con **Rigify**, o usar IA de modelado 3D (Meshy, Tripo) y luego riggear en Mixamo/Blender (requiere limpieza de topología).

Recomendación de arranque: **Quaternius** (personajes/animales/props riggeados en `.glb` y CC0) + **Mixamo** si hace falta una animación específica.

## 5. Estructura propuesta del repo

```
public/models/          # .glb optimizados (personajes, props)
src/three/
  Stage.ts              # renderer, escena, luces, cámara, loop, dispose
  loadModel.ts          # GLTFLoader + caché + SkeletonUtils.clone
  toon.ts               # toonRamp(), outline(), aplicar material toon
  Actor.ts              # modelo + AnimationMixer + play(clip, fade)
src/pitch/
  Deck.tsx / Slide.tsx  # navegación de slides (patrón optipagos)
  timelines/slideN.ts   # createTimeline de anime.js por slide
```

## 6. Checklist de entrega por modelo

- [ ] Formato `.glb`, licencia anotada en `public/models/LICENSES.md`
- [ ] Tiene `SkinnedMesh` y `gltf.animations` (verificar con gltf.report o en consola)
- [ ] < 5k tris, < 1 MB tras optimizar
- [ ] Escala 1 m, origen en pies, +Y arriba
- [ ] Clips mínimos: `idle` y al menos uno de acción (`wave`/`talk`/`walk`)
- [ ] Se ve bien con `MeshToonMaterial` (sin depender de texturas PBR)

## 7. Próximos pasos

1. Definir el guion del pitch: qué slides llevan 3D y qué personajes/props/acciones aparecen en cada una.
2. Descargar 1–2 packs de Quaternius y probar un personaje en una escena mínima.
3. Montar `Stage` + `Actor` + un timeline de anime.js para un slide piloto.
4. Replicar el patrón `Deck`/`Slide` de optipagos y escalar al resto.
