import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (p = "") => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": src(),
      // `server-only` throws outside a React Server environment; the server
      // modules are tested directly against a temporary SQLite database.
      "server-only": src("test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { TZ: "UTC" },
  },
});
