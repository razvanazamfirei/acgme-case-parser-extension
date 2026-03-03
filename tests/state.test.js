import { beforeEach, describe, expect, it } from "vitest";
import { State } from "../src/popup/state.js";

const makeCases = (n) =>
  Array.from({ length: n }, (_, i) => ({ caseId: `case-${i}` }));

describe("State", () => {
  beforeEach(() => {
    State.reset();
  });

  describe("reset()", () => {
    it("clears cases, index, and statuses", () => {
      State.cases = makeCases(3);
      State.currentIndex = 2;
      State.caseStatuses = { 0: "submitted" };
      State.reset();
      expect(State.cases).toEqual([]);
      expect(State.currentIndex).toBe(0);
      expect(State.caseStatuses).toEqual({});
    });
  });

  describe("setCases()", () => {
    it("stores cases and initializes all statuses to pending", () => {
      const cases = makeCases(3);
      State.setCases(cases);
      expect(State.cases).toBe(cases);
      expect(State.caseStatuses[0]).toBe("pending");
      expect(State.caseStatuses[1]).toBe("pending");
      expect(State.caseStatuses[2]).toBe("pending");
    });

    it("resets currentIndex to 0", () => {
      State.currentIndex = 5;
      State.setCases(makeCases(2));
      expect(State.currentIndex).toBe(0);
    });

    it("clears previous statuses", () => {
      State.setCases(makeCases(2));
      State.caseStatuses[0] = "submitted";
      State.setCases(makeCases(1));
      expect(State.caseStatuses[0]).toBe("pending");
      expect(State.caseStatuses[1]).toBeUndefined();
    });
  });

  describe("getCurrentCase()", () => {
    it("returns the case at currentIndex", () => {
      const cases = makeCases(3);
      State.setCases(cases);
      State.currentIndex = 2;
      expect(State.getCurrentCase()).toBe(cases[2]);
    });

    it("returns undefined when cases is empty", () => {
      expect(State.getCurrentCase()).toBeUndefined();
    });
  });

  describe("getCaseStatus()", () => {
    it("returns the stored status", () => {
      State.setCases(makeCases(2));
      State.caseStatuses[1] = "submitted";
      expect(State.getCaseStatus(1)).toBe("submitted");
    });

    it("returns 'pending' for untracked index", () => {
      expect(State.getCaseStatus(99)).toBe("pending");
    });
  });

  describe("setCaseStatus()", () => {
    it("sets status for given index", () => {
      State.setCases(makeCases(2));
      State.setCaseStatus(1, "skipped");
      expect(State.caseStatuses[1]).toBe("skipped");
    });
  });

  describe("getStats()", () => {
    it("counts pending, submitted, skipped correctly", () => {
      State.setCases(makeCases(5));
      State.setCaseStatus(0, "submitted");
      State.setCaseStatus(1, "submitted");
      State.setCaseStatus(2, "skipped");
      // 3 and 4 remain pending
      const stats = State.getStats();
      expect(stats.submitted).toBe(2);
      expect(stats.skipped).toBe(1);
      expect(stats.pending).toBe(2);
    });

    it("returns all pending for fresh cases", () => {
      State.setCases(makeCases(3));
      const stats = State.getStats();
      expect(stats.pending).toBe(3);
      expect(stats.submitted).toBe(0);
      expect(stats.skipped).toBe(0);
    });

    it("returns zeros for empty cases", () => {
      const stats = State.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.submitted).toBe(0);
      expect(stats.skipped).toBe(0);
    });
  });

  describe("findNextPending()", () => {
    beforeEach(() => {
      State.setCases(makeCases(5));
    });

    it("finds the next pending case forward", () => {
      State.setCaseStatus(1, "submitted");
      expect(State.findNextPending(0)).toBe(2);
    });

    it("returns the immediate next if it's pending", () => {
      expect(State.findNextPending(0)).toBe(1);
    });

    it("wraps around to find pending before fromIndex", () => {
      // All cases after index 3 are done, wrap to 0
      State.setCases(makeCases(4));
      State.setCaseStatus(0, "pending");
      State.setCaseStatus(1, "submitted");
      State.setCaseStatus(2, "submitted");
      State.setCaseStatus(3, "submitted");
      expect(State.findNextPending(3)).toBe(0);
    });

    it("returns null when no pending cases remain", () => {
      for (let i = 0; i < 5; i++) {
        State.setCaseStatus(i, "submitted");
      }
      expect(State.findNextPending(2)).toBeNull();
    });

    it("does not include fromIndex itself in forward search", () => {
      State.setCaseStatus(1, "submitted");
      State.setCaseStatus(2, "submitted");
      State.setCaseStatus(3, "submitted");
      State.setCaseStatus(4, "submitted");
      // only index 0 is pending, but we start from -1 so forward gets 0
      expect(State.findNextPending(-1)).toBe(0);
    });
  });
});
