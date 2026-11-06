import type { CSSProperties, ReactNode } from "react";
import type { Deck, SlideData, Status } from "@/content/types";
import { Icon } from "./icons";
import { plain as plainName, Rich } from "./rich";

/**
 * Una diapositiva en el lienzo de 1920 × 1080. Solo marca qué se anima y en qué orden
 * (data-anim, ver components/reveal.ts); el 3D va en el lienzo de encima.
 */
export function Slide({ slide, deck, index, total }: { slide: SlideData; deck: Deck; index: number; total: number }) {
  const framed = !["cover", "closing", "sketch"].includes(slide.layout);
  return (
    <section className={`slide layout-${slide.layout}`} aria-roledescription="diapositiva" aria-label={`${index + 1} de ${total}`}>
      {framed && (
        <header className="slide-head">
          <span className="kicker" data-anim="fade">
            <i className="kicker-dot" />
            {slide.section}
          </span>
          <h1 className="slide-title" data-anim="words">
            <Rich text={slide.title} />
          </h1>
          {slide.lead && (
            <p className="slide-lead" data-anim="words">
              <Rich text={slide.lead} />
            </p>
          )}
        </header>
      )}
      {layouts[slide.layout](slide, deck)}
      {slide.note && (
        <p className="slide-note" data-anim="words">
          <Rich text={slide.note} />
        </p>
      )}
      {slide.layout !== "sketch" && (
        <footer className="slide-foot">
          <span>TILCAI / {deck.event.replace(/\[\[|\]\]/g, "")}</span>
          <span>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </footer>
      )}
    </section>
  );
}

const STATUS: Record<Status, string> = {
  mainnet: "Mainnet",
  verificado: "Verificado en testnet",
  publicado: "Publicado",
  laboratorio: "Laboratorio",
  pendiente: "Pendiente",
};

