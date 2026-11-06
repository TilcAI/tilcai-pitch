import type { Metadata } from "next";
import { Limelight, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Tipografías de la guía de marca (archivos de tilcai-web) y dos de época para los
// carteles de cine mudo del sketch.
const anton = localFont({ src: "./fonts/Anton-Regular.ttf", variable: "--font-anton", weight: "400", display: "block" });
const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-VariableFont_wght.ttf",
  variable: "--font-jakarta",
  weight: "300 800",
  display: "block",
});
const deco = Limelight({ subsets: ["latin"], weight: "400", variable: "--font-deco", display: "block" });
const serif = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "block" });

export const metadata: Metadata = {
  title: "TilcAI · Pitch",
  description: "Pitch de TilcAI para el jurado.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${anton.variable} ${jakarta.variable} ${deco.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
