// Copies the ZXing WebAssembly binary used by the QR scanner fallback
// (barcode-detector -> zxing-wasm) into public/wasm so it is served from our
// own origin instead of a third-party CDN. Runs on `pnpm install`.
import { copyFileSync, existsSync, mkdirSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const detectorDir = realpathSync(join(root, "node_modules", "barcode-detector"));
const require = createRequire(join(detectorDir, "package.json"));

try {
  // Resolve the package directory from the error-free "zxing-wasm/reader" entry
  // (package.json is not in its export map): .../zxing-wasm/dist/<fmt>/...
  const entry = require.resolve("zxing-wasm/reader");
  const pkgDir = entry.slice(0, entry.lastIndexOf(`${sep}dist${sep}`));
  const wasm = join(pkgDir, "dist", "reader", "zxing_reader.wasm");
  if (!existsSync(wasm)) throw new Error(`not found: ${wasm}`);
  const outDir = join(root, "public", "wasm");
  mkdirSync(outDir, { recursive: true });
  copyFileSync(wasm, join(outDir, "zxing_reader.wasm"));
  console.log("[copy-wasm] public/wasm/zxing_reader.wasm ready");
} catch (err) {
  console.warn("[copy-wasm] skipped:", err instanceof Error ? err.message : err);
}
