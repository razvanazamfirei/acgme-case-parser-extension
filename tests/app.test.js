import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/popup/acgme.js", () => ({
  ACGMEForm: { fill: vi.fn() },
}));
vi.mock("../src/popup/excel.js", () => ({
  Excel: { parseFile: vi.fn() },
}));
vi.mock("../src/popup/form.js", () => ({
  Form: {
    populate: vi.fn(),
    validate: vi.fn(() => ({
      isValid: true,
      missing: [],
      warnings: [],
      hasWarnings: false,
    })),
    getRadioGroup: vi.fn(() => ""),
    setRadioGroup: vi.fn(),
    getData: vi.fn(() => ({})),
  },
}));
vi.mock("../src/popup/navigation.js", () => ({
  Navigation: {
    showCaseView: vi.fn(),
    update: vi.fn(),
    goToCase: vi.fn(),
    goToNextPending: vi.fn(),
  },
}));
vi.mock("../src/popup/settings.js", () => ({
  Settings: { toggle: vi.fn(), save: vi.fn(), applyToUI: vi.fn() },
}));
vi.mock("../src/popup/storage.js", () => ({
  Storage: {
    loadSettings: vi.fn().mockResolvedValue(undefined),
    saveState: vi.fn(),
    loadState: vi.fn().mockResolvedValue(false),
    clearState: vi.fn().mockResolvedValue(undefined),
  },
}));

import { ACGMEForm } from "../src/popup/acgme.js";
// Import app.js AFTER mocks so its imports get the mocked versions.
// The module-level init guard `import.meta.env.MODE !== 'test'` prevents
// auto-initialization in vitest.
import "../src/popup/app.js";
import { Excel } from "../src/popup/excel.js";
import { Form } from "../src/popup/form.js";
import { Navigation } from "../src/popup/navigation.js";
import { Settings } from "../src/popup/settings.js";
import { State } from "../src/popup/state.js";
import { Storage } from "../src/popup/storage.js";

const appTestApi = globalThis.__APP_TEST_API__;

if (!appTestApi) {
  throw new Error("Expected __APP_TEST_API__ to be available in test mode.");
}

const {
  App,
  BeastMode,
  EventHandlers,
  FileUpload,
  Metadata,
  Session,
  initializeAppOnLoad,
  resetAppInitializationForTests,
} = appTestApi;

function buildAppDOM() {
  document.body.innerHTML = `
    <div id="uploadSection"></div>
    <div id="navSection" class="hidden"></div>
    <div id="previewSection" class="hidden"></div>
    <div id="statusSection" class="hidden">
      <span id="statusMessage"></span>
    </div>
    <button id="uploadBtn">Upload</button>
    <input type="file" id="fileInput" />
    <span id="fileName">No file chosen</span>
    <button id="prevBtn"></button>
    <button id="nextBtn"></button>
    <button id="prevBtnBottom"></button>
    <button id="nextBtnBottom"></button>
    <select id="caseJump"></select>
    <input type="checkbox" id="filterPending" />
    <div id="currentIndex">0</div>
    <div id="totalCount">0</div>
    <div id="currentIndexBottom">0</div>
    <div id="totalCountBottom">0</div>
    <div id="pendingCount">0</div>
    <div id="submittedCount">0</div>
    <div id="skippedCount">0</div>
    <button id="skipBtn">Skip</button>
    <button id="fillBtn">Fill</button>
    <button id="fillSubmitBtn">Fill & Submit</button>
    <button id="beastModeBtn" class="bg-red-500 hover:bg-red-600 border-red-500">
      <span id="beastModeText">START BEAST MODE</span>
    </button>
    <button id="settingsToggle">Settings</button>
    <input type="range" id="settingSubmitDelay" value="0.5" />
    <span id="submitDelayValue">0.5s</span>
    <button id="saveSettingsBtn">Save</button>
    <button id="clearSessionBtn">Clear</button>
    <select id="asa"><option value="">-</option></select>
    <input type="text" id="caseId" value="" />
    <input type="text" id="date" value="" />
    <input type="text" id="attending" value="" />
    <textarea id="comments"></textarea>
    <select id="ageCategory"><option value="">-</option></select>
    <select id="anesthesia"><option value="">-</option></select>
    <select id="procedureCategory"><option value="">-</option></select>
    <span id="caseStatus" class="status-badge pending">Pending</span>
    <div id="validationSummary" class="hidden">
      <span id="validationText"></span>
    </div>
    <dialog id="confirmDialog">
      <p id="confirmDialogMessage"></p>
      <button id="confirmDialogOk">OK</button>
      <button id="confirmDialogCancel">Cancel</button>
    </dialog>
    <span id="appVersion"></span>
    <div id="settingInstitutionContainer"></div>
    <input type="text" id="settingDefaultAttending" value="" />
    <input type="checkbox" id="settingCardiacAutoFill" />
    <input type="checkbox" id="settingAuto5EPathology" />
    <input type="checkbox" id="settingShowWarnings" />
    <select id="settingInstitution"><option value="">-</option></select>
  `;
}

