/**
 * Persistence layer for state and settings
 */

import { STORAGE_KEYS } from "./constants.js";
import { State } from "./state.js";
import { UI } from "./ui.js";

export const Storage = {
  pendingWrites: new Set(),
  clearing: false,

  async loadState() {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.cases,
        STORAGE_KEYS.currentIndex,
        STORAGE_KEYS.caseStatuses,
        STORAGE_KEYS.caseAttempts,
      ]);

      if (result[STORAGE_KEYS.cases]?.length > 0) {
        State.cases = result[STORAGE_KEYS.cases];
        State.currentIndex = result[STORAGE_KEYS.currentIndex] || 0;
        State.caseStatuses = result[STORAGE_KEYS.caseStatuses] || {};
        State.caseAttempts = result[STORAGE_KEYS.caseAttempts] || {};

        if (State.currentIndex >= State.cases.length) {
          State.currentIndex = 0;
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error loading state:", error);
      return false;
    }
  },

  async saveState() {
    if (this.clearing) return false;
    let write;
    try {
      write = chrome.storage.local.set({
        [STORAGE_KEYS.cases]: State.cases,
        [STORAGE_KEYS.currentIndex]: State.currentIndex,
        [STORAGE_KEYS.caseStatuses]: State.caseStatuses,
        [STORAGE_KEYS.caseAttempts]: State.caseAttempts,
      });
      this.pendingWrites.add(write);
      await write;
      UI.setStorageError(false);
      return true;
    } catch (error) {
      UI.setStorageError(true);
      console.error("Error saving state:", error);
      return false;
    } finally {
      this.pendingWrites.delete(write);
    }
  },

  // Drain earlier writes and reject new ones until removal completes. Keep the
  // in-memory session if removal fails so the user can retry without losing it.
  async clearState() {
    if (this.clearing)
      throw new Error("Session clearing is already in progress");
    this.clearing = true;
    try {
      await Promise.allSettled([...this.pendingWrites]);
      await chrome.storage.local.remove([
        STORAGE_KEYS.cases,
        STORAGE_KEYS.currentIndex,
        STORAGE_KEYS.caseStatuses,
        STORAGE_KEYS.caseAttempts,
      ]);
      State.reset();
    } catch (error) {
      console.error("Error clearing state:", error);
      throw error;
    } finally {
      this.clearing = false;
    }
  },

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.settings);
      if (result[STORAGE_KEYS.settings]) {
        State.settings = {
          ...State.settings,
          ...result[STORAGE_KEYS.settings],
        };
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  },

  async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: settings });
      State.settings = settings;
    } catch (error) {
      console.error("Error saving settings:", error);
      throw error;
    }
  },
};
