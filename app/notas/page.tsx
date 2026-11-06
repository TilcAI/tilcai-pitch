import type { Metadata } from "next";
import { Notes } from "@/components/Notes";
import deck from "@/content/deck";

// Vista del guion, sincronizada con el pitch (se abre con la tecla P).
export const metadata: Metadata = { title: "TilcAI · Guion" };

export default function NotesPage() {
  return <Notes deck={deck} />;
}
