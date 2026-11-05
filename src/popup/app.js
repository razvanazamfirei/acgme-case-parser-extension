/**
 * Application initialization and event handlers
 */

import { ACGMEForm } from "./acgme.js";
import { DOM, STATUS_TYPES } from "./constants.js";
import { Excel } from "./excel.js";
import { Form } from "./form.js";
import { Navigation } from "./navigation.js";
import { Settings } from "./settings.js";
import { State } from "./state.js";
import { Storage } from "./storage.js";
import { Target } from "./target.js";
import { UI } from "./ui.js";

const activeStyles = [
  "bg-orange-500",
  "hover:bg-orange-600",
  "border-orange-500",
];

const beastModeStyles = {
  paused: ["btn-primary"],
  inactive: ["btn-nav"],
};

const FileUpload = {
  requestId: 0,

  async handleFile(file) {
    if (!file) {
      return;
    }
    const requestId = ++this.requestId;

    const fileNameEl = UI.get(DOM.fileName);
    fileNameEl.textContent = file.name;
    fileNameEl.title = file.name;
    fileNameEl.classList.add("has-file");

    try {
      const result = await Excel.parseFile(file);
      if (requestId !== this.requestId) return;
      const { cases, mappingResult } = result;

      if (cases.length === 0) {
        UI.showStatus("No valid cases found in file", "error");
        return;
      }

      State.setCases(cases);
      Navigation.showCaseView();
      Form.populate(State.getCurrentCase());
      Navigation.update();
      Storage.saveState();

      // Show mapping status
      UI.showMappingStatus(mappingResult);

      const parseWarnings = mappingResult.warnings || [];
      const warningMsg =
        parseWarnings.length > 0 ? ` Warning: ${parseWarnings.join("; ")}` : "";
      UI.showStatus(
        `Loaded ${cases.length} cases${warningMsg}`,
        parseWarnings.length > 0 ? "info" : "success",
      );
    } catch (error) {
      if (requestId !== this.requestId) return;
      UI.showStatus(`Error parsing file: ${error.message}`, "error");
      console.error(error);
    }
  },

  openFilePicker() {
    const fileInput = UI.get(DOM.fileInput);
    fileInput.value = "";
    fileInput.click();
  },
};

