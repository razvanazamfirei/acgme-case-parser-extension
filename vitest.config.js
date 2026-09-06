import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    // Tests inject page snapshots containing <link>/<script> tags. Without this,
    // happy-dom tries to fetch them and floods the output with network errors.
    environmentOptions: {
      happyDOM: {
        settings: {
          disableJavaScriptFileLoading: true,
          disableCSSFileLoading: true,
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
    setupFiles: ["./tests/setup.js"],
    // Pinned explicitly: this default flipped in Vitest 5 and silently broke
    // tests that read mock call history recorded at import time.
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "lcov"],
      include: ["src/**/*.js"],
      exclude: [],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
