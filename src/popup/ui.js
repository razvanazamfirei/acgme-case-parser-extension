/**
 * UI utilities and helpers
 */

import { DOM, STATUS_TYPES } from "./constants.js";
import { State } from "./state.js";

export const UI = {
  autoHideTimer: null,
  operationActive: false,
  bulkActive: false,
  bulkPaused: false,
  displayedCase: null,
  displayedStatus: null,

  get(id) {
    return document.getElementById(id);
  },

  showStatus(msg, type = "info", { persistent = false } = {}) {
    const section = this.get(DOM.statusSection);
    const message = this.get(DOM.statusMessage);

    section.classList.remove("hidden");
    message.className = `status-message ${type}`;
    message.textContent = msg;

    // Drop any pending auto-hide, otherwise an earlier success message can
    // hide this one before it has been on screen for its full duration.
    if (this.autoHideTimer !== null) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    if (!persistent && (type === "success" || type === "info")) {
      this.autoHideTimer = setTimeout(() => {
        this.autoHideTimer = null;
        section.classList.add("hidden");
      }, 3000);
    }
  },

  progress(message) {
    this.showStatus(message, "info", { persistent: true });
  },

  setOperation(active) {
    this.operationActive = active;
    this.get(DOM.statusSection)?.setAttribute("aria-busy", String(active));
    this.get(DOM.cancelOperationBtn)?.classList.toggle(
      "hidden",
      !active || this.bulkActive,
    );
    this.updateCaseActions();
  },

  setStorageError(failed) {
    this.get("storageError")?.classList.toggle("hidden", !failed);
  },

  updateCaseActions() {
    const status = State.getCaseStatus(State.currentIndex);
    const stats = State.getStats();
    if (
      this.displayedCase !== State.getCurrentCase() ||
      this.displayedStatus !== status
    ) {
      this.displayedCase = State.getCurrentCase();
      this.displayedStatus = status;
      for (const id of ["manualRecovery", "completedActions"]) {
        if (this.get(id)) this.get(id).open = false;
      }
    }
    const attempt = State.caseAttempts[State.currentIndex];
    const locked = this.operationActive || this.bulkActive;
    this.get("caseActions")?.classList.toggle(
      "hidden",
      State.cases.length === 0,
    );
    for (const id of [DOM.skipBtn, DOM.fillBtn, DOM.fillSubmitBtn]) {
      if (this.get(id))
        this.get(id).disabled = locked || status !== STATUS_TYPES.pending;
      this.get(id)?.classList.toggle("hidden", status !== STATUS_TYPES.pending);
    }
    for (const id of [DOM.prevBtn, DOM.prevBtnBottom]) {
      if (this.get(id))
        this.get(id).disabled = locked || State.currentIndex === 0;
    }
    for (const id of [DOM.nextBtn, DOM.nextBtnBottom]) {
      if (this.get(id))
        this.get(id).disabled =
          locked || State.currentIndex >= State.cases.length - 1;
    }
    for (const id of [
      DOM.caseJump,
      DOM.recheckBtn,
      DOM.markSavedBtn,
      DOM.markManualBtn,
      DOM.resetStatusBtn,
      DOM.openAcgmeBtn,
      DOM.nextPendingBtn,
      DOM.returnPendingBtn,
      DOM.reviewCasesBtn,
    ]) {
      if (this.get(id)) this.get(id).disabled = locked;
    }
    if (this.get(DOM.beastModeBtn))
      this.get(DOM.beastModeBtn).disabled =
        !this.bulkActive &&
        (this.operationActive || (!this.bulkPaused && stats.pending === 0));
    this.get(DOM.beastModeBtn)?.classList.toggle(
      "hidden",
      stats.pending === 0 && !this.bulkActive && !this.bulkPaused,
    );
    this.get(DOM.nextPendingBtn)?.classList.toggle(
      "hidden",
      status === STATUS_TYPES.pending || stats.pending === 0,
    );
    this.get("completionMessage")?.classList.toggle(
      "hidden",
      stats.pending > 0 || this.bulkActive || this.bulkPaused,
    );
    if (this.get("completionMessage"))
      this.get("completionMessage").textContent = stats.review
        ? `${stats.review} case(s) need review`
        : "No pending cases";
    document
      .querySelectorAll(
        "#previewSection input, #previewSection select, #previewSection textarea",
      )
      .forEach((input) => {
        input.disabled = locked || status !== STATUS_TYPES.pending;
      });

    const needsReview = status === STATUS_TYPES.review;
    this.get(DOM.recoveryPanel)?.classList.toggle("needs-review", needsReview);
    const manual =
      status === STATUS_TYPES.pending && attempt?.kind === "manual";
    this.get(DOM.recoveryPanel)?.classList.toggle(
      "hidden",
      !needsReview && !manual,
    );
    const message = this.get(DOM.recoveryMessage);
    if (message)
      message.textContent = needsReview
        ? "Save not confirmed. Check whether ACGME saved this case before trying again."
        : `Check case ${attempt?.caseId} (${attempt?.date}) in ACGME. Mark it submitted only after saving that case.`;
    const canRecheck = needsReview && Boolean(attempt?.baseline);
    this.get(DOM.recheckBtn)?.classList.toggle("hidden", !canRecheck);
    this.get(DOM.openAcgmeBtn)?.classList.toggle(
      "hidden",
      needsReview && canRecheck,
    );
    this.get(DOM.markManualBtn)?.classList.toggle("hidden", !manual);
    this.get("manualRecovery")?.classList.toggle("hidden", !needsReview);
    const completed =
      status === STATUS_TYPES.submitted || status === STATUS_TYPES.skipped;
    this.get("completedActions")?.classList.toggle("hidden", !completed);
    if (this.get("completedActionsLabel"))
      this.get("completedActionsLabel").textContent =
        status === STATUS_TYPES.skipped ? "Undo skip" : "Change status";
    if (this.get("completedActionsHint"))
      this.get("completedActionsHint").textContent =
        status === STATUS_TYPES.skipped
          ? "Return this case to the pending queue."
          : "Return to pending only after checking that this case is not saved in ACGME.";
  },

  hideStatus() {
    if (this.autoHideTimer !== null) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
    this.get(DOM.statusSection).classList.add("hidden");
  },

  confirm(message) {
    return new Promise((resolve) => {
      const dialog = this.get(DOM.confirmDialog);
      const okBtn = this.get(DOM.confirmDialogOk);
      const cancelBtn = this.get(DOM.confirmDialogCancel);
      this.get(DOM.confirmDialogMessage).textContent = message;

      const cleanup = () => {
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        dialog.removeEventListener("cancel", onCancel);
        dialog.close();
      };
      const onOk = () => {
        cleanup();
        resolve(true);
      };
      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      dialog.addEventListener("cancel", onCancel);
      dialog.showModal();
    });
  },

  toggleSection(id) {
    this.get(id)?.classList.toggle("hidden");
  },

  showSection(id) {
    this.get(id)?.classList.remove("hidden");
  },

  hideSection(id) {
    this.get(id)?.classList.add("hidden");
  },

  updateStats() {
    const stats = State.getStats();
    this.get(DOM.pendingCount).textContent = stats.pending.toString();
    this.get(DOM.submittedCount).textContent = stats.submitted.toString();
    this.get(DOM.skippedCount).textContent = stats.skipped.toString();
    if (this.get(DOM.reviewCount))
      this.get(DOM.reviewCount).textContent = stats.review.toString();
    this.get(DOM.reviewCasesBtn)?.classList.toggle(
      "hidden",
      stats.review === 0,
    );
  },

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  showValidation(validationResult) {
    const summary = this.get("validationSummary");
    const text = this.get("validationText");

    if (!validationResult.isValid || validationResult.hasWarnings) {
      const parts = [];
      if (validationResult.missing.length > 0) {
        parts.push(`Missing required: ${validationResult.missing.join(", ")}`);
      }
      if (validationResult.warnings.length > 0) {
        parts.push(`Recommended: ${validationResult.warnings.join(", ")}`);
      }
      text.textContent = parts.join(". ");
      summary.classList.remove("hidden");
    } else {
      summary.classList.add("hidden");
    }
  },

  showMatchBadge(fieldId, matchInfo) {
    if (
      !matchInfo ||
      matchInfo.type === "exact" ||
      (matchInfo.type === "none" && !matchInfo.original)
    ) {
      return;
    }

    const field =
      this.get(fieldId) || document.querySelector(`input[name="${fieldId}"]`);
    if (!field) {
      return;
    }

    const parent =
      field.closest(".form-field, .blockade-section") || field.parentElement;
    let badge = parent.querySelector(".match-badge");

    if (!badge) {
      badge = document.createElement("span");
      badge.className = "match-badge";
      parent.appendChild(badge);
    }

    if (matchInfo.type === "none") {
      badge.className = "match-badge partial";
      badge.textContent = `Review: ${matchInfo.original}`;
      badge.title =
        "This imported value could not be matched. Choose the correct option.";
    } else if (matchInfo.type === "partial") {
      badge.className = "match-badge partial";
      badge.textContent = "Partial";
      badge.title = `Original: "${matchInfo.original}" → Matched: "${matchInfo.matched}"`;
    }
  },

  clearMatchBadges() {
    document.querySelectorAll(".match-badge").forEach((badge) => {
      badge.remove();
    });
  },

  showMappingStatus(mappingResult) {
    const {
      totalMapped,
      totalExpected,
      requiredMapped,
      requiredExpected,
      missingRequired,
      missingOptional,
    } = mappingResult;

    if (missingRequired.length === 0 && missingOptional.length === 0) {
      this.showStatus(
        `Column mapping: ${requiredMapped}/${requiredExpected} required, ${totalMapped}/${totalExpected} total`,
        "success",
      );
      return;
    }

    if (missingRequired.length > 0) {
      this.showStatus(
        `Missing required columns: ${missingRequired.join(", ")}`,
        "error",
      );
    } else {
      const optionalList = missingOptional.join(", ");
      this.showStatus(
        `Mapped ${requiredMapped}/${requiredExpected} required columns. Optional missing: ${optionalList}`,
        "info",
      );
    }
  },
};
