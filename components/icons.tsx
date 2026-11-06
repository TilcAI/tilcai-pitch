import type { IconName } from "@/content/types";

/** Íconos de línea fina (24 × 24), dibujables por la animación de entrada. */
const PATHS: Record<IconName, string[]> = {
  chat: ["M4 5h16v10H9l-5 4z", "M8 9h8", "M8 12h5"],
  quote: ["M6 3h9l4 4v14H6z", "M15 3v4h4", "M9 12h7", "M9 15h7", "M9 18h4"],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", "M8.5 12l2.5 2.5 4.5-5"],
  check: ["M4 12.5l5 5L20 6.5"],
  bolt: ["M13 2L5 14h6l-1 8 8-12h-6z"],
  link: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  receipt: ["M6 2h12v20l-3-2-3 2-3-2-3 2z", "M9 7h6", "M9 11h6", "M9 15h4"],
  wallet: ["M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3z", "M3 7l12-4 2 4", "M16 13h3"],
  store: ["M3 9l2-5h14l2 5", "M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z", "M5 13v8h14v-8", "M10 21v-5h4v5"],
  agent: ["M5 8h14v11H5z", "M12 4v4", "M9 13h.01", "M15 13h.01", "M9 16h6", "M2 12v3", "M22 12v3"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4", "M12 15v2"],
  clock: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7v5l3 2"],
  users: ["M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M2 21c0-4 3-6 7-6s7 2 7 6", "M16 3a4 4 0 0 1 0 8", "M18 15c2.5.5 4 2.5 4 6"],
  globe: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M3 12h18", "M12 3c3 3 3 15 0 18", "M12 3c-3 3-3 15 0 18"],
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" data-anim="draw" aria-hidden="true">
      {PATHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
