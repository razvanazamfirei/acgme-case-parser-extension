/** The case window keeps working with its original ACGME tab after focus changes. */
import { ACGME_URL_PATTERN } from "./constants.js";

const matches = (tab) =>
  Number.isInteger(tab?.id) &&
  tab?.url?.startsWith(`https://${ACGME_URL_PATTERN}/`);

export const Target = {
  tabId: null,

  async get() {
    if (this.tabId == null) {
      const parameter = new URLSearchParams(location.search).get("tab");
      if (parameter && /^\d+$/.test(parameter)) this.tabId = Number(parameter);
    }
    if (this.tabId != null) {
      let tab;
      try {
        tab = await chrome.tabs.get(this.tabId);
      } catch {
        throw new Error(
          "The connected ACGME tab was closed. Close this case window and reopen it from the ACGME tab; your progress is saved.",
        );
      }
      if (!matches(tab))
        throw new Error(
          "Open ACGME Case Entry in the connected browser tab, then try again.",
        );
      return tab;
    }
    // Supports opening the page directly, without silently choosing among tabs.
    const tabs = (
      await chrome.tabs.query({ url: `https://${ACGME_URL_PATTERN}/*` })
    ).filter(matches);
    if (tabs.length !== 1)
      throw new Error(
        "Open this extension from the ACGME Case Entry tab to connect it.",
      );
    this.tabId = tabs[0].id;
    return tabs[0];
  },

  async show() {
    const tab = await this.get();
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  },
};
