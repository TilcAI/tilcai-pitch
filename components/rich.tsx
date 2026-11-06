import { Fragment, type ReactNode } from "react";

/**
 * Texto con marcas del contenido:
 *   *palabras*  → resaltado violeta
 *   [[dato]]    → por confirmar (borde punteado)
 * Cada palabra va en un <span class="w"> para que la animación de entrada la recorra.
 */
export function Rich({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /(\*[^*]+\*|\[\[[^\]]+\]\])/g;
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(re)) {
    const i = match.index ?? 0;
    if (i > last) parts.push(<Words key={key++} text={text.slice(last, i)} />);
    const token = match[0];
    if (token.startsWith("*")) {
      parts.push(
        <em key={key++} className="hl">
          <Words text={token.slice(1, -1)} />
        </em>,
      );
    } else {
      parts.push(
        <span key={key++} className="tbc" title="Por confirmar">
          <Words text={token.slice(2, -2)} />
        </span>,
      );
    }
    last = i + token.length;
  }
  if (last < text.length) parts.push(<Words key={key++} text={text.slice(last)} />);
  return <>{parts}</>;
}

function Words({ text }: { text: string }) {
  const chunks = text.split(/(\s+)/);
  return (
    <>
      {chunks.map((chunk, i) =>
        /^\s+$/.test(chunk) || !chunk ? (
          <Fragment key={i}>{chunk}</Fragment>
        ) : (
          <span key={i} className="w">
            {chunk}
          </span>
        ),
      )}
    </>
  );
}

/** Texto plano, sin marcas. */
export function plain(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1").replace(/\[\[([^\]]+)\]\]/g, "$1");
}
