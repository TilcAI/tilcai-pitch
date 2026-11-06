import type { SketchScene } from "./types";

/**
 * «El aniversario olvidado», versión 2 (ver guion_el_aniversario_olvidado.md).
 * Estos tiempos mueven el sketch 3D (three/acts/sketch.ts) y la vista de notas a la vez:
 * si cambias un segundo aquí, cambian los dos.
 */

/** Duración total del sketch, en segundos. */
export const SKETCH_SECONDS = 90;

/** Segundo en que entra Claude: termina el cine mudo y la imagen pasa a color de 2010. */
export const COLOR_AT = 38.6;

/** Corte del sketch: aquí se interrumpe para presentar TilcAI y luego se reanuda. */
export const CUT_AT = 78;

export const SCENES: SketchScene[] = [
  {
    n: 0,
    title: "Cartel de título",
    from: 0,
    to: 3,
    place: "Intertítulo",
    emotion: "Expectativa",
    action: "Cartel de cine mudo con marco art déco: «Función de estreno: El aniversario olvidado». Sin mencionar TilcAI: se revela después del corte.",
    camera: "Cartel fijo con parpadeo de proyector.",
    sound: "Piano de cine mudo, alegre.",
    lines: [{ at: 0, dur: 3, who: "narrador", kind: "pantalla", text: "Función de estreno · El aniversario olvidado", fx: "title" }],
  },
  {
    n: 1,
    title: "Un aniversario especial",
    from: 3,
    to: 9,
    place: "Comedor, noche",
    emotion: "Felicidad",
    action: "La pareja, sentada frente a frente con copas, flores y pastel. Brindan. Flotan corazones.",
    camera: "Plano general y acercamiento lento a la pareja.",
    sound: "Piano romántico y choque de copas.",
    lines: [],
  },
  {
    n: 2,
    title: "El regalo olvidado",
    from: 9,
    to: 15,
    place: "Comedor",
    emotion: "Sorpresa y nervios",
    action: "Ella mira alrededor de la mesa esperando su regalo. Él abre los ojos, se congela y suda.",
    camera: "Primer plano de ella; zoom rápido a la cara de él.",
    sound: "El piano se corta en seco: disco rayado.",
    lines: [{ at: 12, dur: 2.6, who: "esposo", kind: "piensa", text: "¡EL REGALO!" }],
  },
  {
    n: 3,
    title: "El checkout que nunca terminó",
    from: 15,
    to: 24,
    place: "Comedor, bajo la mesa",
    emotion: "Desesperación",
    action: "Saca el celular bajo la mesa. La compra quedó en el checkout: «Pago no realizado».",
    camera: "La pantalla del celular llena el cuadro; X grande y sacudida.",
    sound: "Alerta de error (en el piano, una nota falsa).",
    lines: [
      { at: 16.5, dur: 4.5, who: "narrador", kind: "pantalla", text: "Regalo de aniversario · Pago no realizado", fx: "checkout" },
      { at: 21.2, dur: 2.8, who: "esposo", kind: "piensa", text: "¡Pero si yo había hecho el checkout!" },
    ],
  },
  {
    n: 4,
    title: "La sospecha",
    from: 24,
    to: 33,
    place: "Comedor",
    emotion: "Tensión cómica",
    action: "Ella deja de sonreír y cruza los brazos. Él guarda el celular y finge naturalidad. Ella levanta una ceja.",
    camera: "Planos alternados de las miradas; él se encoge y tiembla.",
    sound: "Silencio incómodo; nota de tensión.",
    lines: [
      { at: 25.6, dur: 3.2, who: "esposa", kind: "dice", text: "No me digas que te olvidaste de nuestro aniversario…" },
      { at: 29.2, dur: 2.8, who: "esposo", kind: "dice", text: "Yo… este… lo que pasa es que…" },
    ],
  },
  {
    n: 5,
    title: "La puerta se abre",
    from: 33,
    to: 38.6,
    place: "Comedor",
    emotion: "Suspenso",
    action: "¡PUM! La puerta se abre de golpe y entra luz. Los dos giran la cabeza. Aún no se ve quién es.",
    camera: "Sacudida, líneas de impacto, pausa dramática.",
    sound: "Portazo; el piano se detiene.",
    lines: [{ at: 33.4, dur: 1.4, who: "narrador", kind: "pantalla", text: "¡PUM!", fx: "pum" }],
  },
  {
    n: 6,
    title: "Claude salva el día",
    from: 38.6,
    to: 49,
    place: "Comedor, ahora a color",
    emotion: "Alivio inesperado",
    action:
      "Claude (Clawd) entra con una caja de regalo y el color invade la escena desde la puerta; el cuadro 4:3 se abre a 16:9. Entrega el regalo a la esposa; él queda inmóvil.",
    camera: "Entrada desde la puerta, acercamiento al regalo, rebote al entregarlo.",
    sound: "Música pop de 2010; brillo al aparecer el regalo.",
    lines: [
      { at: 41.6, dur: 3.6, who: "claude", kind: "dice", text: "¡Perdón por llegar tarde! Aquí está el regalo que me pediste." },
      { at: 46.4, dur: 2.2, who: "esposa", kind: "dice", text: "¡Ay, qué sorpresa!" },
    ],
  },
  {
    n: 7,
    title: "¿Yo pedí eso?",
    from: 49,
    to: 56,
    place: "Comedor",
    emotion: "Desconcierto",
    action: "Él mira el regalo, a Claude, al regalo otra vez. Aparece un signo de interrogación.",
    camera: "Ojos exagerados y congelado breve.",
    sound: "Tres notas de confusión.",
    lines: [{ at: 50.4, dur: 4.4, who: "esposo", kind: "piensa", text: "Pero… yo no pedí nada…" }],
  },
  {
    n: 8,
    title: "El guiño",
    from: 56,
    to: 61,
    place: "Comedor",
    emotion: "Complicidad",
    action: "Claude lo mira y le guiña un ojo sin decir nada. Él empieza a recordar.",
    camera: "Primerísimo plano del guiño con destello.",
    sound: "Campanilla y rebobinado.",
    lines: [],
  },
  {
    n: 9,
    title: "Tres semanas antes",
    from: 61,
    to: 78,
    place: "Recuerdo: la sala, de día",
    emotion: "Revelación",
    action:
      "Un calendario retrocede. En el recuerdo, él le deja a Claude un permiso con límite. Claude lo confirma y él lo aprueba. Volvemos al presente: entiende todo.",
    camera: "Calendario, nube de recuerdo, acercamiento a su cara de «¡ah!».",
    sound: "Cinta rebobinando; campanilla de descubrimiento.",
    lines: [
      { at: 61.2, dur: 2.4, who: "narrador", kind: "pantalla", text: "Tres semanas antes", fx: "calendar" },
      {
        at: 64,
        dur: 5,
        who: "esposo",
        kind: "dice",
        text: "Claude, si se me olvida el regalo de aniversario, encárgate tú. Hasta 50 dólares.",
      },
      { at: 69.4, dur: 3.6, who: "claude", kind: "dice", text: "Entendido. Te dejo el permiso listo para que lo apruebes." },
      { at: 73.2, dur: 1.6, who: "narrador", kind: "pantalla", text: "Mandato aprobado · máx. 50 USD · una compra", fx: "mandate" },
      { at: 75.6, dur: 2.7, who: "esposo", kind: "piensa", text: "¡Ahhh… claro!" },
    ],
  },
  {
    n: 10,
    title: "Todo estaba planeado",
    from: 78,
    to: 90,
    place: "Comedor, presente",
    emotion: "Felicidad y complicidad",
    action:
      "Él se acomoda la ropa y finge que todo era sorpresa. Ella lo abraza. Él agradece a Claude de reojo; Claude guiña. Cuadro congelado; sigue la diapositiva de cierre.",
    camera: "Alejamiento a los tres, corazones y congelado final.",
    sound: "Vuelve el tema romántico, ahora alegre.",
    lines: [
      { at: 78.8, dur: 3, who: "esposo", kind: "dice", text: "¡Claro! Quería que fuera una sorpresa." },
    ],
  },
];

export function sceneAt(t: number): SketchScene {
  return SCENES.findLast((s) => t >= s.from) ?? SCENES[0];
}
