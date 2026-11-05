/**
 * Case navigation logic
 */

import { DOM, STATUS_LABELS, STATUS_TYPES } from "./constants.js";
import { Form } from "./form.js";
import { State } from "./state.js";
import { Storage } from "./storage.js";
import { UI } from "./ui.js";

export const Navigation = {
  goToCase(index) {
    if (index < 0 || index >= State.cases.length) {
      return;
    }

    Form.saveCurrent();
    State.currentIndex = index;
    Form.populate(State.getCurrentCase());
    this.update();
    if (!UI.operationActive) UI.hideStatus();
    Storage.saveState();
  },

  goToNextPending() {
    const nextIndex = State.findNextPending(State.currentIndex);
    if (nextIndex === null) {
      const stats = State.getStats();
      UI.showStatus(
        stats.review
          ? `${stats.review} case(s) still need review.`
          : stats.pending
            ? "This is the last pending case."
            : "All cases have been processed!",
        stats.review ? "warning" : "success",
      );
    } else {
      this.goToCase(nextIndex);
    }
  },

  update() {
    Form.updateStatusBadge();
    UI.get(DOM.currentIndex).textContent = (State.currentIndex + 1).toString();
    UI.get(DOM.totalCount).textContent = State.cases.length.toString();
    UI.get(DOM.currentIndexBottom).textContent = (
      State.currentIndex + 1
    ).toString();
    UI.get(DOM.totalCountBottom).textContent = State.cases.length.toString();

    UI.get(DOM.prevBtn).disabled = State.currentIndex === 0;
    UI.get(DOM.nextBtn).disabled = State.currentIndex >= State.cases.length - 1;
    UI.get(DOM.prevBtnBottom).disabled = State.currentIndex === 0;
    UI.get(DOM.nextBtnBottom).disabled =
      State.currentIndex >= State.cases.length - 1;

    this.updateJumpDropdown();
    UI.updateStats();
    UI.updateCaseActions();
  },

  updateJumpDropdown() {
    const jumpSelect = UI.get(DOM.caseJump);
    const filterPending = UI.get(DOM.filterPending).checked;

    jumpSelect.innerHTML = "";

    for (let i = 0; i < State.cases.length; i++) {
      const status = State.getCaseStatus(i);
      if (
        filterPending &&
        status !== STATUS_TYPES.pending &&
        status !== STATUS_TYPES.review &&
        i !== State.currentIndex
      ) {
        continue;
      }

      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${i + 1}. ${State.cases[i].caseId} (${STATUS_LABELS[status]})`;
      opt.selected = i === State.currentIndex;
      jumpSelect.appendChild(opt);
    }
  },

  showCaseView() {
    UI.hideSection(DOM.uploadSection);
    UI.showSection(DOM.navSection);
    UI.showSection(DOM.previewSection);
  },
};
