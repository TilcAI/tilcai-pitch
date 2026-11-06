# TilcAI · pitch

Pitch animado para el jurado (16:9, 1920 × 1080 escalado a la pantalla). Next.js 16, three.js y anime.js, con el formato del pitch de Optipagos y la guía de marca de TilcAI (noche, violeta, lila, cian; Anton y Plus Jakarta Sans).

```sh
npm install
npm run dev          # escucha en 0.0.0.0:3100 (local y Tailscale)
npm run urls         # muestra las direcciones de Tailscale
```

**Tailscale:** abre `http://100.123.247.22:3100/` (pitch) y `http://100.123.247.22:3100/notas` (guion) desde cualquier equipo de la tailnet. Si el guion está en otro dispositivo (p. ej. un teléfono), se sincroniza y controla el pitch por el relé `/api/sync` (estado en memoria del servidor); en el mismo navegador sigue usando BroadcastChannel. La etiqueta «local / red» en `/notas` indica cuál usa. Para el día del pitch, mejor `npm run build && npm start`.

| Ruta | Qué es |
| --- | --- |
| `/` | La presentación. → avanzar, ← volver, F pantalla completa, P abre la ventana del guion, N notas en pantalla, A automático, T reiniciar tiempo, H ocultar barra. |
| `/notas` | Guion sincronizado (BroadcastChannel, mismo navegador). En el sketch resalta la escena y la línea actuales, con cuenta regresiva para la siguiente voz; también controla el pitch. |
| `/?s=2` | Empieza en la diapositiva 2 (portada de TilcAI, después del corte). El sketch es la 1 (0:00–1:18) y la 11 (1:18–1:30). |
| `/?t=38&hold` | El sketch congelado en el segundo 38 (revisar una escena). Añadir `&clean` quita la barra y la ayuda. |
| `/?auto` | Avanza solo con los tiempos del guion (ensayo). |

En el sketch: **espacio** pausa, **→ / ←** saltan de escena y **S** muestra u oculta los subtítulos.

## Dónde está cada cosa

| Archivo | Contenido |
| --- | --- |
| `content/deck.ts` | Texto de las 11 diapositivas y guion del presentador. `[[ ]]` = por confirmar. |
| `content/sketch.ts` | Guion del sketch con tiempos. Mueve **a la vez** la animación 3D, los carteles y la vista `/notas`. |
| `guion_el_aniversario_olvidado.md` | Guion v2 legible, con los cambios respecto a la v1. |
| `three/acts/sketch.ts` | Coreografía del sketch: una línea de tiempo de anime.js en pausa a la que se hace `seek` cada cuadro (por eso se puede pausar y saltar). |
| `three/film.ts` | Posproceso: tinta, cine mudo (sepia, grano, rayas, 18 fps, 4:3), invasión de color desde la puerta, recuerdo lila. |
| `three/models/` | Modelos 3D propios: `cat.ts` (gato de TilcAI, del isotipo), `clawd.ts` (Clawd), `phone.ts` (teléfonos), `set.ts` (comedor y utilería), `person.ts` (personajes Kenney con caras dibujadas). |
| `three/acts/stage.ts` | Gato, Clawd y teléfonos en las diapositivas (posiciones en px). |
| `components/` | Deck, diapositivas, capa HTML del sketch y vista de notas. |
| `public/models/kenney/` | Esposo y esposa (Kenney Mini Characters, CC0). |
| `public/video/` | Videos de los teléfonos de la demo. |

## Pendiente

- **Videos reales de la demo:** reemplazar `public/video/claude-app.mp4` y `public/video/vaquita.mp4` (vertical, 540 × 1170 aprox.) o cambiar las rutas en `content/deck.ts` → `videos`. Los actuales son de relleno (`npm run videos` los regenera).
- **Datos por confirmar** (`[[ ]]` en `content/deck.ts`): nombre de la competencia, modelo de negocio, fechas de la hoja de ruta, equipo.
- **Música y efectos** del sketch: el guion marca dónde van; aún no hay audio.

## Revisión visual

`node scripts/shots.cjs qa "/?s=2&t=40&hold&clean" …` toma capturas con Chrome headless (usa el Playwright de optipagos; ver la ruta en el script).
