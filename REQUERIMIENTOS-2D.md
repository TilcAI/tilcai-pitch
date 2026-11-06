# Requerimientos: personajes 2D riggeados para el pitch de Tilcai

Alternativa al 3D (ver `REQUERIMIENTOS-3D.md`). Estilo objetivo: personaje vectorial plano tipo mascota de tinta (siluetas sólidas, pocos colores, partes separables: brazo, cabeza, sombrero, ojos, cuerpo, pies).

> Nota legal: el personaje de la imagen de referencia lleva ® (marca registrada). Sirve como **referencia de estilo**, pero no se debe usar ni redibujar tal cual en el producto. Hay que crear un personaje propio o usar uno con licencia.

---

## 1. Sí existen: las 4 tecnologías de rig 2D

"Rig 2D" = personaje partido en piezas (o malla deformable) con huesos y clips de animación, reproducido en runtime.

| Tecnología | Cómo funciona | Runtime web | Costo / licencia | Ideal para |
|---|---|---|---|---|
| **Rive** | Editor visual con huesos, mallas, state machines, interactividad | `@rive-app/react-canvas` (o `-webgl2`) | Editor gratis con límites; runtime MIT | **Mejor opción general para React**: archivos `.riv` de pocos KB, state machines (idle → saludar → señalar) |
| **Spine** | Estándar de la industria; huesos, mallas, IK, skins | `@esotericsoftware/spine-webgl` / `spine-canvas` / `spine-player` | Editor de pago (licencia Essential/Pro); el runtime exige licencia de Spine | Animación compleja y de alta calidad |
| **DragonBones** | Similar a Spine, gratis | `pixi-dragonbones-runtime` o runtime oficial | Gratis, pero **sin mantenimiento** | Presupuesto cero, aceptando riesgo |
| **Lottie** (After Effects/Bodymovin) | Animación vectorial exportada a JSON; no es rig interactivo, son clips fijos | `lottie-web` / `@lottiefiles/dotlottie-react` | Runtime MIT | Clips pre-hechos con loop (no se controla por hueso) |
| **SVG + anime.js (rig manual)** | Personaje en SVG con cada parte en un `<g>`; anime.js rota/mueve cada pieza sobre su pivote | Solo `animejs` (ya está en el stack) | Gratis | **Encaja con el pitch actual**: mismo anime.js, cero dependencias nuevas |
| Live2D | Deformación de ilustración (estilo anime) | `pixi-live2d-display` | Licencia comercial | No encaja con este estilo |

### Recomendación

1. **Para el estilo de la referencia (plano, blanco/negro, piezas rígidas): SVG + anime.js.** Cada pieza es un `<g>` con `transform-origin` en su articulación (hombro, cuello, cadera). Animas rotación/traslación/escala con `createTimeline`, igual que ya haces con el resto del deck. Sin runtime extra, sincroniza nativo con los slides.
2. **Si quieres editor visual, state machines y que un diseñador anime sin código: Rive.** Se integra con React en pocas líneas y se dispara desde el deck.
3. Spine solo si necesitas deformación de malla avanzada y aceptas pagar licencia.

## 2. Qué debe tener el personaje

### Para SVG + anime.js
- **Un SVG por personaje, con capas nombradas por id**: `torso`, `cabeza`, `sombrero`, `ojo-izq`, `ojo-der`, `brazo-der`, `mano`, `pierna-izq`, `pie-izq`, etc.
- **Cada articulación como grupo anidado** (jerarquía = huesos): `torso > cuello > cabeza > sombrero`; `torso > hombro > brazo > mano`. Así rotar el padre mueve los hijos.
- **Pivotes definidos**: `transform-box: fill-box; transform-origin: <x> <y>` (o centrar el pivote con un `<g>` trasladado).
- **Estados alternos para expresiones**: ojos abiertos/cerrados, boca A/E/O, mano abierta/señalando (grupos que se muestran/ocultan).
- **Formas cerradas, rellenos y trazos sin efectos raros** (evitar filtros pesados, máscaras complejas).
- Tamaño de lienzo uniforme, por ejemplo `viewBox="0 0 400 800"`.

### Para Rive / Spine
- **Capas separadas en PSD/SVG/PNG** (una por parte), sin fusionar.
- Para Spine/DragonBones: atlas de texturas (PNG) + JSON/`.skel` + `.atlas`.
- Para Rive: archivo `.riv` con huesos, **animaciones nombradas** (`idle`, `wave`, `point`, `talk`) y una **state machine** con inputs (`isTalking`, `trigger point`).

### Clips mínimos
`idle` (respiración/parpadeo), `entrar`, `señalar`, `hablar`, `celebrar`, `salir`.

## 3. Qué se necesita para animar (técnica)