describe("App components", () => {
  beforeEach(() => {
    buildAppDOM();
    State.reset();
    State.settings = {
      defaultInstitution: "",
      defaultAttending: "",
      submitDelay: 0,
      cardiacAutoFill: false,
      auto5EPathology: false,
      showWarnings: false,
    };
    vi.resetAllMocks();
    Storage.loadSettings.mockResolvedValue(undefined);
    Storage.loadState.mockResolvedValue(false);
  });

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  describe("Metadata.setVersion()", () => {
    it("sets the version text from manifest", () => {
      chrome.runtime.getManifest.mockReturnValue({ version: "1.2.3" });
      Metadata.setVersion();
      expect(document.getElementById("appVersion").textContent).toBe("v1.2.3");
    });

    it("shows 'v-' when getManifest is not available", () => {
      chrome.runtime.getManifest.mockReturnValue(null);
      Metadata.setVersion();
      expect(document.getElementById("appVersion").textContent).toBe("v-");
    });

    it("does nothing when appVersion element is missing", () => {
      document.getElementById("appVersion").remove();
      Metadata.setVersion(); // should not throw
    });
  });

  // -------------------------------------------------------------------------
  // FileUpload
  // -------------------------------------------------------------------------

  describe("FileUpload.handleFile()", () => {
    it("does nothing when file is null", async () => {
      await FileUpload.handleFile(null);
      expect(Excel.parseFile).not.toHaveBeenCalled();
    });

    it("shows error when parseFile throws", async () => {
      Excel.parseFile.mockRejectedValue(new Error("Bad file format"));
      await FileUpload.handleFile({ name: "bad.xlsx" });
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Error parsing file",
      );
    });

    it("shows error when no cases parsed", async () => {
      Excel.parseFile.mockResolvedValue({
        cases: [],
        mappingResult: {
          totalMapped: 0,
          totalExpected: 0,
          requiredMapped: 0,
          requiredExpected: 0,
          missingRequired: [],
          missingOptional: [],
        },
      });
      await FileUpload.handleFile({ name: "empty.xlsx" });
      expect(document.getElementById("statusMessage").textContent).toContain(
        "No valid cases",
      );
    });

    it("loads cases and shows success status", async () => {
      Excel.parseFile.mockResolvedValue({
        cases: [{ caseId: "C1" }],
        mappingResult: {
          totalMapped: 3,
          totalExpected: 3,
          requiredMapped: 3,
          requiredExpected: 3,
          missingRequired: [],
          missingOptional: [],
        },
      });
      await FileUpload.handleFile({ name: "cases.xlsx" });
      expect(Navigation.showCaseView).toHaveBeenCalled();
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Loaded 1 cases",
      );
    });

    it("includes parse warnings in load message", async () => {
      Excel.parseFile.mockResolvedValue({
        cases: [{ caseId: "C1" }],
        mappingResult: {
          totalMapped: 3,
          totalExpected: 3,
          requiredMapped: 3,
          requiredExpected: 3,
          missingRequired: [],
          missingOptional: [],
          warnings: ["Unknown procedure names: XYZ"],
        },
      });
      await FileUpload.handleFile({ name: "cases.xlsx" });
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Warning",
      );
    });
  });

  describe("FileUpload.openFilePicker()", () => {
    it("triggers click on file input", () => {
      const fileInput = document.getElementById("fileInput");
      const clickSpy = vi.spyOn(fileInput, "click");
      FileUpload.openFilePicker();
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Session
  // -------------------------------------------------------------------------

  describe("Session.restore()", () => {
    it("shows restored message when state is loaded", async () => {
      Storage.loadState.mockResolvedValue(true);
      State.setCases([{ caseId: "C1" }]);
      await Session.restore();
      expect(Navigation.showCaseView).toHaveBeenCalled();
    });

    it("does nothing when storage is empty", async () => {
      Storage.loadState.mockResolvedValue(false);
      await Session.restore();
      expect(Navigation.showCaseView).not.toHaveBeenCalled();
    });
  });

  describe("Session.clear()", () => {
    it("clears storage and resets UI when confirmed", async () => {
      // Mock UI.confirm → resolve true
      const dialog = document.getElementById("confirmDialog");
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();
      Storage.clearState.mockResolvedValue(undefined);

      const clearPromise = Session.clear();
      // Click OK to confirm
      document.getElementById("confirmDialogOk").click();
      await clearPromise;

      expect(Storage.clearState).toHaveBeenCalled();
    });

    it("does nothing when user cancels", async () => {
      const dialog = document.getElementById("confirmDialog");
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();

      const clearPromise = Session.clear();
      document.getElementById("confirmDialogCancel").click();
      await clearPromise;

      expect(Storage.clearState).not.toHaveBeenCalled();
    });

    it("resets checkbox and radio groups when clearing", async () => {
      vi.useFakeTimers();
      try {
        const dialog = document.getElementById("confirmDialog");
        dialog.showModal = vi.fn();
        dialog.close = vi.fn();
        Storage.clearState.mockResolvedValue(undefined);

        document.body.insertAdjacentHTML(
          "beforeend",
          `
            <input type="checkbox" name="airway" value="Oral ETT" checked />
            <input type="checkbox" name="vascular" value="Arterial Catheter" checked />
            <input type="checkbox" name="monitoring" value="TEE" checked />
            <input type="radio" name="difficultAirway" value="" />
            <input type="radio" name="difficultAirway" value="Unanticipated" checked />
            <input type="radio" name="lifeThreateningPathology" value="" />
            <input type="radio" name="lifeThreateningPathology" value="Trauma" checked />
          `,
        );

        const clearPromise = Session.clear();
        document.getElementById("confirmDialogOk").click();
        await clearPromise;
        await vi.runAllTimersAsync();

        expect(
          document.querySelector('input[name="airway"][value="Oral ETT"]')
            .checked,
        ).toBe(false);
        expect(
          document.querySelector(
            'input[name="vascular"][value="Arterial Catheter"]',
          ).checked,
        ).toBe(false);
        expect(
          document.querySelector('input[name="monitoring"][value="TEE"]')
            .checked,
        ).toBe(false);
        expect(
          document.querySelector('input[name="difficultAirway"][value=""]')
            .checked,
        ).toBe(true);
        expect(
          document.querySelector(
            'input[name="lifeThreateningPathology"][value=""]',
          ).checked,
        ).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it("shows error status when clearing session fails", async () => {
      const dialog = document.getElementById("confirmDialog");
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();
      const clearError = new Error("clear failed");
      Storage.clearState.mockRejectedValue(clearError);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const clearPromise = Session.clear();
      document.getElementById("confirmDialogOk").click();
      await clearPromise;

      expect(errorSpy).toHaveBeenCalledWith(
        "Error clearing session:",
        clearError,
      );
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Error clearing session",
      );
    });

    it("shows delayed success status after clearing", async () => {
      vi.useFakeTimers();
      const dialog = document.getElementById("confirmDialog");
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();
      Storage.clearState.mockResolvedValue(undefined);

      const clearPromise = Session.clear();
      document.getElementById("confirmDialogOk").click();
      await clearPromise;
      await vi.advanceTimersByTimeAsync(100);

      expect(document.getElementById("statusMessage").textContent).toContain(
        "Session cleared - ready for new file",
      );
      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // App.init
  // -------------------------------------------------------------------------

  describe("App.init()", () => {
    it("runs without throwing", async () => {
      Storage.loadSettings.mockResolvedValue(undefined);
      Storage.loadState.mockResolvedValue(false);
      await expect(App.init()).resolves.toBeUndefined();
    });

    it("logs successful initialization in development mode", async () => {
      const previousEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        Storage.loadSettings.mockResolvedValue(undefined);
        Storage.loadState.mockResolvedValue(false);
        await App.init();
        expect(logSpy).toHaveBeenCalledWith(
          "ACGME Case Submitter initialized successfully",
        );
      } finally {
        process.env.NODE_ENV = previousEnv;
      }
    });

    it("logs initialization error when setup fails", async () => {
      const initError = new Error("settings load failed");
      Storage.loadSettings.mockRejectedValue(initError);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(App.init()).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(
        "Error initializing app:",
        initError,
      );
    });
  });

  describe("initializeAppOnLoad()", () => {
    beforeEach(() => {
      resetAppInitializationForTests();
    });

    it("registers DOMContentLoaded handler when document is loading", () => {
      const addEventListener = vi.fn();
      const loadingDoc = { readyState: "loading", addEventListener };

      initializeAppOnLoad("development", loadingDoc);

      expect(addEventListener).toHaveBeenCalledWith(
        "DOMContentLoaded",
        expect.any(Function),
        { once: true },
      );
    });

    it("calls App.init immediately when document is already loaded", () => {
      const initSpy = vi.spyOn(App, "init").mockResolvedValue(undefined);
      const readyDoc = { readyState: "complete", addEventListener: vi.fn() };

      initializeAppOnLoad("development", readyDoc);

      expect(initSpy).toHaveBeenCalled();
    });

    it("does nothing in test mode", () => {
      const initSpy = vi.spyOn(App, "init").mockResolvedValue(undefined);
      const readyDoc = { readyState: "complete", addEventListener: vi.fn() };

      initializeAppOnLoad("test", readyDoc);

      expect(initSpy).not.toHaveBeenCalled();
    });

    it("initializes only once when called repeatedly during loading", () => {
      const initSpy = vi.spyOn(App, "init").mockResolvedValue(undefined);
      const listeners = new Map();
      const loadingDoc = {
        readyState: "loading",
        addEventListener: vi.fn((eventName, handler) => {
          listeners.set(eventName, handler);
        }),
      };

      initializeAppOnLoad("development", loadingDoc);
      initializeAppOnLoad("development", loadingDoc);

      const onDomContentLoaded = listeners.get("DOMContentLoaded");
      onDomContentLoaded();
      onDomContentLoaded();

      expect(initSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // BeastMode
  // -------------------------------------------------------------------------

  describe("BeastMode", () => {
    beforeEach(() => {
      State.setCases([{ caseId: "C1" }, { caseId: "C2" }]);
      BeastMode.isActive = false;
      BeastMode.isPaused = false;
      BeastMode.shouldStop = false;
      BeastMode.currentIndex = 0;
      BeastMode.resumeCallback = null;
    });

    it("stop() resets BeastMode state and re-enables buttons", () => {
      BeastMode.isActive = true;
      BeastMode.stop();
      expect(BeastMode.isActive).toBe(false);
      expect(BeastMode.shouldStop).toBe(true);
      expect(document.getElementById("fillBtn").disabled).toBe(false);
    });

    it("pause() sets isPaused and re-enables action buttons", () => {
      BeastMode.isActive = true;
      BeastMode.pause("Paused for review");
      expect(BeastMode.isPaused).toBe(true);
      expect(document.getElementById("fillBtn").disabled).toBe(false);
    });

    it("resume() clears isPaused and calls resumeCallback", () => {
      const cb = vi.fn();
      BeastMode.isPaused = true;
      BeastMode.resumeCallback = cb;
      BeastMode.resume();
      expect(BeastMode.isPaused).toBe(false);
      expect(cb).toHaveBeenCalled();
    });

    it("start() returns early when already active and not paused", async () => {
      BeastMode.isActive = true;
      BeastMode.isPaused = false;
      await BeastMode.start();
      // Nothing should change
      expect(BeastMode.isActive).toBe(true);
    });

    it("start() resumes when paused", async () => {
      BeastMode.isActive = true;
      BeastMode.isPaused = true;
      const resumeSpy = vi.spyOn(BeastMode, "resume");
      await BeastMode.start();
      expect(resumeSpy).toHaveBeenCalled();
    });

    it("processAllPending() processes pending cases", async () => {
      vi.useFakeTimers();
      State.setCases([{ caseId: "C1" }]);
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      ACGMEForm.fill.mockResolvedValue({ success: true, submitted: true });
      Navigation.goToCase.mockImplementation(() => {});

      BeastMode.isActive = true;
      BeastMode.shouldStop = false;
      const promise = BeastMode.processAllPending();
      await vi.runAllTimersAsync();
      await promise;

      expect(ACGMEForm.fill).toHaveBeenCalledWith(true);
      vi.useRealTimers();
    });

    it("processAllPending() skips non-pending cases", async () => {
      vi.useFakeTimers();
      State.setCases([{ caseId: "C1" }]);
      State.setCaseStatus(0, "submitted");
      BeastMode.isActive = true;
      BeastMode.shouldStop = false;

      const promise = BeastMode.processAllPending();
      await vi.runAllTimersAsync();
      await promise;

      expect(ACGMEForm.fill).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("processAllPending() stops when shouldStop is set", async () => {
      vi.useFakeTimers();
      State.setCases([{ caseId: "C1" }, { caseId: "C2" }]);
      BeastMode.shouldStop = true;
      BeastMode.isActive = true;

      const promise = BeastMode.processAllPending();
      await vi.runAllTimersAsync();
      await promise;

      expect(ACGMEForm.fill).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("processAllPending() pauses on fill failure and retries", async () => {
      vi.useFakeTimers();
      State.setCases([{ caseId: "C1" }]);
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });

      // First call fails, then stop
      let fillCount = 0;
      ACGMEForm.fill.mockImplementation(async () => {
        fillCount++;
        if (fillCount === 1) {
          return { success: false, errors: ["Validation error"] };
        }
        BeastMode.shouldStop = true;
        return { success: true, submitted: true };
      });
      Navigation.goToCase.mockImplementation(() => {});

      BeastMode.isActive = true;
      BeastMode.shouldStop = false;
      const promise = BeastMode.processAllPending();

      // Advance timers to trigger page load wait
      await vi.advanceTimersByTimeAsync(2000);

      // BeastMode is now paused — trigger resume
      if (BeastMode.isPaused) {
        BeastMode.resume();
      }

      await vi.runAllTimersAsync();
      await promise;

      expect(fillCount).toBeGreaterThanOrEqual(1);
      vi.useRealTimers();
    });

    it("start() fresh activates BeastMode and calls processAllPending", async () => {
      const processSpy = vi
        .spyOn(BeastMode, "processAllPending")
        .mockResolvedValue();
      BeastMode.isActive = false;
      BeastMode.isPaused = false;
      await BeastMode.start();
      expect(processSpy).toHaveBeenCalled();
    });

    it("start() handles processAllPending errors", async () => {
      const startError = new Error("beast failed");
      const processSpy = vi
        .spyOn(BeastMode, "processAllPending")
        .mockRejectedValue(startError);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await BeastMode.start();

      expect(processSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith("BEAST mode error:", startError);
      expect(document.getElementById("statusMessage").textContent).toContain(
        "BEAST mode error: beast failed",
      );
    });

    it("processAllPending() waits for resume when already paused", async () => {
      vi.useFakeTimers();
      State.setCases([{ caseId: "C1" }]);
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      ACGMEForm.fill.mockResolvedValue({ success: true, submitted: true });
      Navigation.goToCase.mockImplementation(() => {});

      BeastMode.isActive = true;
      BeastMode.isPaused = true;
      BeastMode.shouldStop = false;

      const promise = BeastMode.processAllPending();
      await Promise.resolve();
      BeastMode.resume();
      await vi.runAllTimersAsync();
      await promise;

      expect(ACGMEForm.fill).toHaveBeenCalledWith(true);
      vi.useRealTimers();
    });

    it("processAllPending() retries when revalidation still fails", async () => {
      vi.useFakeTimers();
      State.setCases([{ caseId: "C1" }]);
      Form.validate
        .mockReturnValueOnce({
          isValid: false,
          missing: ["Attending"],
          warnings: [],
          hasWarnings: false,
        })
        .mockReturnValueOnce({
          isValid: false,
          missing: ["Attending"],
          warnings: [],
          hasWarnings: false,
        })
        .mockReturnValue({
          isValid: true,
          missing: [],
          warnings: [],
          hasWarnings: false,
        });
      ACGMEForm.fill.mockResolvedValue({ success: true, submitted: true });
      Navigation.goToCase.mockImplementation(() => {});
      BeastMode.isActive = true;
      BeastMode.shouldStop = false;
      const promise = BeastMode.processAllPending();

      await vi.advanceTimersByTimeAsync(2000);
      if (BeastMode.isPaused) {
        BeastMode.resume();
      }

      await vi.runAllTimersAsync();
      await promise;

      expect(Form.validate).toHaveBeenCalledTimes(3);
      expect(ACGMEForm.fill).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it("processAllPending() retries after thrown fill error", async () => {
      vi.useFakeTimers();
      State.setCases([{ caseId: "C1" }]);
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      const fillError = new Error("network");
      ACGMEForm.fill
        .mockRejectedValueOnce(fillError)
        .mockResolvedValueOnce({ success: true, submitted: true });
      Navigation.goToCase.mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      BeastMode.isActive = true;
      BeastMode.shouldStop = false;
      const promise = BeastMode.processAllPending();

      await vi.advanceTimersByTimeAsync(2000);
      if (BeastMode.isPaused) {
        BeastMode.resume();
      }

      await vi.runAllTimersAsync();
      await promise;

      expect(errorSpy).toHaveBeenCalledWith(
        "Error processing case 1:",
        fillError,
      );
      expect(ACGMEForm.fill).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // EventHandlers
  // -------------------------------------------------------------------------

  describe("EventHandlers", () => {
    beforeEach(() => {
      EventHandlers.register();
    });

    it("uploadBtn click calls FileUpload.openFilePicker", () => {
      const spy = vi
        .spyOn(FileUpload, "openFilePicker")
        .mockImplementation(() => {});
      document.getElementById("uploadBtn").click();
      expect(spy).toHaveBeenCalled();
    });

    it("fileInput change calls FileUpload.handleFile with selected file", () => {
      const spy = vi
        .spyOn(FileUpload, "handleFile")
        .mockResolvedValue(undefined);
      const fileInput = document.getElementById("fileInput");
      Object.defineProperty(fileInput, "files", {
        value: [{ name: "test.xlsx" }],
        configurable: true,
      });
      fileInput.dispatchEvent(new Event("change"));
      expect(spy).toHaveBeenCalledWith({ name: "test.xlsx" });
    });

    it("prevBtn click navigates to previous case", () => {
      State.currentIndex = 2;
      document.getElementById("prevBtn").click();
      expect(Navigation.goToCase).toHaveBeenCalledWith(1);
    });

    it("nextBtn click navigates to next case", () => {
      State.currentIndex = 0;
      document.getElementById("nextBtn").click();
      expect(Navigation.goToCase).toHaveBeenCalledWith(1);
    });

    it("prevBtnBottom click navigates to previous case", () => {
      State.currentIndex = 1;
      document.getElementById("prevBtnBottom").click();
      expect(Navigation.goToCase).toHaveBeenCalledWith(0);
    });

    it("nextBtnBottom click navigates to next case", () => {
      State.currentIndex = 0;
      document.getElementById("nextBtnBottom").click();
      expect(Navigation.goToCase).toHaveBeenCalledWith(1);
    });

    it("caseJump change navigates to selected index", () => {
      const select = document.getElementById("caseJump");
      const option = document.createElement("option");
      option.value = "2";
      select.appendChild(option);
      select.value = "2";
      select.dispatchEvent(new Event("change"));
      expect(Navigation.goToCase).toHaveBeenCalledWith(2);
    });

    it("filterPending change calls Navigation.update", () => {
      document
        .getElementById("filterPending")
        .dispatchEvent(new Event("change"));
      expect(Navigation.update).toHaveBeenCalled();
    });

    it("skipBtn click marks case skipped and navigates", () => {
      State.setCases([{ caseId: "C1" }]);
      State.currentIndex = 0;
      document.getElementById("skipBtn").click();
      expect(State.getCaseStatus(0)).toBe("skipped");
      expect(Navigation.update).toHaveBeenCalled();
      expect(Storage.saveState).toHaveBeenCalled();
      expect(Navigation.goToNextPending).toHaveBeenCalled();
    });

    it("fillBtn click with invalid form shows validation and skips fill", () => {
      Form.validate.mockReturnValue({
        isValid: false,
        missing: ["Attending"],
        warnings: [],
        hasWarnings: false,
      });
      document.getElementById("fillBtn").click();
      expect(ACGMEForm.fill).not.toHaveBeenCalled();
    });

    it("fillBtn click with valid form calls ACGMEForm.fill(false)", async () => {
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      ACGMEForm.fill.mockResolvedValue({ success: true, submitted: false });
      document.getElementById("fillBtn").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ACGMEForm.fill).toHaveBeenCalledWith(false);
    });

    it("fillBtn click with warnings still fills", async () => {
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: ["ASA missing"],
        hasWarnings: true,
      });
      ACGMEForm.fill.mockResolvedValue({ success: true, submitted: false });
      document.getElementById("fillBtn").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ACGMEForm.fill).toHaveBeenCalledWith(false);
    });

    it("fillSubmitBtn click calls ACGMEForm.fill(true)", async () => {
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      ACGMEForm.fill.mockResolvedValue({ success: false, submitted: false });
      document.getElementById("fillSubmitBtn").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ACGMEForm.fill).toHaveBeenCalledWith(true);
    });

    it("fillSubmitBtn schedules goToNextPending after successful submit", async () => {
      vi.useFakeTimers();
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      ACGMEForm.fill.mockResolvedValue({ success: true, submitted: true });

      document.getElementById("fillSubmitBtn").click();
      await vi.runAllTimersAsync();

      expect(Navigation.goToNextPending).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("fillSubmitBtn with invalid form shows warning but still fills", async () => {
      Form.validate.mockReturnValue({
        isValid: false,
        missing: ["Attending"],
        warnings: [],
        hasWarnings: false,
      });
      ACGMEForm.fill.mockResolvedValue({ success: false, submitted: false });
      document.getElementById("fillSubmitBtn").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ACGMEForm.fill).toHaveBeenCalledWith(true);
    });

    it("beastModeBtn click when inactive calls BeastMode.start", () => {
      BeastMode.isActive = false;
      BeastMode.isPaused = false;
      const startSpy = vi
        .spyOn(BeastMode, "start")
        .mockResolvedValue(undefined);
      document.getElementById("beastModeBtn").click();
      expect(startSpy).toHaveBeenCalled();
    });

    it("beastModeBtn click when active calls BeastMode.stop", () => {
      BeastMode.isActive = true;
      BeastMode.isPaused = false;
      const stopSpy = vi.spyOn(BeastMode, "stop").mockImplementation(() => {});
      document.getElementById("beastModeBtn").click();
      expect(stopSpy).toHaveBeenCalled();
    });

    it("beastModeBtn click when paused calls BeastMode.start (resume)", () => {
      BeastMode.isPaused = true;
      const startSpy = vi
        .spyOn(BeastMode, "start")
        .mockResolvedValue(undefined);
      document.getElementById("beastModeBtn").click();
      expect(startSpy).toHaveBeenCalled();
    });

    it("settingsToggle click calls Settings.toggle", () => {
      document.getElementById("settingsToggle").click();
      expect(Settings.toggle).toHaveBeenCalled();
    });

    it("settingSubmitDelay input updates submitDelayValue display", () => {
      const range = document.getElementById("settingSubmitDelay");
      range.value = "1.5";
      range.dispatchEvent(new Event("input"));
      expect(document.getElementById("submitDelayValue").textContent).toBe(
        "1.5s",
      );
    });

    it("saveSettingsBtn click calls Settings.save", () => {
      document.getElementById("saveSettingsBtn").click();
      expect(Settings.save).toHaveBeenCalled();
    });

    it("clearSessionBtn click calls Session.clear", () => {
      const clearSpy = vi.spyOn(Session, "clear").mockResolvedValue(undefined);
      document.getElementById("clearSessionBtn").click();
      expect(clearSpy).toHaveBeenCalled();
    });

    it("asa change runs form validation", () => {
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      document.getElementById("asa").dispatchEvent(new Event("change"));
      expect(Form.validate).toHaveBeenCalled();
    });

    it("asa change to 5E with auto5EPathology sets pathology radio", () => {
      State.settings.auto5EPathology = true;
      Form.getRadioGroup.mockReturnValue("");
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      const asa = document.getElementById("asa");
      const opt = document.createElement("option");
      opt.value = "5E";
      asa.appendChild(opt);
      asa.value = "5E";
      asa.dispatchEvent(new Event("change"));
      expect(Form.setRadioGroup).toHaveBeenCalledWith(
        "lifeThreateningPathology",
        "Non-Trauma",
      );
    });

    it("attending change triggers form validation", () => {
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      document.getElementById("attending").dispatchEvent(new Event("change"));
      expect(Form.validate).toHaveBeenCalled();
    });

    it("anesthesia change triggers form validation", () => {
      Form.validate.mockReturnValue({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      document.getElementById("anesthesia").dispatchEvent(new Event("change"));
      expect(Form.validate).toHaveBeenCalled();
    });

    it("ArrowLeft key navigates to previous case", () => {
      State.setCases([{ caseId: "C1" }, { caseId: "C2" }]);
      State.currentIndex = 1;
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
      expect(Navigation.goToCase).toHaveBeenCalledWith(0);
    });

    it("ArrowRight key navigates to next case", () => {
      State.setCases([{ caseId: "C1" }, { caseId: "C2" }]);
      State.currentIndex = 0;
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      expect(Navigation.goToCase).toHaveBeenCalledWith(1);
    });

    it("arrow keys do nothing when no cases loaded", () => {
      State.reset();
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
      expect(Navigation.goToCase).not.toHaveBeenCalled();
    });

    it("arrow keys do nothing when an input has focus", () => {
      State.setCases([{ caseId: "C1" }, { caseId: "C2" }]);
      const input = document.getElementById("caseId");
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
      expect(Navigation.goToCase).not.toHaveBeenCalled();
    });

    it("addListener catches handler errors without throwing", () => {
      Navigation.goToCase.mockImplementation(() => {
        throw new Error("nav error");
      });
      // Should not throw even though handler throws
      expect(() => document.getElementById("nextBtn").click()).not.toThrow();
    });

    it("logs missing elements in development mode", () => {
      const previousEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        document.getElementById("uploadBtn").remove();
        EventHandlers.register();
        expect(errorSpy).toHaveBeenCalledWith("Element not found: uploadBtn");
      } finally {
        process.env.NODE_ENV = previousEnv;
      }
    });

    it("logs registration and button clicks in development mode", () => {
      const previousEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        EventHandlers.register();
        document.getElementById("nextBtn").click();
        expect(logSpy).toHaveBeenCalledWith(
          "Event handlers registered successfully",
        );
        expect(logSpy).toHaveBeenCalledWith("Button clicked: nextBtn");
      } finally {
        process.env.NODE_ENV = previousEnv;
      }
    });
  });
});
