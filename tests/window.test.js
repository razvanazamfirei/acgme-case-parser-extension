import { beforeEach, describe, expect, it, vi } from "vitest";
import { openCaseWindow } from "../src/background.js";
import { Target } from "../src/popup/target.js";

const acgmeTab = {
  id: 42,
  windowId: 5,
  url: "https://apps.acgme.org/ads/CaseLogs/CaseEntry/New",
};

describe("case window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Target.tabId = null;
    chrome.runtime.getContexts.mockResolvedValue([]);
    chrome.windows.create.mockResolvedValue({ id: 7 });
    chrome.tabs.query.mockResolvedValue([acgmeTab]);
    chrome.tabs.get.mockResolvedValue(acgmeTab);
    history.replaceState({}, "", "/");
  });

  it("opens a persistent window attached to the invoking ACGME tab", async () => {
    await openCaseWindow(acgmeTab);
    expect(chrome.windows.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "popup",
        url: "chrome-extension://test/src/popup/index.html?tab=42",
      }),
    );
  });

  it("focuses the existing case window without replacing its connection or session", async () => {
    chrome.runtime.getContexts.mockResolvedValue([
      {
        documentUrl: "chrome-extension://test/src/popup/index.html?tab=11",
        windowId: 7,
      },
    ]);
    await openCaseWindow(acgmeTab);
    expect(chrome.windows.update).toHaveBeenCalledWith(7, { focused: true });
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });

  it("coalesces repeated toolbar clicks into one window", async () => {
    let finish;
    chrome.windows.create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = openCaseWindow(acgmeTab);
    const second = openCaseWindow(acgmeTab);
    await Promise.resolve();
    finish({ id: 7 });
    await Promise.all([first, second]);
    expect(chrome.windows.create).toHaveBeenCalledTimes(1);
  });

  it("can retry opening after Chrome rejects window creation", async () => {
    chrome.windows.create.mockRejectedValueOnce(
      new Error("Window unavailable"),
    );
    await expect(openCaseWindow(acgmeTab)).rejects.toThrow(
      "Window unavailable",
    );
    await openCaseWindow(acgmeTab);
    expect(chrome.windows.create).toHaveBeenCalledTimes(2);
  });

  it("does not bind to an unrelated tab", async () => {
    await openCaseWindow({ id: 9, url: "https://example.org" });
    expect(chrome.windows.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "chrome-extension://test/src/popup/index.html",
      }),
    );
  });

  it("keeps the original target even when focus moves to another tab", async () => {
    history.replaceState({}, "", "/?tab=42");
    chrome.tabs.query.mockResolvedValue([{ ...acgmeTab, id: 99 }]);
    expect((await Target.get()).id).toBe(42);
    expect(chrome.tabs.query).not.toHaveBeenCalled();
    await Target.show();
    expect(chrome.tabs.update).toHaveBeenCalledWith(42, { active: true });
    expect(chrome.windows.update).toHaveBeenCalledWith(5, { focused: true });
  });

  it("fails clearly if the connected tab closes, instead of silently selecting another", async () => {
    Target.tabId = 42;
    chrome.tabs.get.mockRejectedValueOnce(new Error("No tab"));
    await expect(Target.get()).rejects.toThrow("was closed");
    expect(chrome.tabs.query).not.toHaveBeenCalled();
  });

  it("requires the connected tab to remain on Case Entry", async () => {
    Target.tabId = 42;
    chrome.tabs.get.mockResolvedValue({
      ...acgmeTab,
      url: "https://apps.acgme.org/login",
    });
    await expect(Target.get()).rejects.toThrow("connected browser tab");
  });

  it("connects a directly opened window only when there is exactly one ACGME tab", async () => {
    expect((await Target.get()).id).toBe(42);
    Target.tabId = null;
    chrome.tabs.query.mockResolvedValue([acgmeTab, { ...acgmeTab, id: 99 }]);
    await expect(Target.get()).rejects.toThrow("Open this extension from");
  });
});
