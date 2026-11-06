import { createTimeline, stagger, type Timeline } from "animejs";

/**
 * Entrada de una diapositiva: recorre los [data-anim] en el orden del documento.
 *
 *   draw   los trazos del SVG se dibujan
 *   words  las palabras (.w) suben y aparecen una tras otra
 *   pop    aparece con un rebote
 *   fade   aparece sin moverse
 *   line   una línea fina crece de izquierda a derecha
 */
export function revealSlide(root: HTMLElement, budget: number): Timeline {
  const tl = createTimeline({ autoplay: false });
  for (const el of root.querySelectorAll<HTMLElement>("[data-anim]")) {
    const kind = el.dataset.anim;
    if (kind === "draw") {
      const paths = Array.from(el.querySelectorAll<SVGGeometryElement>("path, circle, rect, line, polyline"));
      for (const p of paths) {
        const length = p.getTotalLength?.() || 0;
        p.style.strokeDasharray = `${length} ${length}`;
        p.style.strokeDashoffset = `${length}`;
      }
      if (paths.length)
        tl.add(paths, { strokeDashoffset: 0, duration: 700, delay: stagger(90), ease: "inOut(2)" }, "-=420");
      tl.add(el, { opacity: [0, 1], duration: 200 }, "<<");
    } else if (kind === "words") {
      const words = el.querySelectorAll<HTMLElement>(".w");
      tl.add(el, { opacity: [0, 1], duration: 250, ease: "linear" }, "-=300");
      if (words.length)
        tl.add(words, { opacity: [0, 1], translateY: ["0.5em", "0em"], duration: 520, delay: stagger(38), ease: "out(3)" }, "<<");
    } else if (kind === "pop") {
      tl.add(el, { opacity: [0, 1], scale: [0.7, 1], duration: 520, ease: "outBack(2)" }, "-=360");
    } else if (kind === "line") {
      tl.add(el, { opacity: [0, 1], scaleX: [0, 1], duration: 700, ease: "inOut(3)" }, "-=500");
    } else {
      tl.add(el, { opacity: [0, 1], duration: 600, ease: "out(2)" }, "-=400");
    }
  }
  if (tl.duration > budget) tl.stretch(budget);
  return tl;
}

/** Deja la diapositiva entera sin animar (al volver atrás o en modo PDF). */
export function settle(root: HTMLElement) {
  for (const el of root.querySelectorAll<HTMLElement>("[data-anim]")) {
    el.style.opacity = "1";
    el.style.transform = "";
  }
  for (const p of root.querySelectorAll<SVGGeometryElement>("[data-anim=draw] *")) {
    p.style.strokeDasharray = "";
    p.style.strokeDashoffset = "";
  }
  for (const w of root.querySelectorAll<HTMLElement>(".w")) {
    w.style.opacity = "1";
    w.style.transform = "";
  }
}
