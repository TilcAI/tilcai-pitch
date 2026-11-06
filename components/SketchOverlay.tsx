"use client";

import { useEffect, useRef } from "react";
import { COLOR_AT, SCENES } from "@/content/sketch";
import type { Line } from "@/content/types";
import type { Anchor } from "@/three/acts/sketch";
import type { FilmClock } from "@/three/world";

/**
 * Capa HTML del sketch, encima del 3D: carteles de cine mudo, burbujas de pensamiento,
 * subtítulos y las piezas especiales (checkout, ¡PUM!, calendario, mandato, cierre).
 * Se actualiza en cada cuadro con el reloj de la película, sin re-renderizar React:
 * todo depende del segundo actual, así que pausar o saltar de escena se ve igual.
 */
const LINES: Line[] = SCENES.flatMap((s) => s.lines);
const NAMES: Record<Line["who"], string> = { esposo: "Él", esposa: "Ella", claude: "Claude", narrador: "" };

export function SketchOverlay({ clock, subtitles }: { clock: FilmClock; subtitles: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const subs = useRef(subtitles);
  useEffect(() => {
    subs.current = subtitles;
  }, [subtitles]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
    const card = q(".intertitle");
    const cardText = q(".intertitle-text");
    const cardWho = q(".intertitle-who");
    const bubble = q(".bubble");
    const bubbleText = q(".bubble-text");
    const sub = q(".subtitle");
    const subWho = q(".subtitle-who");
    const subText = q(".subtitle-text");
    const fx = {
      title: q(".fx-title"),
      checkout: q(".fx-checkout"),
      pum: q(".fx-pum"),
      calendar: q(".fx-calendar"),
      mandate: q(".fx-mandate"),
      end: q(".fx-end"),
    };
    const stamp = q(".checkout-stamp");
    const calDay = q(".cal-day");
    const calMonth = q(".cal-month");
    const approved = q(".mandate-ok");
    const pending = q(".mandate-pending");

    const update = (t: number, anchors: Record<string, Anchor>) => {
      const silent = t < COLOR_AT;
      el.classList.toggle("is-silent", silent);
      const active = LINES.filter((l) => t >= l.at && t < l.at + l.dur);

      // Piezas especiales.
      for (const [name, node] of Object.entries(fx)) {
        const line = active.find((l) => l.fx === name);
        node.style.opacity = line ? String(envelope(t, line.at, line.dur, 0.25)) : "0";
        node.style.visibility = line ? "visible" : "hidden";
        if (line && name === "pum") {
          const k = Math.min(1, (t - line.at) / 0.25);
          node.style.transform = `translate(-50%, -50%) scale(${0.4 + easeOutBack(k) * 0.6}) rotate(-6deg)`;
        }
      }
      // Checkout: la X cae a los 2 s.
      const co = active.find((l) => l.fx === "checkout");
      if (co) {
        const k = Math.max(0, Math.min(1, (t - co.at - 1.9) / 0.2));
        stamp.style.opacity = String(k);
        stamp.style.transform = `translate(-50%, -50%) scale(${2 - k}) rotate(-12deg)`;
        fx.checkout.style.translate = k > 0 && k < 1 ? `${Math.sin(t * 90) * 10}px 0` : "0 0";
      }
      // Calendario: 21 días hacia atrás.
      const cal = active.find((l) => l.fx === "calendar");
      if (cal) {
        const k = Math.min(1, Math.max(0, (t - cal.at - 0.2) / (cal.dur - 0.7)));
        const date = new Date(2026, 1, 14 - Math.round(easeInOut(k) * 21));
        calDay.textContent = String(date.getDate());
        calMonth.textContent = date.toLocaleDateString("es", { month: "short" }).replace(".", "").toUpperCase();
      }
      // Mandato: pendiente → aprobado.
      const man = active.find((l) => l.fx === "mandate");
      if (man) {
        const ok = t - man.at > 0.5;
        approved.style.display = ok ? "" : "none";
        pending.style.display = ok ? "none" : "";
      }

      // Cine mudo: un cartel a pantalla completa por diálogo o pensamiento.
      const plainLine = active.find((l) => !l.fx);
      const cardLine = silent ? plainLine : undefined;
      card.style.opacity = cardLine ? String(envelope(t, cardLine.at, cardLine.dur, 0.12)) : "0";
      if (cardLine) {
        cardText.textContent = cardLine.kind === "piensa" ? `(${cardLine.text})` : `«${cardLine.text}»`;
        cardWho.textContent = cardLine.kind === "piensa" ? `${NAMES[cardLine.who]}, para sí` : NAMES[cardLine.who];
      }

      // A color: burbuja para pensamientos, subtítulo para diálogos.
      const think = !silent ? active.find((l) => !l.fx && l.kind === "piensa") : undefined;
      bubble.style.opacity = think ? String(envelope(t, think.at, think.dur, 0.2)) : "0";
      if (think) {
        bubbleText.textContent = think.text;
        const a = anchors[think.who] ?? { x: 960, y: 300 };
        const x = Math.min(1600, Math.max(320, a.x + 120));
        const y = Math.min(760, Math.max(170, a.y - 90));
        bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      }
      const say = !silent && subs.current ? active.find((l) => !l.fx && l.kind === "dice") : undefined;
      sub.style.opacity = say ? String(envelope(t, say.at, say.dur, 0.15)) : "0";
      if (say) {
        subWho.textContent = NAMES[say.who];
        subWho.dataset.who = say.who;
        subText.textContent = say.text;
      }
    };
    clock.listeners.add(update);
    return () => {
      clock.listeners.delete(update);
    };
  }, [clock]);

  return (
    <div ref={root} className="sketch-overlay" aria-hidden="true">
      <div className="intertitle">
        <div className="intertitle-frame">
          <p className="intertitle-who" />
          <p className="intertitle-text" />
          <Ornament />
        </div>
      </div>

      <div className="fx-title intertitle">
        <div className="intertitle-frame">
          <p className="intertitle-who">Función de estreno</p>
          <p className="intertitle-text is-title">El aniversario olvidado</p>
          <Ornament />
          <p className="intertitle-foot">Una comedia en diez actos · MCMXXVI</p>
        </div>
      </div>

      <div className="fx-checkout">
        <div className="phone-ui">
          <p className="ui-store">Tienda en línea · Checkout</p>
          <div className="ui-item">
            <span className="ui-thumb">🎁</span>
            <div>
              <b>Regalo de aniversario</b>
              <small>Collar con dije · 1 unidad</small>
            </div>
          </div>
          <p className="ui-total">
            Total <b>48,00 USD</b>
          </p>
          <p className="ui-status">
            Estado: <b>Pago no realizado</b>
          </p>
          <span className="ui-button">Reintentar pago</span>
        </div>
        <span className="checkout-stamp">✕</span>
      </div>

      <p className="fx-pum">¡PUM!</p>

      <div className="fx-calendar">
        <div className="cal">
          <span className="cal-rings" />
          <span className="cal-month">FEB</span>
          <span className="cal-day">14</span>
        </div>
        <p className="cal-caption">Tres semanas antes</p>
      </div>

      <div className="fx-mandate">
        <div className="phone-ui is-modern">
          <p className="ui-store">Permiso para Claude</p>
          <dl className="ui-mandate">
            <div>
              <dt>Para</dt>
              <dd>Regalo de aniversario</dd>
            </div>
            <div>
              <dt>Máximo</dt>
              <dd>50 USD</dd>
            </div>
            <div>
              <dt>Compras</dt>
              <dd>Una sola</dd>
            </div>
            <div>
              <dt>Vence</dt>
              <dd>14 feb</dd>
            </div>
          </dl>
          <span className="ui-button mandate-pending">Aprobar</span>
          <span className="ui-approved mandate-ok">✓ Aprobado por ti</span>
        </div>
      </div>

      <div className="fx-end">
        {/* eslint-disable-next-line @next/next/no-img-element -- lienzo fijo */}
        <img src="/brand/tilcai-logo-white.png" alt="TilcAI" />
        <p className="end-claim">
          Tu agente compra. <em>Tú decides.</em>
        </p>
        <p className="end-sub">Infraestructura para pagos con agentes de IA</p>
      </div>

      <div className="bubble">
        <p className="bubble-text" />
      </div>

      <p className="subtitle">
        <b className="subtitle-who" />
        <span className="subtitle-text" />
      </p>
    </div>
  );
}

function Ornament() {
  return (
    <svg className="ornament" viewBox="0 0 400 30" aria-hidden="true">
      <path d="M0 15H150M250 15H400" />
      <path d="M200 3L212 15L200 27L188 15Z" />
      <circle cx="165" cy="15" r="4" />
      <circle cx="235" cy="15" r="4" />
    </svg>
  );
}

/** Opacidad con entrada y salida suaves dentro de [at, at + dur]. */
function envelope(t: number, at: number, dur: number, edge: number) {
  const a = Math.min(1, (t - at) / edge);
  const b = Math.min(1, (at + dur - t) / edge);
  return Math.max(0, Math.min(a, b));
}

function easeOutBack(x: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeInOut(x: number) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
