import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACGMEForm } from "../src/popup/acgme.js";
import { ACGME_URL_PATTERN } from "../src/popup/constants.js";
import { State } from "../src/popup/state.js";

vi.mock("../src/popup/navigation.js", () => ({
  Navigation: { goToNextPending: vi.fn(), update: vi.fn() },
}));
vi.mock("../src/popup/storage.js", () => ({
  Storage: { saveState: vi.fn() },
}));

function buildACGMEDOM() {
  document.body.innerHTML = `
    <input type="text" id="caseId" value="CASE-001" />
    <input type="text" id="date" value="1/15/2024" />
    <input type="text" id="attending" value="SMITH" />
    <textarea id="comments"></textarea>
    <select id="ageCategory"><option value="">-</option></select>
    <select id="asa"><option value="">-</option><option value="2">2</option></select>
    <select id="anesthesia"><option value="">-</option><option value="GA">GA</option></select>
    <select id="procedureCategory"><option value="">-</option></select>
    <span id="caseStatus" class="status-badge pending">Pending</span>
    <div id="statusSection" class="hidden">
      <span id="statusMessage"></span>
    </div>
  `;
}

const ACGME_URL = `https://${ACGME_URL_PATTERN}/New`;

describe("ACGMEForm", () => {
  beforeEach(() => {
    buildACGMEDOM();
    State.reset();
    State.setCases([{ caseId: "CASE-001" }]);
    State.settings = {
      defaultInstitution: "",
      defaultAttending: "",
      submitDelay: 0,
      cardiacAutoFill: false,
      auto5EPathology: false,
      showWarnings: false,
    };
    vi.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // fill — tab-level errors
  // -------------------------------------------------------------------------

  describe("fill() — tab errors", () => {
    it("logs fill invocation in development mode", async () => {
      const previousEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        chrome.tabs.query.mockResolvedValue([]);
        await ACGMEForm.fill(false);
        expect(logSpy).toHaveBeenCalledWith(
          "ACGMEForm.fill called, andSubmit:",
          false,
        );
      } finally {
        if (previousEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = previousEnv;
        }
        logSpy.mockRestore();
      }
    });

    it("returns error when no active tab found", async () => {
      chrome.tabs.query.mockResolvedValue([]);
      const result = await ACGMEForm.fill();
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("active browser tab");
    });

    it("returns error when tab id is missing", async () => {
      chrome.tabs.query.mockResolvedValue([{ url: ACGME_URL }]);
      const result = await ACGMEForm.fill();
      expect(result.success).toBe(false);
    });

    it("shows status and returns error when tab is not ACGME page", async () => {
      chrome.tabs.query.mockResolvedValue([
        { id: 1, url: "https://google.com" },
      ]);
      const result = await ACGMEForm.fill();
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // fill — content script communication
  // -------------------------------------------------------------------------

  describe("fill() — content script responses", () => {
    function mockTabOnAcgme() {
      chrome.tabs.query.mockResolvedValue([{ id: 42, url: ACGME_URL }]);
    }

    it("returns error when content script is not loaded (lastError)", async () => {
      mockTabOnAcgme();
      chrome.tabs.sendMessage.mockImplementation((_id, _msg, cb) => {
        Object.defineProperty(chrome.runtime, "lastError", {
          value: { message: "Could not establish connection" },
          configurable: true,
        });
        cb(undefined);
        Object.defineProperty(chrome.runtime, "lastError", {
          value: null,
          configurable: true,
        });
      });
      const result = await ACGMEForm.fill();
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("Content script not loaded");
    });

    it("returns error when content script returns no response", async () => {
      mockTabOnAcgme();
      chrome.tabs.sendMessage.mockImplementation((_id, _msg, cb) => cb(null));
      const result = await ACGMEForm.fill();
      expect(result.success).toBe(false);
    });

    it("returns fill result when content script returns success", async () => {
      mockTabOnAcgme();
      chrome.tabs.sendMessage.mockImplementation((_id, _msg, cb) =>
        cb({
          success: true,
          result: { success: true, filled: [], warnings: [], errors: [] },
        }),
      );
      const result = await ACGMEForm.fill(false);
      expect(result.success).toBe(true);
      expect(result.submitted).toBe(false);
    });

    it("shows info status after successful fill (no submit)", async () => {
      mockTabOnAcgme();
      chrome.tabs.sendMessage.mockImplementation((_id, _msg, cb) =>
        cb({
          success: true,
          result: { success: true, filled: [], warnings: [], errors: [] },
        }),
      );
      await ACGMEForm.fill(false);
      expect(document.getElementById("statusMessage").textContent).toContain(
        "filled",
      );
    });

    it("shows warnings in status when fill has warnings", async () => {
      mockTabOnAcgme();
      chrome.tabs.sendMessage.mockImplementation((_id, _msg, cb) =>
        cb({
          success: true,
          result: {
            success: true,
            filled: [],
            warnings: ["Used default attending"],
            errors: [],
          },
        }),
      );
      State.settings.showWarnings = true;
      await ACGMEForm.fill(false);
      const msg = document.getElementById("statusMessage").textContent;
      expect(msg).toContain("filled");
    });
  });

  // -------------------------------------------------------------------------
  // fill — with submit (andSubmit=true)
  // -------------------------------------------------------------------------

  describe("fill() — with submit", () => {
    function mockFillSuccess() {
      chrome.tabs.query.mockResolvedValue([{ id: 42, url: ACGME_URL }]);
      chrome.tabs.sendMessage.mockImplementationOnce((_id, _msg, cb) =>
        cb({
          success: true,
          result: { success: true, filled: [], warnings: [], errors: [] },
        }),
      );
    }

    it("treats 'message channel closed' as submit success", async () => {
      mockFillSuccess();
      chrome.tabs.sendMessage.mockImplementationOnce((_id, _msg, cb) => {
        Object.defineProperty(chrome.runtime, "lastError", {
          value: {
            message:
              "The message channel closed before a response was received",
          },
          configurable: true,
        });
        cb(undefined);
        Object.defineProperty(chrome.runtime, "lastError", {
          value: null,
          configurable: true,
        });
      });
      const result = await ACGMEForm.fill(true);
      expect(result.submitted).toBe(true);
      expect(result.success).toBe(true);
    });

    it("treats 'message port closed' as submit success", async () => {
      mockFillSuccess();
      chrome.tabs.sendMessage.mockImplementationOnce((_id, _msg, cb) => {
        Object.defineProperty(chrome.runtime, "lastError", {
          value: {
            message: "The message port closed before a response was received",
          },
          configurable: true,
        });
        cb(undefined);
        Object.defineProperty(chrome.runtime, "lastError", {
          value: null,
          configurable: true,
        });
      });
      const result = await ACGMEForm.fill(true);
      expect(result.submitted).toBe(true);
    });

    it("treats other lastError on submit as failure", async () => {
      mockFillSuccess();
      chrome.tabs.sendMessage.mockImplementationOnce((_id, _msg, cb) => {
        Object.defineProperty(chrome.runtime, "lastError", {
          value: { message: "Extension context invalidated" },
          configurable: true,
        });
        cb(undefined);
        Object.defineProperty(chrome.runtime, "lastError", {
          value: null,
          configurable: true,
        });
      });
      const result = await ACGMEForm.fill(true);
      expect(result.submitted).toBe(false);
    });

    it("marks case as submitted and shows success status", async () => {
      mockFillSuccess();
      chrome.tabs.sendMessage.mockImplementationOnce((_id, _msg, cb) =>
        cb({ success: true }),
      );
      await ACGMEForm.fill(true);
      expect(State.getCaseStatus(0)).toBe("submitted");
      expect(document.getElementById("statusMessage").textContent).toContain(
        "submitted",
      );
    });

    it("includes warning in submit success message when showWarnings=true", async () => {
      chrome.tabs.query.mockResolvedValue([{ id: 42, url: ACGME_URL }]);
      chrome.tabs.sendMessage.mockImplementationOnce((_id, _msg, cb) =>
        cb({
          success: true,
          result: {
            success: true,
            filled: [],
            warnings: ["Used default attending"],
            errors: [],
          },
        }),
      );
      chrome.tabs.sendMessage.mockImplementationOnce((_id, _msg, cb) =>
        cb({ success: true }),
      );
      State.settings.showWarnings = true;
      await ACGMEForm.fill(true);
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Warning",
      );
    });

    it("shows submit error when submit response is failure", async () => {
      mockFillSuccess();
      chrome.tabs.sendMessage.mockImplementationOnce((_id, _msg, cb) =>
        cb({ success: false, errors: ["Form validation failed"] }),
      );
      await ACGMEForm.fill(true);
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Submit failed",
      );
    });

    it("shows generic submit failed message when no errors array", async () => {
      mockFillSuccess();
      chrome.tabs.sendMessage.mockImplementationOnce((_id, _msg, cb) =>
        cb({ success: false }),
      );
      const result = await ACGMEForm.fill(true);
      expect(result.submitted).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // fill — exception path
  // -------------------------------------------------------------------------

  describe("fill() — exception handling", () => {
    it("catches thrown errors and returns failure result", async () => {
      chrome.tabs.query.mockRejectedValue(new Error("tabs API error"));
      const result = await ACGMEForm.fill();
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("tabs API error");
    });
  });

  // -------------------------------------------------------------------------
  // _handleFillResult — error path
  // -------------------------------------------------------------------------

  describe("_handleFillResult()", () => {
    it("shows error when result is null", () => {
      ACGMEForm._handleFillResult(null, false);
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Error",
      );
    });

    it("shows generic error when result has no errors array", () => {
      ACGMEForm._handleFillResult({ success: false }, false);
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Error",
      );
    });

    it("shows error message from result.errors", () => {
      ACGMEForm._handleFillResult(
        { success: false, errors: ["Specific error"] },
        false,
      );
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Specific error",
      );
    });
  });
});