const layouts: Record<SlideData["layout"], (slide: SlideData, deck: Deck) => ReactNode> = {
  cover: (slide, deck) => (
    <div className="cover">
      {/* eslint-disable-next-line @next/next/no-img-element -- lienzo fijo */}
      <img className="cover-logo" src="/brand/tilcai-logo-white.png" alt="TilcAI" data-anim="fade" />
      <span className="cover-event" data-anim="fade">
        <Rich text={deck.event} />
      </span>
      <h1 className="cover-title" data-anim="words">
        <Rich text={slide.title} />
      </h1>
      <span className="rule" data-anim="line" />
      {slide.lead && (
        <p className="cover-lead" data-anim="words">
          <Rich text={slide.lead} />
        </p>
      )}
      <Orbits />
    </div>
  ),

  sketch: () => null,

  statement: (slide) => (
    <ul className="statement">
      {slide.items?.map((item, i) => (
        <li key={item.title} className="statement-item" style={{ "--i": i } as CSSProperties}>
          {item.icon && <Icon name={item.icon} className="statement-icon" />}
          <h2 data-anim="words">
            <Rich text={item.title} />
          </h2>
          {item.text && (
            <p data-anim="words">
              <Rich text={item.text} />
            </p>
          )}
        </li>
      ))}
    </ul>
  ),

  cards: (slide) => (
    <ul className="cards" style={{ "--n": slide.items?.length ?? 1 } as CSSProperties}>
      {slide.items?.map((item, i) => (
        <li key={item.title} className="card">
          <span className="card-num" data-anim="fade">
            {String(i + 1).padStart(2, "0")}
          </span>
          {item.icon && <Icon name={item.icon} className="card-icon" />}
          <h2 className="card-title" data-anim="words">
            <Rich text={item.title} />
          </h2>
          {item.text && (
            <p className="card-text" data-anim="words">
              <Rich text={item.text} />
            </p>
          )}
        </li>
      ))}
    </ul>
  ),

  flow: (slide) => (
    <ol className="flow" style={{ "--n": slide.items?.length ?? 1 } as CSSProperties}>
      <svg className="flow-line" viewBox="0 0 1600 10" preserveAspectRatio="none" data-anim="draw" aria-hidden="true">
        <path d="M0 5H1600" />
      </svg>
      {slide.items?.map((item, i) => (
        <li key={item.title} className="flow-step">
          <span className="flow-node" data-anim="pop">
            {item.icon && <Icon name={item.icon} />}
          </span>
          <span className="flow-num" data-anim="fade">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h2 data-anim="words">
            <Rich text={item.title} />
          </h2>
          {item.text && (
            <p data-anim="words">
              <Rich text={item.text} />
            </p>
          )}
        </li>
      ))}
    </ol>
  ),

  demo: (slide) => (
    <>
      <ol className="demo-steps">
        {slide.items?.map((item, i) => (
          <li key={item.title} className="demo-step">
            <span className="demo-num" data-anim="pop">
              {i + 1}
            </span>
            <div>
              <h2 data-anim="words">
                <Rich text={item.title} />
              </h2>
              {item.text && (
                <p data-anim="words">
                  <Rich text={item.text} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="demo-labels" aria-hidden="true">
        <span className="demo-label is-claude" data-anim="fade">
          {/* eslint-disable-next-line @next/next/no-img-element -- lienzo fijo */}
          <img src="/brand/claude.png" alt="" /> Claude app
        </span>
        <svg className="demo-arrow" viewBox="0 0 220 60" data-anim="draw">
          <path d="M8 40 C70 4 150 4 208 34" />
          <path d="M190 22 L210 35 L188 44" />
        </svg>
        <span className="demo-label is-vaquita" data-anim="fade">
          Vaquita Protocol
        </span>
      </div>
      <p className="demo-placeholder" data-anim="fade">
        Video de relleno: reemplazar por la grabación real
      </p>
    </>
  ),

  evidence: (slide) => (
    <ul className="evidence">
      {slide.items?.map((item) => (
        <li key={item.title} className={`proof status-${item.status}`}>
          <span className="proof-status" data-anim="pop">
            {item.status && STATUS[item.status]}
          </span>
          <h2 data-anim="words">
            <Rich text={item.title} />
          </h2>
          {item.text && (
            <p data-anim="words">
              <Rich text={item.text} />
            </p>
          )}
        </li>
      ))}
    </ul>
  ),

  roadmap: (slide) => (
    <ol className="roadmap" style={{ "--n": slide.items?.length ?? 1 } as CSSProperties}>
      <svg className="roadmap-line" viewBox="0 0 1600 120" preserveAspectRatio="none" data-anim="draw" aria-hidden="true">
        <path d="M0 60 C200 10 400 110 600 60 S1000 10 1200 60 S1500 100 1600 50" />
      </svg>
      {slide.items?.map((item, i) => (
        <li key={item.title + i} className={`milestone${i === 0 ? " is-now" : ""}`}>
          <span className="milestone-dot" data-anim="pop" />
          <span className="milestone-when" data-anim="words">
            <Rich text={item.value ?? ""} />
          </span>
          <h2 data-anim="words">
            <Rich text={item.title} />
          </h2>
          {item.text && (
            <p data-anim="words">
              <Rich text={item.text} />
            </p>
          )}
        </li>
      ))}
    </ol>
  ),

  team: (slide) => (
    <ul className="team">
      {slide.items?.map((item, i) => (
        <li key={i} className="member">
          <span className="member-photo" data-anim="pop">
            {item.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- lienzo fijo
              <img src={item.photo} alt={plainName(item.title)} />
            ) : (
              <Icon name="users" />
            )}
          </span>
          <h2 data-anim="words">
            <Rich text={item.title} />
          </h2>
          {item.text && (
            <p className="member-role" data-anim="words">
              <Rich text={item.text} />
            </p>
          )}
          {item.value && (
            <p className="member-tags" data-anim="fade">
              {item.value}
            </p>
          )}
        </li>
      ))}
    </ul>
  ),

  closing: (slide, deck) => (
    <div className="cover is-closing">
      {/* eslint-disable-next-line @next/next/no-img-element -- lienzo fijo */}
      <img className="cover-logo" src="/brand/tilcai-logo-white.png" alt="TilcAI" data-anim="fade" />
      <h1 className="cover-title" data-anim="words">
        <Rich text={slide.title} />
      </h1>
      <span className="rule" data-anim="line" />
      {slide.lead && (
        <p className="cover-lead" data-anim="words">
          <Rich text={slide.lead} />
        </p>
      )}
      <p className="closing-url" data-anim="words">
        <Rich text={deck.url} />
      </p>
      <Orbits />
    </div>
  ),
};

/** Órbitas finas detrás del personaje (como el sticker «Órbita» de la guía). */
function Orbits() {
  return (
    <svg className="orbits" viewBox="0 0 900 900" data-anim="draw" aria-hidden="true">
      <circle cx="450" cy="450" r="300" />
      <ellipse cx="450" cy="450" rx="420" ry="150" transform="rotate(-18 450 450)" />
      <ellipse cx="450" cy="450" rx="380" ry="120" transform="rotate(22 450 450)" />
    </svg>
  );
}