const BeastMode = {
  isActive: false,
  shouldStop: false,
  isPaused: false,
  currentIndex: 0,
  resumeCallback: null,
  controller: null,
  runPending: false,

  disableActionButtons() {
    UI.bulkActive = true;
    UI.updateCaseActions();
  },

  enableActionButtons() {
    UI.bulkActive = false;
    UI.updateCaseActions();
  },
  async start() {
    if (this.isActive && !this.isPaused) {
      return;
    }

    // If resuming from pause, just resume
    if (this.isPaused) {
      this.resume();
      return;
    }

    if (this.runPending || ACGMEForm.busy) {
      UI.showStatus(
        "Waiting for the previous case operation to finish.",
        "info",
      );
      return;
    }
    this.runPending = true;
    this.controller = new AbortController();

    // Starting fresh
    this.isActive = true;
    this.shouldStop = false;
    this.isPaused = false;
    UI.bulkPaused = false;
    this.currentIndex = State.currentIndex;

    // Update UI
    const btn = UI.get(DOM.beastModeBtn);
    const text = UI.get(DOM.beastModeText);
    btn.classList.remove(...beastModeStyles.inactive);
    btn.classList.add(...activeStyles);
    text.textContent = "Stop batch";

    this.disableActionButtons();

    UI.progress(
      "Starting batch… You can switch tabs while this window stays open.",
    );

    try {
      await this.processAllPending();
    } catch (error) {
      console.error("Batch error:", error);
      UI.showStatus(`Batch error: ${error.message}`, "error");
    } finally {
      this.runPending = false;
      if (!this.isPaused) {
        this.stop();
      }
    }
  },

  pause(message) {
    this.isPaused = true;
    UI.bulkPaused = true;

    // Update UI to show paused state
    const btn = UI.get(DOM.beastModeBtn);
    const text = UI.get(DOM.beastModeText);
    btn.classList.remove(...activeStyles);
    btn.classList.add(...beastModeStyles.paused);
    text.textContent = "Continue batch";

    // Re-enable action buttons so user can fix things
    this.enableActionButtons();

    // The pause prompts offer a way out, so surface the control that provides it
    UI.showSection(DOM.beastModeStopBtn);

    UI.showStatus(message || "Batch paused", "warning");
  },

  resume() {
    this.isPaused = false;
    UI.bulkPaused = false;

    // Update UI back to active state
    const btn = UI.get(DOM.beastModeBtn);
    const text = UI.get(DOM.beastModeText);
    btn.classList.remove(...beastModeStyles.paused);
    btn.classList.add(...activeStyles);
    text.textContent = "Stop batch";

    // Disable action buttons again
    this.disableActionButtons();
    UI.hideSection(DOM.beastModeStopBtn);

    UI.progress("Continuing batch…");

    // Call the resume callback if it exists
    if (this.resumeCallback) {
      this.resumeCallback();
      this.resumeCallback = null;
    }
  },

  stop() {
    this.controller?.abort();
    this.isActive = false;
    this.shouldStop = true;
    this.isPaused = false;
    UI.bulkPaused = false;

    // A paused run is parked on this callback. It has to be settled, otherwise
    // processAllPending() waits forever on a run that is already over.
    const pendingResume = this.resumeCallback;
    this.resumeCallback = null;

    // Update UI
    const btn = UI.get(DOM.beastModeBtn);
    const text = UI.get(DOM.beastModeText);
    btn.classList.remove(...activeStyles, ...beastModeStyles.paused);
    btn.classList.add(...beastModeStyles.inactive);
    text.textContent = "Submit pending cases";

    // Re-enable action buttons
    this.enableActionButtons();
    UI.hideSection(DOM.beastModeStopBtn);

    pendingResume?.();
  },

  waitForResume() {
    return new Promise((resolve) => {
      this.resumeCallback = resolve;
    });
  },

  async processAllPending() {
    const cases = State.cases;
    const signal = this.controller?.signal;
    const stopped = () =>
      this.shouldStop || signal?.aborted || State.cases !== cases;
    const totalCases = cases.length;
    let processed = 0;
    const warnings = [];
    const showSummary = (message, type) =>
      UI.showStatus(
        `${message}${warnings.length ? ` Warnings: ${warnings.join("; ")}` : ""}`,
        warnings.length ? "warning" : type,
      );

    // Start from currentIndex (for resuming) or 0
    const startIndex = this.currentIndex || 0;

    const announceStop = () => {
      showSummary(`Batch stopped. Submitted ${processed} cases.`, "info");
    };

    for (let offset = 0; offset < totalCases; offset++) {
      const i = (startIndex + offset) % totalCases;
      this.currentIndex = i;

      if (stopped()) {
        announceStop();
        return;
      }

      // Wait if paused
      if (this.isPaused) {
        await this.waitForResume();
        if (stopped()) {
          announceStop();
          return;
        }
      }

      // Skip non-pending cases
      if (State.getCaseStatus(i) !== STATUS_TYPES.pending) {
        continue;
      }

      // Navigate to this case
      Navigation.goToCase(i);

      if (stopped()) {
        announceStop();
        return;
      }
      // A user may navigate while the delay or validation prompt is pending.
      if (State.currentIndex !== i) Navigation.goToCase(i);

      // Validate - pause if validation fails
      const validation = Form.validate();
      if (!validation.isValid) {
        UI.showValidation(validation);
        this.pause(
          `Batch paused at case ${i + 1}/${totalCases}. Please complete required fields (${validation.missing.join(", ")}) and choose Continue batch.`,
        );

        // Wait for user to fix and continue
        await this.waitForResume();
        if (stopped()) {
          announceStop();
          return;
        }

        if (State.currentIndex !== i) Navigation.goToCase(i);
        // Re-validate after user fixes
        const revalidation = Form.validate();
        if (!revalidation.isValid) {
          // Still invalid, pause again
          offset--; // Retry this case
          continue;
        }
      }

      // A paused case may have been submitted or skipped manually.
      if (State.getCaseStatus(i) !== STATUS_TYPES.pending) continue;

      try {
        // Fill and submit the case
        UI.showStatus(`Processing case ${i + 1}/${totalCases}...`, "info");

        const result = await ACGMEForm.fill(true, { signal });
        if (result?.uncertain) {
          showSummary(
            `Batch stopped at case ${i + 1}. ${result.errors.join("; ")}`,
            "warning",
          );
          return;
        }
        if (result?.success && result?.submitted) {
          processed++;
          if (State.settings.showWarnings && result.warnings?.length)
            warnings.push(`Case ${i + 1}: ${result.warnings.join("; ")}`);
        }
        if (stopped() || result?.cancelled) {
          announceStop();
          return;
        }

        if (result?.success && result?.submitted) {
          UI.showStatus(
            `Case ${i + 1}/${totalCases} submitted! (${processed} total)`,
            "success",
          );
        } else {
          console.warn(`Case ${i + 1} failed to submit:`, result);
          // Pause on submission failure
          this.pause(
            `Case ${i + 1} was not submitted. ${result?.errors?.join("; ") || "Check the ACGME form."} Choose Continue batch to retry, or Stop batch to finish later.`,
          );
          await this.waitForResume();
          if (stopped()) {
            announceStop();
            return;
          }
          offset--; // Retry this case
        }
      } catch (error) {
        if (stopped()) {
          announceStop();
          return;
        }
        console.error(`Error processing case ${i + 1}:`, error);
        this.pause(
          `Error processing case ${i + 1}: ${error.message}. Click CONTINUE to retry or STOP to end.`,
        );
        await this.waitForResume();
        if (stopped()) {
          announceStop();
          return;
        }
        offset--; // Retry this case
      }
    }

    // Reset current index
    this.currentIndex = 0;

    // Find next pending case or finish
    const nextPending = State.findNextPending(-1);
    if (nextPending === null) {
      showSummary(
        `Batch complete. Submitted ${processed} cases.${State.getStats().review ? ` ${State.getStats().review} case(s) still need review.` : ""}`,
        State.getStats().review ? "warning" : "success",
      );
    } else {
      Navigation.goToCase(nextPending);
      showSummary(
        `Processed ${processed} cases! ${State.getStats().pending} cases remaining.`,
        "success",
      );
    }
  },
};

