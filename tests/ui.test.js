import { beforeEach, describe, expect, it, vi } from "vitest";
import { State } from "../src/popup/state.js";
import { UI } from "../src/popup/ui.js";

function buildDOM() {
  document.body.innerHTML = `
    <div id="statusSection" class="hidden">
      <span id="statusMessage"></span>
    </div>
    <dialog id="confirmDialog">
      <p id="confirmDialogMessage"></p>
      <button id="confirmDialogOk">OK</button>
      <button id="confirmDialogCancel">Cancel</button>
    </dialog>
    <div id="uploadSection"></div>
    <div id="navSection" class="hidden"></div>
    <div id="previewSection" class="hidden"></div>
    <div id="pendingCount">0</div>
    <div id="submittedCount">0</div>
    <div id="skippedCount">0</div>
    <div id="validationSummary" class="hidden">
      <span id="validationText"></span>
    </div>
    <div id="matchBadgeParent">
      <select id="anesthesia">
        <option value="GA">GA</option>
        <option value="MAC">MAC</option>
      </select>
    </div>
    <span id="appVersion"></span>
  `;
}

describe("UI", () => {
  beforeEach(() => {
    buildDOM();
    State.reset();
  });

  describe("get()", () => {
    it("returns the element with given id", () => {
      expect(UI.get("statusSection")).toBe(
        document.getElementById("statusSection"),
      );
    });

    it("returns null for unknown id", () => {
      expect(UI.get("nonexistent")).toBeNull();
    });
  });

  describe("showStatus()", () => {
    it("shows the status section and sets message", () => {
      const section = UI.get("statusSection");
      UI.showStatus("Hello", "success");
      expect(section.classList.contains("hidden")).toBe(false);
      expect(UI.get("statusMessage").textContent).toBe("Hello");
      expect(UI.get("statusMessage").className).toContain("success");
    });

    it("auto-hides after 3s for success and info types", async () => {
      vi.useFakeTimers();
      UI.showStatus("Test", "success");
      expect(UI.get("statusSection").classList.contains("hidden")).toBe(false);
      vi.advanceTimersByTime(3100);
      expect(UI.get("statusSection").classList.contains("hidden")).toBe(true);
      vi.useRealTimers();
    });

    it("does not auto-hide for error type", () => {
      vi.useFakeTimers();
      UI.showStatus("Error!", "error");
      vi.advanceTimersByTime(5000);
      expect(UI.get("statusSection").classList.contains("hidden")).toBe(false);
      vi.useRealTimers();
    });

    it("auto-hides for info type", () => {
      vi.useFakeTimers();
      UI.showStatus("Info", "info");
      vi.advanceTimersByTime(3100);
      expect(UI.get("statusSection").classList.contains("hidden")).toBe(true);
      vi.useRealTimers();
    });
  });

  describe("hideStatus()", () => {
    it("adds hidden class to statusSection", () => {
      UI.get("statusSection").classList.remove("hidden");
      UI.hideStatus();
      expect(UI.get("statusSection").classList.contains("hidden")).toBe(true);
    });
  });

  describe("toggleSection()", () => {
    it("toggles hidden class", () => {
      const el = UI.get("uploadSection");
      UI.toggleSection("uploadSection");
      expect(el.classList.contains("hidden")).toBe(true);
      UI.toggleSection("uploadSection");
      expect(el.classList.contains("hidden")).toBe(false);
    });
  });

  describe("showSection() / hideSection()", () => {
    it("showSection removes hidden class", () => {
      UI.get("navSection").classList.add("hidden");
      UI.showSection("navSection");
      expect(UI.get("navSection").classList.contains("hidden")).toBe(false);
    });

    it("hideSection adds hidden class", () => {
      UI.get("navSection").classList.remove("hidden");
      UI.hideSection("navSection");
      expect(UI.get("navSection").classList.contains("hidden")).toBe(true);
    });
  });

  describe("capitalize()", () => {
    it("capitalizes the first letter", () => {
      expect(UI.capitalize("pending")).toBe("Pending");
      expect(UI.capitalize("submitted")).toBe("Submitted");
    });

    it("handles single character", () => {
      expect(UI.capitalize("a")).toBe("A");
    });
  });

  describe("updateStats()", () => {
    it("updates pending, submitted, skipped counts", () => {
      State.setCases([{ caseId: "A" }, { caseId: "B" }, { caseId: "C" }]);
      State.setCaseStatus(0, "submitted");
      State.setCaseStatus(1, "skipped");
      UI.updateStats();
      expect(UI.get("pendingCount").textContent).toBe("1");
      expect(UI.get("submittedCount").textContent).toBe("1");
      expect(UI.get("skippedCount").textContent).toBe("1");
    });
  });

  describe("showValidation()", () => {
    it("shows validation summary when there are missing fields", () => {
      UI.showValidation({
        isValid: false,
        missing: ["Attending"],
        warnings: [],
        hasWarnings: false,
      });
      expect(UI.get("validationSummary").classList.contains("hidden")).toBe(
        false,
      );
      expect(UI.get("validationText").textContent).toContain("Attending");
    });

    it("shows warnings in the summary", () => {
      UI.showValidation({
        isValid: true,
        missing: [],
        warnings: ["ASA"],
        hasWarnings: true,
      });
      expect(UI.get("validationText").textContent).toContain("ASA");
    });

    it("hides the summary when valid with no warnings", () => {
      UI.get("validationSummary").classList.remove("hidden");
      UI.showValidation({
        isValid: true,
        missing: [],
        warnings: [],
        hasWarnings: false,
      });
      expect(UI.get("validationSummary").classList.contains("hidden")).toBe(
        true,
      );
    });

    it("shows both missing and warnings together", () => {
      UI.showValidation({
        isValid: false,
        missing: ["Attending"],
        warnings: ["ASA"],
        hasWarnings: true,
      });
      expect(UI.get("validationText").textContent).toContain("Attending");
      expect(UI.get("validationText").textContent).toContain("ASA");
    });
  });

  describe("showMatchBadge()", () => {
    it("does nothing for exact match type", () => {
      UI.showMatchBadge("anesthesia", { type: "exact" });
      expect(
        document
          .getElementById("matchBadgeParent")
          .querySelector(".match-badge"),
      ).toBeNull();
    });

    it("does nothing for none match type", () => {
      UI.showMatchBadge("anesthesia", { type: "none" });
      expect(
        document
          .getElementById("matchBadgeParent")
          .querySelector(".match-badge"),
      ).toBeNull();
    });

    it("does nothing when matchInfo is null", () => {
      UI.showMatchBadge("anesthesia", null);
      expect(
        document
          .getElementById("matchBadgeParent")
          .querySelector(".match-badge"),
      ).toBeNull();
    });

    it("does nothing when field element is not found", () => {
      UI.showMatchBadge("nonexistentField", { type: "partial" });
      // Should not throw
    });

    it("adds partial badge for partial match", () => {
      UI.showMatchBadge("anesthesia", {
        type: "partial",
        original: "G",
        matched: "GA",
      });
      const badge = document
        .getElementById("matchBadgeParent")
        .querySelector(".match-badge");
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe("Partial");
    });

    it("reuses existing badge element on second call", () => {
      UI.showMatchBadge("anesthesia", {
        type: "partial",
        original: "G",
        matched: "GA",
      });
      UI.showMatchBadge("anesthesia", {
        type: "partial",
        original: "M",
        matched: "MAC",
      });
      const badges = document
        .getElementById("matchBadgeParent")
        .querySelectorAll(".match-badge");
      expect(badges.length).toBe(1);
    });
  });

  describe("clearMatchBadges()", () => {
    it("removes all .match-badge elements from the DOM", () => {
      UI.showMatchBadge("anesthesia", {
        type: "partial",
        original: "G",
        matched: "GA",
      });
      expect(document.querySelectorAll(".match-badge").length).toBe(1);
      UI.clearMatchBadges();
      expect(document.querySelectorAll(".match-badge").length).toBe(0);
    });
  });

  describe("showMappingStatus()", () => {
    it("shows success when no columns missing", () => {
      UI.showMappingStatus({
        totalMapped: 3,
        totalExpected: 3,
        requiredMapped: 2,
        requiredExpected: 2,
        missingRequired: [],
        missingOptional: [],
      });
      expect(UI.get("statusMessage").textContent).toContain("2/2");
    });

    it("shows error when required columns missing", () => {
      UI.showMappingStatus({
        totalMapped: 0,
        totalExpected: 3,
        requiredMapped: 0,
        requiredExpected: 2,
        missingRequired: ["Case ID"],
        missingOptional: [],
      });
      expect(UI.get("statusMessage").className).toContain("error");
    });

    it("shows info when only optional columns missing", () => {
      UI.showMappingStatus({
        totalMapped: 2,
        totalExpected: 3,
        requiredMapped: 2,
        requiredExpected: 2,
        missingRequired: [],
        missingOptional: ["Airway Management"],
      });
      expect(UI.get("statusMessage").className).toContain("info");
    });
  });

  describe("confirm()", () => {
    it("resolves true when OK is clicked", async () => {
      const dialog = UI.get("confirmDialog");
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();

      const promise = UI.confirm("Are you sure?");
      // Simulate click on OK
      UI.get("confirmDialogOk").click();
      expect(await promise).toBe(true);
    });

    it("resolves false when Cancel is clicked", async () => {
      const dialog = UI.get("confirmDialog");
      dialog.showModal = vi.fn();
      dialog.close = vi.fn();

      const promise = UI.confirm("Are you sure?");
      UI.get("confirmDialogCancel").click();
      expect(await promise).toBe(false);
    });
  });
});
