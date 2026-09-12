import { defineConfig } from "vite";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import react from "@vitejs/plugin-react";
const target = process.env.BROWSER_TARGET ?? "firefox";
const supportedTargets = ["firefox", "chrome", "edge", "safari"];
if (!supportedTargets.includes(target)) throw new Error(`Unsupported browser target: ${target}`);
export default defineConfig({
  plugins: [react(), {
    name: "copy-browser-manifest",
    closeBundle() {
      const outputDirectory = resolve(__dirname, "dist", target);
      mkdirSync(outputDirectory, { recursive: true });
      copyFileSync(resolve(__dirname, "manifests", `${target}.json`), resolve(outputDirectory, "manifest.json"));
    }
  }],
  build: {
    outDir: `dist/${target}`,
    emptyOutDir: true,
    rollupOptions: {
      input: { popup: resolve(__dirname, "index.html"), sidebar: resolve(__dirname, "sidebar.html"), background: resolve(__dirname, "src/background.ts"), "content-script": resolve(__dirname, "src/content-script.ts") },
      output: { entryFileNames: "[name].js", chunkFileNames: "assets/[name]-[hash].js", assetFileNames: "assets/[name]-[hash][extname]" }
    }
  }
});