const Session = {
  async clear() {
    if (
      !(await UI.confirm(
        "Clear all loaded cases and progress? This cannot be undone.",
      ))
    ) {
      return;
    }

    try {
      FileUpload.requestId++;
      BeastMode.stop();
      ACGMEForm.cancel();
      // Clear storage first
      await Storage.clearState();
      UI.setStorageError(false);
      UI.hideSection(DOM.recoveryPanel);
      UI.hideSection("caseActions");

      // Reset the file input completely
      const fileInput = UI.get(DOM.fileInput);
      fileInput.value = "";
      fileInput.type = "text";
      fileInput.type = "file";

      // Reset UI elements
      const fileNameEl = UI.get(DOM.fileName);
      fileNameEl.textContent = "No file chosen";
      fileNameEl.title = "No file chosen";
      fileNameEl.classList.remove("has-file");

      // Clear form fields if they exist
      const formFields = [
        DOM.caseId,
        DOM.date,
        DOM.attending,
        DOM.ageCategory,
        DOM.asa,
        DOM.anesthesia,
        DOM.procedureCategory,
        DOM.comments,
      ];

      formFields.forEach((fieldId) => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.value = "";
        }
      });

      // Clear checkboxes and radios
      document
        .querySelectorAll('input[type="checkbox"][name="airway"]')
        .forEach((cb) => {
          cb.checked = false;
        });
      document
        .querySelectorAll('input[type="checkbox"][name="vascular"]')
        .forEach((cb) => {
          cb.checked = false;
        });
      document
        .querySelectorAll('input[type="checkbox"][name="monitoring"]')
        .forEach((cb) => {
          cb.checked = false;
        });
      document
        .querySelectorAll(
          'input[type="checkbox"][name="neuraxialBlockadeSite"]',
        )
        .forEach((cb) => {
          cb.checked = false;
        });
      document
        .querySelectorAll(
          'input[type="checkbox"][name="peripheralNerveBlockadeSite"]',
        )
        .forEach((cb) => {
          cb.checked = false;
        });
      document
        .querySelectorAll('input[type="radio"][name="difficultAirway"]')
        .forEach((radio) => {
          radio.checked = radio.value === "";
        });
      document
        .querySelectorAll(
          'input[type="radio"][name="lifeThreateningPathology"]',
        )
        .forEach((radio) => {
          radio.checked = radio.value === "";
        });

      // Reset navigation counters
      const navElements = [
        DOM.currentIndex,
        DOM.totalCount,
        DOM.currentIndexBottom,
        DOM.totalCountBottom,
        DOM.pendingCount,
        DOM.submittedCount,
        DOM.skippedCount,
        DOM.reviewCount,
      ];

      navElements.forEach((elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
          element.textContent = "0";
        }
      });

      // Clear jump dropdown
      const jumpSelect = UI.get(DOM.caseJump);
      if (jumpSelect) {
        jumpSelect.innerHTML = "";
      }

      // Hide validation summary
      const validationSummary = UI.get(DOM.validationSummary);
      if (validationSummary) {
        validationSummary.classList.add("hidden");
      }

      // Reset button states
      const fillSubmitBtn = UI.get(DOM.fillSubmitBtn);
      if (fillSubmitBtn) {
        fillSubmitBtn.disabled = false;
      }

      // Hide case preview and navigation sections
      UI.hideSection(DOM.navSection);
      UI.hideSection(DOM.previewSection);
      UI.hideSection(DOM.neuraxialBlockadeSection);
      UI.hideSection(DOM.peripheralBlockadeSection);

      // Show upload section
      UI.showSection(DOM.uploadSection);

      // Clear any status messages
      UI.hideStatus();

      UI.showStatus("Session cleared - ready for new file", "success");
    } catch (error) {
      console.error("Error clearing session:", error);
      UI.showStatus("Error clearing session", "error");
    }
  },

  async restore() {
    const restored = await Storage.loadState();
    if (restored) {
      Navigation.showCaseView();
      Form.populate(State.getCurrentCase());
      Navigation.update();
      UI.showStatus(
        `Restored ${State.cases.length} cases from previous session`,
        "info",
      );
    }
  },
};

