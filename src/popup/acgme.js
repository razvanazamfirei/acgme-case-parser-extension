/** Fill, submit, and recover individual cases. */
import { STATUS_TYPES } from "./constants.js";
import { Form } from "./form.js";
import { Navigation } from "./navigation.js";
import { State } from "./state.js";
import { Storage } from "./storage.js";
import { Target } from "./target.js";
import { UI } from "./ui.js";

function sendMessage(tabId, message) {
  return new Promise((resolve) => {
    const timer = setTimeout(
      () =>
        resolve({
          success: false,
          uncertain: true,
          errors: ["ACGME page did not respond."],
        }),
      6000,
    );
    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timer);
      resolve(
        chrome.runtime.lastError
          ? {
              success: false,
              uncertain: true,
              errors: ["Connection to the ACGME page was interrupted."],
            }
          : response || {
              success: false,
              uncertain: true,
              errors: ["No response from the ACGME page content script."],
            },
      );
    });
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizedDate = (value) => String(value).replace(/\b0+(\d)/g, "$1");

async function confirmSubmission(attempt, cancelled) {
  const previousKeys = new Set(attempt.baseline.map((entry) => entry.key));
  const deadline = Date.now() + 15000;
  do {
    if (cancelled()) return false;
    const response = await sendMessage(attempt.tabId, {
      action: "getRecentCases",
    });
    if (
      response.success &&
      Array.isArray(response.cases) &&
      response.cases.some(
        (entry) =>
          entry.caseId === attempt.caseId &&
          normalizedDate(entry.date) === normalizedDate(attempt.date) &&
          !previousKeys.has(entry.key),
      )
    )
      return true;
    if (cancelled()) return false;
    await wait(500);
  } while (Date.now() < deadline);
  return false;
}

async function waitForPage(tabId, cancelled) {
  const deadline = Date.now() + 8000;
  do {
    if (cancelled()) return false;
    // The old document can still answer messages while a save navigation is pending.
    const tab = await chrome.tabs.get(tabId);
    if (cancelled()) return false;
    if (tab.status === "loading") {
      await wait(250);
      continue;
    }
    const response = await sendMessage(tabId, { action: "getPageState" });
    if (response.blocked) throw new Error(response.errors.join("; "));
    if (response.ready) return true;
    if (cancelled()) return false;
    await wait(250);
  } while (Date.now() < deadline);
  throw new Error(
    "ACGME case entry is not ready. Open the case entry form and try again.",
  );
}

function refreshCase() {
  Form.updateStatusBadge();
  Navigation.update();
}

