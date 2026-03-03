import { codecovVitePlugin } from "@codecov/vite-plugin";
import { crx } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";
import manifest from "./manifest.json";

const shouldUseCodecovVitePlugin = process.env.CODECOV_VITE_PLUGIN === "true";

export default defineConfig({
  plugins: [
    crx({ manifest }),
    shouldUseCodecovVitePlugin &&
      codecovVitePlugin({
        enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
        bundleName: "acgme-case-parser-extension",
        uploadToken: process.env.CODECOV_TOKEN,
        telemetry: false,
      }),
  ].filter(Boolean),
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "development" ? "inline" : false,
    minify: process.env.NODE_ENV !== "development",
  },
  css: {
    postcss: "./postcss.config.js",
  },
});
