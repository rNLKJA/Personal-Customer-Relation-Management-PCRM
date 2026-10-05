// Copies browser runtime assets out of node_modules into public/vendor so they
// are served from our own origin (runs on `pnpm install`):
//   - ZXing WebAssembly for the QR-scanner fallback (barcode-detector -> zxing-wasm)
//   - MapLibre GL's web-worker modules (v6 resolves them relative to its own
//     chunk URL, which a bundler rewrites, so the app points setWorkerUrl here)
import { copyFileSync, existsSync, mkdirSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = join(root, "public", "vendor");

function copy(from, toDir, name) {
  if (!existsSync(from)) throw new Error(`not found: ${from}`);
  mkdirSync(toDir, { recursive: true });
  copyFileSync(from, join(toDir, name));
  console.log(`[copy-assets] public/vendor/${toDir.slice(vendor.length + 1)}/${name}`);
}

try {
  const detectorDir = realpathSync(join(root, "node_modules", "barcode-detector"));
  const require = createRequire(join(detectorDir, "package.json"));
  // package.json is not in zxing-wasm's export map; derive its directory from an entry point.
  const entry = require.resolve("zxing-wasm/reader");
  const pkgDir = entry.slice(0, entry.lastIndexOf(`${sep}dist${sep}`));
  copy(join(pkgDir, "dist", "reader", "zxing_reader.wasm"), join(vendor, "zxing"), "zxing_reader.wasm");
} catch (err) {
  console.warn("[copy-assets] zxing skipped:", err instanceof Error ? err.message : err);
}

try {
  const dist = join(realpathSync(join(root, "node_modules", "maplibre-gl")), "dist");
  for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    copy(join(dist, file), join(vendor, "maplibre"), file);
  }
} catch (err) {
  console.warn("[copy-assets] maplibre skipped:", err instanceof Error ? err.message : err);
}