### SVG + anime.js
- Insertar el SVG inline en React (componente que devuelva el `<svg>`) para poder apuntar a sus ids.
- `createTimeline()` por slide; targets por selector o ref (`#brazo-der`).
- Animar: `rotate`, `translateX/Y`, `scale`, `opacity`; `ease: "inOutQuad"` / `outElastic` para rebotes.
- Loops de idle con `loop: true, alternate: true`; parpadeo con timeline corto cada N segundos.
- Limpieza: `pause()` / `revert()` al salir del slide.
- Opcional: `animejs` v4 trae utilidades para dibujo de trazos (`svg.createDrawable`) como el efecto de "dibujar" que ya usa `draw.ts` en optipagos.

### Rive
- `npm i @rive-app/react-canvas`; `useRive({ src, stateMachines })`, `useStateMachineInput` para disparar acciones desde el deck.
- Archivos `.riv` en `public/`.

## 4. Dónde conseguirlos

Las URLs no están verificadas; revisa la licencia de cada archivo.

| Fuente | Qué hay | Licencia típica |
|---|---|---|
| **Rive Marketplace / Community** — `https://rive.app/community` (filtra *Free*, buscar "character", "mascot") | Personajes `.riv` riggeados con state machines | Varía; muchos CC0/CC-BY, revisar |
| **LottieFiles** — `https://lottiefiles.com/search?q=character&category=animations&type=free` | Clips Lottie de personajes (no riggeados, son animaciones fijas) | Lottie Simple License / varía |
| **itch.io** — `https://itch.io/game-assets/free/tag-2d/tag-spine` y `https://itch.io/game-assets/free/tag-2d/tag-rigged` | Packs 2D con Spine/DragonBones/PSD por capas | Varía por pack |
| **OpenGameArt** — `https://opengameart.org/art-search-advanced?keys=spine+skeleton` (con 2D Art) | Personajes con huesos/spritesheets | Varía (CC0/CC-BY) |
| **CraftPix** — `https://craftpix.net/freebies/` (buscar "Spine" / "rigged") | Personajes con `.json`/`.skel` de Spine | Licencia propia de CraftPix |
| **Spine samples** — `https://esotericsoftware.com/spine-examples` | Ejemplos oficiales (personajes, jefes) | Solo para evaluar; no reusar libremente |
| **Mixamo → sprite** | No es 2D, pero se puede renderizar a sprites; no recomendado para este estilo | — |
| **Crear propio (recomendado)** | Dibujar en Figma/Illustrator/Inkscape/Affinity Designer (vector) con capas por pieza → exportar SVG | Propia |

Para **un personaje de estilo propio como el de la referencia**, lo más realista es **dibujarlo vectorial por piezas** (o encargarlo a un ilustrador pidiendo "SVG con capas separadas y nombradas por articulación"), y animarlo con anime.js. Los packs gratuitos riggeados rara vez tienen este look de mascota monocromática.

## 4.1 Alternativa con IA
Generar el personaje y sus partes con un modelo de imágenes, **vectorizar** (Illustrator Image Trace, Inkscape Trace Bitmap, vectorizer.ai) y separar en capas a mano. Requiere limpieza, pero permite un personaje único.

## 5. Estructura propuesta

```
public/characters/       # .riv / SVG / atlas
src/characters/
  Mascota.tsx            # SVG inline con ids por pieza (o wrapper Rive)
  mascota.timelines.ts   # funciones: entrar(), señalar(), hablar(), salir()
src/pitch/
  Deck.tsx / Slide.tsx   # patrón optipagos; cada slide llama su timeline
```

## 6. Checklist de entrega por personaje

- [ ] Piezas separadas y nombradas por articulación
- [ ] Jerarquía padre→hijo (hueso) correcta; pivotes definidos
- [ ] Estados de expresión (ojos, boca, mano)
- [ ] Clips mínimos: `idle`, `entrar`, `señalar`, `hablar`, `salir`
- [ ] Licencia anotada en `public/characters/LICENSES.md`
- [ ] Peso < 100 KB (SVG optimizado con SVGO) o `.riv` < 200 KB
- [ ] Respeta `prefers-reduced-motion` (pose estática)

## 7. 2D vs 3D (cuándo elegir cada uno)

| | 2D (SVG/Rive) | 3D (three + glTF) |
|---|---|---|
| Peso | Muy bajo | Medio (modelo + three) |
| Look de la referencia (tinta plana) | **Natural** | Requiere toon + outline |
| Cámara/rotación | No | Sí |
| Coste de producción | Dibujar piezas | Modelar/riggear o descargar |
| Rendimiento móvil | Excelente | Bueno si se optimiza |

## 8. Próximos pasos

1. Decidir: personaje propio (dibujar/encargar) vs pack con licencia.
2. Prototipo mínimo: SVG de 5 piezas (cuerpo, cabeza, brazo, mano, pie) animado con un timeline de anime.js (levantar brazo, señalar).
3. Si el prototipo convence, escalar a más poses/expresiones; si se necesita editor visual, migrar a Rive.
