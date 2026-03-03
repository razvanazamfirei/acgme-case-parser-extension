import { vi } from "vitest";

// Suppress console noise in tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// Global chrome mock
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    onMessage: { addListener: vi.fn() },
    lastError: null,
    getManifest: vi.fn(() => ({ version: "1.3.6" })),
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

// Global XLSX mock — individual tests override as needed
global.XLSX = {
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
};
