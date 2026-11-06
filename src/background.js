/** Keep one case window open independently of the ACGME tab. */
import { ACGME_URL_PATTERN } from "./popup/constants.js";

const page = "src/popup/index.html";
let opening = null;

export function openCaseWindow(tab) {
  if (opening) return opening;
  opening = (async () => {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["TAB"],
    });
    const existing = contexts.find(
      (context) =>
        context.documentUrl?.split("?")[0] === chrome.runtime.getURL(page),
    );
    if (existing) {
      await chrome.windows.update(existing.windowId, { focused: true });
      return;
    }
    const url = new URL(chrome.runtime.getURL(page));
    if (tab?.id != null && tab.url?.startsWith(`https://${ACGME_URL_PATTERN}/`))
      url.searchParams.set("tab", tab.id);
    await chrome.windows.create({
      url: url.href,
      type: "popup",
      width: 640,
      height: 800,
      focused: true,
    });
  })().finally(() => {
    opening = null;
  });
  return opening;
}

chrome.action.onClicked.addListener((tab) => {
  openCaseWindow(tab).catch((error) =>
    console.error("Could not open the case window:", error),
  );
});
