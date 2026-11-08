// Render preview stills: node scripts/stills.mjs <outDir> <time-in-seconds>...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [outDir, ...times] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const chromiumOptions = { gl: "swangle" };
const composition = await selectComposition({ serveUrl, id: "Episode2Mars", browserExecutable, chromiumOptions });
for (const s of times) {
  const frame = Math.round(Number(s) * 24);
  const t0 = Date.now();
  await renderStill({ serveUrl, composition, frame, output: `${outDir}/t${String(s).replace(".", "_")}.jpg`, scale: 0.5, browserExecutable, chromiumOptions, imageFormat: "jpeg" });
  console.log(s, Date.now() - t0, "ms");
}