export const ACGMEForm = {
  busy: false,
  controller: null,
  cancel() {
    this.controller?.abort();
  },

  async fill(andSubmit = false, { signal } = {}) {
    if (this.busy)
      return {
        success: false,
        errors: ["Another case operation is still running."],
      };
    if (State.getCaseStatus(State.currentIndex) !== STATUS_TYPES.pending) {
      UI.showStatus(
        "Check this case's status before submitting it again.",
        "warning",
      );
      return { success: false, errors: ["This case is not pending."] };
    }
    if (process.env.NODE_ENV === "development")
      console.log("ACGMEForm.fill called, andSubmit:", andSubmit);
    this.busy = true;
    this.controller = new AbortController();
    const controller = this.controller;
    const cases = State.cases;
    const index = State.currentIndex;
    const originalCase = cases[index];
    let submissionAttempted = false;
    let prepared = false;
    const ownsCase = () =>
      State.cases === cases && cases[index] === originalCase;
    const cancelled = () =>
      signal?.aborted || controller.signal.aborted || !ownsCase();
    const cancellation = () => {
      if (prepared && !submissionAttempted && ownsCase()) {
        State.setCaseStatus(index, STATUS_TYPES.pending);
        delete State.caseAttempts[index];
        Storage.saveState();
      }
      if (ownsCase())
        UI.showStatus(
          "Stopped before submission. This case is still pending.",
          "info",
          { persistent: true },
        );
      return {
        success: false,
        submitted: false,
        cancelled: true,
        errors: ["Case operation stopped before submission."],
      };
    };
    const progress = (message) => {
      if (ownsCase())
        UI.progress(`Case ${index + 1}/${cases.length}: ${message}`);
    };
    try {
      Form.saveCurrent();
      const caseData = Form.getData();
      UI.setOperation(true);
      progress("connecting to ACGME…");
      const tab = await Target.get();
      if (cancelled()) return cancellation();
      progress("waiting for the case entry form…");
      await waitForPage(tab.id, cancelled);
      if (cancelled()) return cancellation();
      progress("filling the form…");
      if (State.caseAttempts[index]?.kind === "manual")
        delete State.caseAttempts[index];
      const response = await sendMessage(tab.id, {
        action: "fillCase",
        data: caseData,
        autoSubmit: false,
      });
      const result = (response.success ? response.result : response) || {
        success: false,
        errors: ["Invalid fill response from the ACGME page."],
      };
      result.submitted = false;
      // A failed fill is safe to retry; uncertainty matters only after a submit attempt.
      result.uncertain = false;
      if (cancelled()) return cancellation();
      if (result.success) {
        State.caseAttempts[index] = {
          kind: "manual",
          caseId: caseData.caseId,
          date: caseData.date,
        };
        if (andSubmit) {
          progress("preparing to submit…");
          const earliestSubmit =
            Date.now() + Math.round(State.settings.submitDelay * 1000);
          const baseline = await sendMessage(tab.id, {
            action: "getRecentCases",
          });
          if (cancelled()) return cancellation();
          if (!baseline.success || !Array.isArray(baseline.cases)) {
            result.errors = [
              "The form is filled. Open ACGME to submit it, then choose Mark submitted here.",
            ];
          } else {
            await wait(Math.max(0, earliestSubmit - Date.now()));
            if (cancelled()) return cancellation();
            const attempt = {
              kind: "submission",
              tabId: tab.id,
              caseId: caseData.caseId,
              date: caseData.date,
              baseline: baseline.cases.map(({ key }) => ({ key })),
            };
            State.caseAttempts[index] = attempt;
            State.setCaseStatus(index, STATUS_TYPES.review);
            prepared = true;
            // Persist before sending: closing the popup must never make a possible save retryable.
            if (!(await Storage.saveState())) {
              if (ownsCase()) {
                State.setCaseStatus(index, STATUS_TYPES.pending);
                delete State.caseAttempts[index];
              }
              prepared = false;
              throw new Error(
                "Progress could not be saved on this device. Retry saving progress before submitting.",
              );
            }
            if (cancelled()) return cancellation();
            progress("submitting…");
            submissionAttempted = true;
            const submitted = await sendMessage(tab.id, {
              action: "submitCase",
              data: caseData,
            });
            if (submitted.attempted === false) {
              if (ownsCase()) {
                State.setCaseStatus(index, STATUS_TYPES.pending);
                delete State.caseAttempts[index];
              }
              result.errors = submitted.errors || [
                "Submission was rejected. Check the ACGME form.",
              ];
            } else {
              progress("checking that ACGME saved the case…");
              result.submitted = await confirmSubmission(attempt, cancelled);
              if (!result.submitted) {
                result.uncertain = true;
                result.errors = [
                  ...(submitted.attempted ? submitted.errors || [] : []),
                  "Save not confirmed. This case needs review before it can be submitted again.",
                ];
              }
            }
          }
        }
      }
      if (ownsCase()) this._handleFillResult(result, andSubmit, index);
      return result;
    } catch (error) {
      const result = {
        success: false,
        submitted: false,
        uncertain: submissionAttempted,
        errors: [
          submissionAttempted
            ? "Save not confirmed. Check ACGME, then use the recovery actions for this case."
            : error.message || "Error filling form",
        ],
      };
      if (ownsCase()) this._handleFillResult(result, andSubmit, index);
      return result;
    } finally {
      this.busy = false;
      UI.setOperation(false);
      if (ownsCase()) {
        refreshCase();
        await Storage.saveState();
      }
    }
  },

  async recheck() {
    const index = State.currentIndex;
    const cases = State.cases;
    const attempt = State.caseAttempts[index];
    if (
      this.busy ||
      State.getCaseStatus(index) !== STATUS_TYPES.review ||
      !attempt?.baseline
    )
      return;
    this.busy = true;
    this.controller = new AbortController();
    UI.setOperation(true);
    UI.progress(`Case ${index + 1}: checking recent ACGME saves…`);
    try {
      const tab = await Target.get();
      const submitted = await confirmSubmission(
        { ...attempt, tabId: tab.id },
        () => this.controller.signal.aborted || State.cases !== cases,
      );
      if (State.cases !== cases) return;
      if (submitted)
        this._handleFillResult({ success: true, submitted: true }, true, index);
      else
        UI.showStatus(
          "Save still unconfirmed. Open ACGME to check, then use Update status manually. No new submission was made.",
          "warning",
        );
    } catch {
      if (State.cases !== cases) return;
      UI.showStatus(
        "Could not recheck this save. Open ACGME and check the case there.",
        "warning",
      );
    } finally {
      this.busy = false;
      UI.setOperation(false);
    }
  },

  _handleFillResult(result, andSubmit, caseIndex = State.currentIndex) {
    if (result?.uncertain) {
      State.setCaseStatus(caseIndex, STATUS_TYPES.review);
      UI.showStatus(
        result.errors?.join("; ") ||
          "Save not confirmed. Check ACGME before trying again.",
        "warning",
      );
    } else if (!result?.success) {
      UI.showStatus(
        result?.errors?.length
          ? `Error filling form: ${result.errors.join("; ")}`
          : "Error filling form",
        "error",
      );
    } else {
      const warnings = State.settings.showWarnings ? result.warnings || [] : [];
      if (warnings.length) console.warn("Fill warnings:", warnings);
      if (andSubmit && result.submitted) {
        State.setCaseStatus(caseIndex, STATUS_TYPES.submitted);
        delete State.caseAttempts[caseIndex];
        UI.showStatus(
          `Case ${caseIndex + 1} saved in ACGME.${warnings.length ? ` Warning: ${warnings.join("; ")}` : ""}`,
          warnings.length ? "warning" : "success",
        );
      } else if (andSubmit) {
        UI.showStatus(
          result.errors?.join("; ") ||
            "Not submitted. Check the ACGME form for errors.",
          "warning",
        );
      } else {
        UI.showStatus(
          `Form filled. Review and submit in ACGME.${warnings.length ? ` Warning: ${warnings.join("; ")}` : ""}`,
          "info",
          { persistent: warnings.length > 0 },
        );
      }
    }
    refreshCase();
    Storage.saveState();
  },
};
