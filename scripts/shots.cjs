// Capturas de revisión: node scripts/shots.cjs <salida> [ruta?query ...]
// Usa el Playwright de optipagos y Google Chrome con WebGL por software.
const path = require("path");
const PW = process.env.PW || "/run/media/nobarasaul/NV3aca/proyectos/optus/optipagos-frontend/node_modules/playwright";
const { chromium } = require(PW);
const out = process.argv[2] || "qa";
const urls = process.argv.slice(3);
const base = process.env.BASE || "http://localhost:3100";
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const [i, u] of urls.entries()) {
    const wait = Number((u.match(/[?&]wait=(\d+)/) || [])[1] || 3500);
    await page.goto(base + u, { waitUntil: "load" });
    await page.waitForTimeout(wait);
    const name = path.join(out, `${String(i).padStart(2, "0")}-${u.replace(/[^a-z0-9]+/gi, "_")}.png`);
    await page.screenshot({ path: name });
    console.log(name);
  }
  if (errors.length) console.log("ERRORES:\n" + [...new Set(errors)].join("\n"));
  await browser.close();
})();
