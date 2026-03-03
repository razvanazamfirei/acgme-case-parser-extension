import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../src/popup/constants.js";
import { State } from "../src/popup/state.js";
import { Storage } from "../src/popup/storage.js";

describe("Storage", () => {
  beforeEach(() => {
    State.reset();
    vi.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // loadState
  // -------------------------------------------------------------------------

  describe("loadState()", () => {
    it("returns false when storage is empty", async () => {
      chrome.storage.local.get.mockResolvedValue({});
      const result = await Storage.loadState();
      expect(result).toBe(false);
      expect(State.cases).toEqual([]);
    });

    it("restores state when cases are present", async () => {
      const cases = [{ caseId: "A" }, { caseId: "B" }];
      chrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.cases]: cases,
        [STORAGE_KEYS.currentIndex]: 1,
        [STORAGE_KEYS.caseStatuses]: { 0: "submitted" },
      });
      const result = await Storage.loadState();
      expect(result).toBe(true);
      expect(State.cases).toBe(cases);
      expect(State.currentIndex).toBe(1);
      expect(State.caseStatuses[0]).toBe("submitted");
    });

    it("clamps out-of-bounds currentIndex to 0", async () => {
      const cases = [{ caseId: "A" }];
      chrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.cases]: cases,
        [STORAGE_KEYS.currentIndex]: 99,
        [STORAGE_KEYS.caseStatuses]: {},
      });
      await Storage.loadState();
      expect(State.currentIndex).toBe(0);
    });

    it("defaults caseStatuses to {} when not stored", async () => {
      const cases = [{ caseId: "A" }];
      chrome.storage.local.get.mockResolvedValue({
        [STORAGE_KEYS.cases]: cases,
      });
      await Storage.loadState();
      expect(State.caseStatuses).toEqual({});
    });

    it("returns false and logs on error", async () => {
      chrome.storage.local.get.mockRejectedValue(new Error("storage error"));
      const result = await Storage.loadState();
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // saveState
  // -------------------------------------------------------------------------

  describe("saveState()", () => {
    it("saves cases, index, and statuses to local storage", async () => {
      State.cases = [{ caseId: "X" }];
      State.currentIndex = 0;
      State.caseStatuses = { 0: "pending" };
      chrome.storage.local.set.mockResolvedValue(undefined);
      await Storage.saveState();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.cases]: State.cases,
        [STORAGE_KEYS.currentIndex]: 0,
        [STORAGE_KEYS.caseStatuses]: { 0: "pending" },
      });
    });

    it("swallows errors silently", async () => {
      chrome.storage.local.set.mockRejectedValue(new Error("write error"));
      await expect(Storage.saveState()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // clearState
  // -------------------------------------------------------------------------

  describe("clearState()", () => {
    it("removes all state keys and resets State", async () => {
      State.cases = [{ caseId: "Y" }];
      State.currentIndex = 1;
      State.caseStatuses = { 0: "submitted" };
      chrome.storage.local.remove.mockResolvedValue(undefined);
      await Storage.clearState();
      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        STORAGE_KEYS.cases,
        STORAGE_KEYS.currentIndex,
        STORAGE_KEYS.caseStatuses,
      ]);
      expect(State.cases).toEqual([]);
      expect(State.currentIndex).toBe(0);
    });

    it("swallows errors silently", async () => {
      chrome.storage.local.remove.mockRejectedValue(new Error("remove error"));
      await expect(Storage.clearState()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // loadSettings
  // -------------------------------------------------------------------------

  describe("loadSettings()", () => {
    it("merges stored settings into State.settings", async () => {
      chrome.storage.sync.get.mockResolvedValue({
        [STORAGE_KEYS.settings]: {
          defaultAttending: "SMITH, JOHN",
          submitDelay: 1.5,
        },
      });
      await Storage.loadSettings();
      expect(State.settings.defaultAttending).toBe("SMITH, JOHN");
      expect(State.settings.submitDelay).toBe(1.5);
    });

    it("leaves settings unchanged when no stored settings", async () => {
      chrome.storage.sync.get.mockResolvedValue({});
      const before = { ...State.settings };
      await Storage.loadSettings();
      expect(State.settings.submitDelay).toBe(before.submitDelay);
    });

    it("swallows errors silently", async () => {
      chrome.storage.sync.get.mockRejectedValue(new Error("sync error"));
      await expect(Storage.loadSettings()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // saveSettings
  // -------------------------------------------------------------------------

  describe("saveSettings()", () => {
    it("updates State.settings and writes to sync storage", async () => {
      const settings = {
        defaultInstitution: "CHOP",
        defaultAttending: "",
        submitDelay: 2,
        cardiacAutoFill: false,
        auto5EPathology: false,
        showWarnings: false,
      };
      chrome.storage.sync.set.mockResolvedValue(undefined);
      await Storage.saveSettings(settings);
      expect(State.settings).toBe(settings);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.settings]: settings,
      });
    });

    it("throws when sync storage write fails", async () => {
      chrome.storage.sync.set.mockRejectedValue(new Error("sync write error"));
      await expect(Storage.saveSettings({})).rejects.toThrow(
        "sync write error",
      );
    });
  });
});
