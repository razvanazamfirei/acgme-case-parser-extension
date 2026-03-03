import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navigation } from "../src/popup/navigation.js";
import { State } from "../src/popup/state.js";

// Mock Storage so saveState doesn't call chrome.storage in nav tests
vi.mock("../src/popup/storage.js", () => ({
  Storage: { saveState: vi.fn() },
}));

function buildNavDOM() {
  document.body.innerHTML = `
    <div id="currentIndex">1</div>
    <div id="totalCount">0</div>
    <div id="currentIndexBottom">1</div>
    <div id="totalCountBottom">0</div>
    <button id="prevBtn" disabled></button>
    <button id="nextBtn"></button>
    <button id="prevBtnBottom" disabled></button>
    <button id="nextBtnBottom"></button>
    <select id="caseJump"></select>
    <input type="checkbox" id="filterPending" />
    <div id="pendingCount">0</div>
    <div id="submittedCount">0</div>
    <div id="skippedCount">0</div>
    <!-- Form fields needed by Form.populate -->
    <input type="text" id="caseId" value="" />
    <input type="text" id="date" value="" />
    <input type="text" id="attending" value="" />
    <textarea id="comments"></textarea>
    <select id="ageCategory"><option value="">-</option></select>
    <select id="asa"><option value="">-</option></select>
    <select id="anesthesia"><option value="">-</option></select>
    <select id="procedureCategory"><option value="">-</option></select>
    <span id="caseStatus" class="status-badge pending">Pending</span>
    <div id="statusSection" class="hidden">
      <span id="statusMessage"></span>
    </div>
    <div id="uploadSection"></div>
    <div id="navSection" class="hidden"></div>
    <div id="previewSection" class="hidden"></div>
  `;
}

describe("Navigation", () => {
  beforeEach(() => {
    buildNavDOM();
    State.reset();
    State.setCases([
      { caseId: "CASE-001" },
      { caseId: "CASE-002" },
      { caseId: "CASE-003" },
    ]);
  });

  describe("goToCase()", () => {
    it("ignores out-of-bounds index (negative)", () => {
      State.currentIndex = 1;
      Navigation.goToCase(-1);
      expect(State.currentIndex).toBe(1);
    });

    it("ignores out-of-bounds index (too large)", () => {
      State.currentIndex = 0;
      Navigation.goToCase(99);
      expect(State.currentIndex).toBe(0);
    });

    it("sets currentIndex and calls update", () => {
      Navigation.goToCase(2);
      expect(State.currentIndex).toBe(2);
      expect(document.getElementById("currentIndex").textContent).toBe("3");
    });
  });

  describe("goToNextPending()", () => {
    it("navigates to next pending case", () => {
      State.setCaseStatus(0, "submitted");
      Navigation.goToNextPending();
      expect(State.currentIndex).toBe(1);
    });

    it("shows 'all processed' when no pending cases remain", () => {
      State.setCaseStatus(0, "submitted");
      State.setCaseStatus(1, "submitted");
      State.setCaseStatus(2, "submitted");
      Navigation.goToNextPending();
      expect(document.getElementById("statusMessage").textContent).toContain(
        "processed",
      );
    });
  });

  describe("update()", () => {
    it("updates index counters and button states", () => {
      State.currentIndex = 1;
      Navigation.update();
      expect(document.getElementById("currentIndex").textContent).toBe("2");
      expect(document.getElementById("totalCount").textContent).toBe("3");
      expect(document.getElementById("prevBtn").disabled).toBe(false);
      expect(document.getElementById("nextBtn").disabled).toBe(false);
    });

    it("disables prevBtn at index 0", () => {
      State.currentIndex = 0;
      Navigation.update();
      expect(document.getElementById("prevBtn").disabled).toBe(true);
    });

    it("disables nextBtn at last index", () => {
      State.currentIndex = 2;
      Navigation.update();
      expect(document.getElementById("nextBtn").disabled).toBe(true);
    });
  });

  describe("updateJumpDropdown()", () => {
    it("populates jump dropdown with all cases", () => {
      State.currentIndex = 0;
      Navigation.update();
      const select = document.getElementById("caseJump");
      expect(select.options.length).toBe(3);
      expect(select.options[0].textContent).toContain("CASE-001");
    });

    it("filters to only pending when filterPending is checked", () => {
      document.getElementById("filterPending").checked = true;
      State.setCaseStatus(0, "submitted");
      Navigation.update();
      const select = document.getElementById("caseJump");
      // Only 2 pending cases visible
      expect(select.options.length).toBe(2);
    });

    it("marks the current case option as selected", () => {
      State.currentIndex = 1;
      Navigation.update();
      const select = document.getElementById("caseJump");
      expect(select.options[1].selected).toBe(true);
    });
  });

  describe("showCaseView()", () => {
    it("hides upload, shows nav and preview sections", () => {
      document.getElementById("uploadSection").classList.remove("hidden");
      Navigation.showCaseView();
      expect(
        document.getElementById("uploadSection").classList.contains("hidden"),
      ).toBe(true);
      expect(
        document.getElementById("navSection").classList.contains("hidden"),
      ).toBe(false);
      expect(
        document.getElementById("previewSection").classList.contains("hidden"),
      ).toBe(false);
    });
  });
});
