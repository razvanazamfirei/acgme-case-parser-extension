import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACGMEForm } from "../src/popup/acgme.js";
import { ACGME_URL_PATTERN } from "../src/popup/constants.js";
import { State } from "../src/popup/state.js";
import { Storage } from "../src/popup/storage.js";
import { Target } from "../src/popup/target.js";

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
    Target.tabId = null;
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
    chrome.tabs.get.mockResolvedValue({
      id: 42,
      url: ACGME_URL,
      status: "complete",
    });
    Storage.saveState.mockResolvedValue(true);
    ACGMEForm.busy = false;
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
      expect(result.errors[0]).toContain("ACGME Case Entry tab");
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
        if (_msg.action === "getPageState") return cb({ ready: true });
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
      expect(result.errors[0]).toContain("interrupted");
    });

    it("returns error when content script returns no response", async () => {
      mockTabOnAcgme();
      chrome.tabs.sendMessage.mockImplementation((_id, msg, cb) =>
        cb(msg.action === "getPageState" ? { ready: true } : null),
      );
      const result = await ACGMEForm.fill();
      expect(result.success).toBe(false);
    });

    it("returns fill result when content script returns success", async () => {
      mockTabOnAcgme();
      chrome.tabs.sendMessage.mockImplementation((_id, _msg, cb) =>
        cb(
          _msg.action === "getPageState"
            ? { ready: true }
            : {
                success: true,
                result: { success: true, filled: [], warnings: [], errors: [] },
              },
        ),
      );
      const result = await ACGMEForm.fill(false);
      expect(result.success).toBe(true);
      expect(result.submitted).toBe(false);
    });

    it("waits for a previous save navigation before filling the next case", async () => {
      vi.useFakeTimers();
      try {
        mockTabOnAcgme();
        let loading = true;
        chrome.tabs.get.mockImplementation(async () => ({
          id: 42,
          url: ACGME_URL,
          status: loading ? "loading" : "complete",
        }));
        chrome.tabs.sendMessage.mockImplementation((_id, message, callback) =>
          callback(
            message.action === "getPageState"
              ? { ready: true }
              : { success: true, result: { success: true } },
          ),
        );
        const pending = ACGMEForm.fill(false);
        await vi.advanceTimersByTimeAsync(500);
        expect(
          chrome.tabs.sendMessage.mock.calls.some(
            ([, message]) => message.action === "fillCase",
          ),
        ).toBe(false);
        loading = false;
        await vi.runAllTimersAsync();
        expect((await pending).success).toBe(true);
        expect(
          chrome.tabs.sendMessage.mock.calls.filter(
            ([, message]) => message.action === "fillCase",
          ),
        ).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("shows info status after successful fill (no submit)", async () => {
      mockTabOnAcgme();
      chrome.tabs.sendMessage.mockImplementation((_id, _msg, cb) =>
        cb(
          _msg.action === "getPageState"
            ? { ready: true }
            : {
                success: true,
                result: { success: true, filled: [], warnings: [], errors: [] },
              },
        ),
      );
      await ACGMEForm.fill(false);
      expect(document.getElementById("statusMessage").textContent).toContain(
        "filled",
      );
    });

    it("shows warnings in status when fill has warnings", async () => {
      mockTabOnAcgme();
      chrome.tabs.sendMessage.mockImplementation((_id, _msg, cb) =>
        cb(
          _msg.action === "getPageState"
            ? { ready: true }
            : {
                success: true,
                result: {
                  success: true,
                  filled: [],
                  warnings: ["Used default attending"],
                  errors: [],
                },
              },
        ),
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
    const savedCase = {
      caseId: "CASE-001",
      date: "01/15/2024",
      key: "new-server-record",
    };
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    function transport({
      baseline = [],
      recent = [savedCase],
      submit = { success: false, uncertain: true },
      onSubmit = () => {},
      warnings = [],
    } = {}) {
      let reads = 0;
      chrome.tabs.query.mockResolvedValue([{ id: 42, url: ACGME_URL }]);
      chrome.tabs.sendMessage.mockImplementation((_id, message, callback) => {
        if (message.action === "getPageState") callback({ ready: true });
        if (message.action === "fillCase")
          callback({
            success: true,
            result: { success: true, warnings, errors: [] },
          });
        if (message.action === "getRecentCases")
          callback({ success: true, cases: reads++ === 0 ? baseline : recent });
        if (message.action === "submitCase") {
          onSubmit();
          callback(submit);
        }
      });
    }
    async function finish(promise) {
      await vi.runAllTimersAsync();
      return promise;
    }

    it("marks a case submitted only after a new matching server row appears", async () => {
      transport();
      const result = await finish(ACGMEForm.fill(true));
      expect(result.submitted).toBe(true);
      expect(State.getCaseStatus(0)).toBe("submitted");
    });

    it.each(["channel", "port"])(
      "does not treat a closed message %s as proof of a save",
      async (kind) => {
        transport({
          recent: [],
          onSubmit: () =>
            Object.defineProperty(chrome.runtime, "lastError", {
              value: {
                message: `The message ${kind} closed before a response was received`,
              },
              configurable: true,
            }),
        });
        const promise = ACGMEForm.fill(true);
        await vi.advanceTimersByTimeAsync(1);
        Object.defineProperty(chrome.runtime, "lastError", {
          value: null,
          configurable: true,
        });
        const result = await finish(promise);
        expect(result.submitted).toBe(false);
        expect(result.uncertain).toBe(true);
        expect(State.getCaseStatus(0)).toBe("review");
      },
    );

    it("does not mistake an existing row for a new save", async () => {
      transport({ baseline: [savedCase] });
      const result = await finish(ACGMEForm.fill(true));
      expect(result.submitted).toBe(false);
      expect(result.uncertain).toBe(true);
    });

    it.each([
      { ...savedCase, caseId: "OTHER" },
      { ...savedCase, date: "1/16/2024" },
    ])("requires both the case ID and date to match", async (other) => {
      transport({ recent: [other] });
      const result = await finish(ACGMEForm.fill(true));
      expect(result.submitted).toBe(false);
    });

    it("does not submit without a valid baseline", async () => {
      transport({ baseline: null });
      const result = await finish(ACGMEForm.fill(true));
      expect(result.submitted).toBe(false);
      expect(
        chrome.tabs.sendMessage.mock.calls.some(
          ([, message]) => message.action === "submitCase",
        ),
      ).toBe(false);
    });

    it("allows retry only when the content script explicitly refused to click", async () => {
      transport({
        submit: {
          success: false,
          attempted: false,
          errors: ["Submit button is disabled."],
        },
      });
      const result = await finish(ACGMEForm.fill(true));
      expect(result.submitted).toBe(false);
      expect(result.errors).toContain("Submit button is disabled.");
      expect(State.getCaseStatus(0)).toBe("pending");
      expect(State.caseAttempts[0]).toBeUndefined();
    });

    it("confirms a dispatched save even if stale validation text was reported", async () => {
      transport({
        submit: { success: false, errors: ["Old validation error"] },
      });
      const result = await finish(ACGMEForm.fill(true));
      expect(result.submitted).toBe(true);
      expect(State.getCaseStatus(0)).toBe("submitted");
    });

    it("does not allow a retry after a dispatched save with validation text and no confirmation", async () => {
      transport({
        recent: [],
        submit: {
          success: false,
          attempted: true,
          errors: ["Date is required"],
        },
      });
      const result = await finish(ACGMEForm.fill(true));
      expect(result.uncertain).toBe(true);
      expect(result.errors).toContain("Date is required");
      expect(State.getCaseStatus(0)).toBe("review");
    });

    it("attributes a delayed response to the original case after navigation", async () => {
      State.setCases([{ caseId: "CASE-001" }, { caseId: "CASE-002" }]);
      transport({
        onSubmit: () => {
          State.currentIndex = 1;
        },
      });
      await finish(ACGMEForm.fill(true));
      expect(State.getCaseStatus(0)).toBe("submitted");
      expect(State.getCaseStatus(1)).toBe("pending");
    });

    it("does not apply an old response to a replacement session", async () => {
      transport({
        onSubmit: () => State.setCases([{ caseId: "NEW-SESSION" }]),
      });
      await finish(ACGMEForm.fill(true));
      expect(State.getCaseStatus(0)).toBe("pending");
    });

    it("cancels before submission when stopped during the delay", async () => {
      const controller = new AbortController();
      State.settings.submitDelay = 2;
      transport();
      const promise = ACGMEForm.fill(true, { signal: controller.signal });
      await vi.advanceTimersByTimeAsync(100);
      controller.abort();
      const result = await finish(promise);
      expect(result.cancelled).toBe(true);
      expect(
        chrome.tabs.sendMessage.mock.calls.some(
          ([, message]) => message.action === "submitCase",
        ),
      ).toBe(false);
    });

    it("leaves an already clicked submission reviewable after STOP", async () => {
      const controller = new AbortController();
      transport({ onSubmit: () => controller.abort() });
      const result = await finish(
        ACGMEForm.fill(true, { signal: controller.signal }),
      );
      expect(result.submitted).toBe(false);
      expect(result.uncertain).toBe(true);
      expect(State.getCaseStatus(0)).toBe("review");
    });

    it("rejects overlapping operations", async () => {
      transport();
      const first = ACGMEForm.fill(true);
      expect((await ACGMEForm.fill(false)).success).toBe(false);
      await finish(first);
      expect(ACGMEForm.busy).toBe(false);
    });

    it("retains fill warnings with a confirmed submission", async () => {
      transport({ warnings: ["Used default attending"] });
      State.settings.showWarnings = true;
      await finish(ACGMEForm.fill(true));
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Warning",
      );
    });

    it("treats verification exceptions after a click as an uncertain save", async () => {
      transport({
        onSubmit: () => {
          chrome.tabs.sendMessage.mockImplementation(() => {
            throw new Error("Connection lost");
          });
        },
      });
      const result = await finish(ACGMEForm.fill(true));
      expect(result.uncertain).toBe(true);
      expect(result.submitted).toBe(false);
      expect(State.getCaseStatus(0)).toBe("review");
    });

    it("times out an unresponsive content script", async () => {
      chrome.tabs.query.mockResolvedValue([{ id: 42, url: ACGME_URL }]);
      chrome.tabs.sendMessage.mockImplementation(() => {});
      const result = await finish(ACGMEForm.fill(true));
      expect(result.success).toBe(false);
      expect(State.getCaseStatus(0)).toBe("pending");
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
