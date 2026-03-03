import { codecovVitePlugin } from "@codecov/vite-plugin";
import { crx } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [
    crx({ manifest }),
    codecovVitePlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: "acgme-case-parser-extension",
      uploadToken: process.env.CODECOV_TOKEN,
    }),
  ],
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