const Metadata = {
  setVersion() {
    const versionEl = UI.get(DOM.appVersion);
    if (!versionEl) {
      return;
    }

    const version = globalThis.chrome?.runtime?.getManifest?.()?.version;
    versionEl.textContent = version ? `v${version}` : "v-";
  },
};

const EventHandlers = {
  register() {
    const addListener = (id, event, handler) => {
      const element = UI.get(id);
      if (!element) {
        if (process.env.NODE_ENV === "development") {
          console.error(`Element not found: ${id}`);
        }
        return;
      }
      element.addEventListener(event, (...args) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`Button clicked: ${id}`);
        }
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${id} handler:`, error);
        }
      });
    };

    const showAcgme = async () => {
      try {
        await Target.show();
      } catch (error) {
        UI.showStatus(error.message, "error");
      }
    };
    addListener(DOM.showAcgmeBtn, "click", showAcgme);
    addListener(DOM.openAcgmeBtn, "click", showAcgme);
    addListener(DOM.nextPendingBtn, "click", () =>
      Navigation.goToNextPending(),
    );

    // Persist edits as they happen so closing the popup also keeps corrections.
    for (const event of ["input", "change"]) {
      UI.get(DOM.previewSection)?.addEventListener(event, (e) => {
        e.target
          .closest(".form-field, .blockade-section")
          ?.querySelector(".match-badge")
          ?.remove();
        Form.saveCurrent();
        UI.updateCaseActions();
        Storage.saveState();
      });
    }

    // Upload
    addListener(DOM.uploadBtn, "click", () => FileUpload.openFilePicker());
    addListener(DOM.fileInput, "change", (e) =>
      FileUpload.handleFile(e.target.files[0]),
    );

    // Navigation
    addListener(DOM.prevBtn, "click", () =>
      Navigation.goToCase(State.currentIndex - 1),
    );
    addListener(DOM.nextBtn, "click", () =>
      Navigation.goToCase(State.currentIndex + 1),
    );
    addListener(DOM.prevBtnBottom, "click", () =>
      Navigation.goToCase(State.currentIndex - 1),
    );
    addListener(DOM.nextBtnBottom, "click", () =>
      Navigation.goToCase(State.currentIndex + 1),
    );
    addListener(DOM.caseJump, "change", (e) =>
      Navigation.goToCase(Number.parseInt(e.target.value, 10)),
    );
    addListener(DOM.filterPending, "change", () => Navigation.update());

    // Actions
    addListener(DOM.skipBtn, "click", () => {
      Form.saveCurrent();
      delete State.caseAttempts[State.currentIndex];
      State.setCaseStatus(State.currentIndex, STATUS_TYPES.skipped);
      Navigation.update();
      Storage.saveState();
      Navigation.goToNextPending();
    });

    addListener(DOM.fillBtn, "click", async () => {
      const validation = Form.validate();
      UI.showValidation(validation);
      if (!validation.isValid) {
        UI.showStatus(
          `Complete required fields: ${validation.missing.join(", ")}`,
          "error",
        );
        return;
      }

      await ACGMEForm.fill(false);
    });

    addListener(DOM.fillSubmitBtn, "click", async () => {
      const validation = Form.validate();

      UI.showValidation(validation);
      if (!validation.isValid) {
        UI.showStatus(
          `Complete required fields: ${validation.missing.join(", ")}`,
          "error",
        );
        return;
      }
      const cases = State.cases;
      const index = State.currentIndex;
      const result = await ACGMEForm.fill(true);
      if (
        result?.submitted &&
        State.cases === cases &&
        State.currentIndex === index
      ) {
        Navigation.goToNextPending();
        const warnings = State.settings.showWarnings
          ? result.warnings || []
          : [];
        UI.showStatus(
          `Case ${index + 1} saved in ACGME.${warnings.length ? ` Warning: ${warnings.join("; ")}` : ""}`,
          warnings.length ? "warning" : "success",
        );
      }
    });

    addListener(DOM.cancelOperationBtn, "click", () => {
      if (BeastMode.isActive) BeastMode.stop();
      ACGMEForm.cancel();
      UI.progress(
        "Stopping… Checking whether a submission was already attempted.",
      );
    });
    const advanceAfterSave = (message) => {
      Navigation.goToNextPending();
      const review = State.getStats().review;
      UI.showStatus(
        `${message}${review ? ` ${review} case(s) still need review.` : ""}`,
        review ? "warning" : "success",
      );
    };
    addListener(DOM.recheckBtn, "click", async () => {
      const cases = State.cases;
      const index = State.currentIndex;
      await ACGMEForm.recheck();
      if (
        State.cases === cases &&
        State.currentIndex === index &&
        State.getCaseStatus(index) === STATUS_TYPES.submitted
      )
        advanceAfterSave(`Case ${index + 1} saved in ACGME.`);
    });
    const markSaved = () => {
      if (ACGMEForm.busy || UI.bulkActive) return;
      const index = State.currentIndex;
      State.setCaseStatus(index, STATUS_TYPES.submitted);
      delete State.caseAttempts[index];
      Navigation.update();
      Storage.saveState();
      advanceAfterSave(`Case ${index + 1} marked submitted.`);
    };
    addListener(DOM.markSavedBtn, "click", markSaved);
    addListener(DOM.markManualBtn, "click", markSaved);
    const returnToPending = () => {
      if (ACGMEForm.busy || UI.bulkActive) return;
      State.setCaseStatus(State.currentIndex, STATUS_TYPES.pending);
      delete State.caseAttempts[State.currentIndex];
      Navigation.update();
      Storage.saveState();
      UI.showStatus("Returned to pending.", "info");
    };
    addListener(DOM.returnPendingBtn, "click", returnToPending);
    addListener(DOM.resetStatusBtn, "click", returnToPending);
    addListener(DOM.reviewCasesBtn, "click", () => {
      const index = State.cases.findIndex(
        (_, i) => State.getCaseStatus(i) === STATUS_TYPES.review,
      );
      if (index >= 0) Navigation.goToCase(index);
    });
    addListener(DOM.retrySaveBtn, "click", () => Storage.saveState());

    // BEAST Mode
    addListener(DOM.beastModeBtn, "click", () => {
      if (BeastMode.isPaused) {
        // Resume from pause
        BeastMode.start();
      } else if (BeastMode.isActive) {
        // Stop active BEAST mode
        BeastMode.stop();
      } else {
        // Start fresh
        BeastMode.start();
      }
    });
    addListener(DOM.beastModeStopBtn, "click", () => BeastMode.stop());

    // Settings
    addListener(DOM.settingsToggle, "click", () => Settings.toggle());
    addListener(DOM.settingSubmitDelay, "input", (e) => {
      UI.get(DOM.submitDelayValue).textContent = `${e.target.value}s`;
    });
    addListener(DOM.saveSettingsBtn, "click", () => Settings.save());
    addListener(DOM.clearSessionBtn, "click", () => Session.clear());

    // ASA field - auto-check 5E pathology
    addListener(DOM.asa, "change", (e) => {
      const isFiveE = e.target.value === "5E";
      const currentPathology = Form.getRadioGroup("lifeThreateningPathology");

      if (State.settings.auto5EPathology && isFiveE && !currentPathology) {
        Form.setRadioGroup("lifeThreateningPathology", "Non-Trauma");
      }

      // Real-time validation
      const validation = Form.validate();
      UI.showValidation(validation);
    });

    // Real-time validation for other required fields
    const requiredFields = [
      DOM.attending,
      DOM.anesthesia,
      DOM.procedureCategory,
    ];
    requiredFields.forEach((fieldId) => {
      addListener(fieldId, "change", () => {
        if (fieldId === DOM.anesthesia) {
          Form.syncBlockadeSiteVisibility();
        }
        const validation = Form.validate();
        UI.showValidation(validation);
      });
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (State.cases.length === 0 || UI.operationActive || UI.bulkActive) {
        return;
      }

      const isInputFocused = e.target.matches("input, textarea, select");

      if (e.key === "ArrowLeft" && !isInputFocused) {
        e.preventDefault();
        Navigation.goToCase(State.currentIndex - 1);
      } else if (e.key === "ArrowRight" && !isInputFocused) {
        e.preventDefault();
        Navigation.goToCase(State.currentIndex + 1);
      }
    });

    if (process.env.NODE_ENV === "development") {
      console.log("Event handlers registered successfully");
    }
  },
};

const App = {
  async init() {
    try {
      Metadata.setVersion();
      await Storage.loadSettings();
      Settings.applyToUI();
      await Session.restore();
      Form.syncBlockadeSiteVisibility();
      EventHandlers.register();
      if (process.env.NODE_ENV === "development") {
        console.log("ACGME Case Submitter initialized successfully");
      }
    } catch (error) {
      console.error("Error initializing app:", error);
    }
  },
};

let appInitialized = false;

function initializeAppOnce() {
  if (appInitialized) {
    return;
  }
  appInitialized = true;
  void App.init();
}

function initializeAppOnLoad(mode = import.meta.env.MODE, doc = document) {
  if (mode === "test") {
    return;
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", initializeAppOnce, {
      once: true,
    });
  } else {
    initializeAppOnce();
  }
}

if (import.meta.env.MODE === "test") {
  globalThis.__APP_TEST_API__ = {
    FileUpload,
    BeastMode,
    Session,
    Metadata,
    EventHandlers,
    App,
    initializeAppOnLoad,
    resetAppInitializationForTests: () => {
      appInitialized = false;
    },
  };
}

initializeAppOnLoad();
