import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/popup/app.js";
import { ACGMEForm } from "../src/popup/acgme.js";
import { Form } from "../src/popup/form.js";
import { Navigation } from "../src/popup/navigation.js";
import { State } from "../src/popup/state.js";
import { Storage } from "../src/popup/storage.js";
import { Target } from "../src/popup/target.js";
import { UI } from "../src/popup/ui.js";

describe("popup case editing workflow", () => {
  beforeEach(() => {
    const html = readFileSync(resolve("src/popup/index.html"), "utf8");
    const fixture = new DOMParser().parseFromString(html, "text/html");
    for (const script of fixture.querySelectorAll("script")) script.remove();
    document.body.replaceChildren(...fixture.body.childNodes);
    vi.clearAllMocks();
    UI.operationActive = false;
    UI.bulkActive = false;
    UI.bulkPaused = false;
    ACGMEForm.busy = false;
    chrome.storage.local.set.mockResolvedValue(undefined);
    chrome.storage.local.remove.mockResolvedValue(undefined);
    State.settings.submitDelay = 0;
    Target.tabId = null;
    State.reset();
    State.setCases([
      {
        caseId: "CASE-A",
        date: "10/01/2026",
        attending: "ORIGINAL, ATTENDING",
        anesthesia: "GA",
        comments: "Original",
        primaryBlock: "Retained metadata",
      },
      { caseId: "CASE-B", attending: "SECOND, ATTENDING" },
    ]);
    Form.populate(State.getCurrentCase());
    globalThis.__APP_TEST_API__.EventHandlers.register();
  });
  afterEach(() => {
    UI.hideStatus();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps corrections when navigating away and back", () => {
    document.getElementById("attending").value = "CORRECTED, ATTENDING";
    document.getElementById("comments").value = "Corrected comments";
    Navigation.goToCase(1);
    Navigation.goToCase(0);
    expect(document.getElementById("attending").value).toBe(
      "CORRECTED, ATTENDING",
    );
    expect(document.getElementById("comments").value).toBe(
      "Corrected comments",
    );
    expect(State.cases[0].primaryBlock).toBe("Retained metadata");
  });

  it("preserves common airway and PA catheter aliases through the editable form", () => {
    Object.assign(State.cases[0], {
      airway: "LMA",
      vascularAccess: "Pulmonary Artery Catheter",
    });
    Form.populate(State.getCurrentCase());
    expect(Form.getData().airway).toBe("Supraglottic Airway");
    expect(Form.getData().vascularAccess).toBe("PA Catheter");
  });

  it.each(["T 1-7", "T 8-12"])(
    "preserves imported thoracic block range %s",
    (range) => {
      Object.assign(State.cases[0], {
        anesthesia: "Epidural",
        primaryBlock: range,
      });
      Form.populate(State.getCurrentCase());
      expect(Form.getData().neuraxialBlockadeSite).toBe(range);
    },
  );

  it("requires correction instead of silently dropping an unknown imported checkbox value", () => {
    State.cases[0].airway = "Unrecognized airway device";
    Form.populate(State.getCurrentCase());
    expect(Form.validate().isValid).toBe(false);
    expect(
      document.querySelector('input[name="airway"]').closest(".form-field")
        .textContent,
    ).toContain("Unrecognized airway device");
    const selection = document.querySelector(
      'input[name="airway"][value="Mask"]',
    );
    selection.checked = true;
    selection.dispatchEvent(new Event("change", { bubbles: true }));
    expect(Form.validate().isValid).toBe(true);
    expect(State.cases[0].airway).toBe("Mask");
  });

  it("does not carry a validation warning onto a different case", () => {
    UI.showValidation({
      isValid: false,
      missing: ["Attending"],
      warnings: [],
      hasWarnings: false,
    });
    Navigation.goToCase(1);
    expect(
      document.getElementById("validationSummary").classList.contains("hidden"),
    ).toBe(true);
  });

  it("requires review of an ambiguous imported checkbox instead of guessing", () => {
    State.cases[0].vascularAccess = "Catheter";
    Form.populate(State.getCurrentCase());
    expect(Form.getData().vascularAccess).toBe("");
    expect(Form.validate().isValid).toBe(false);
  });

  it("does not block a corrected anesthesia type on a now-hidden block field", () => {
    Object.assign(State.cases[0], {
      anesthesia: "Spinal",
      primaryBlock: "Unknown site",
    });
    Form.populate(State.getCurrentCase());
    expect(Form.validate().isValid).toBe(false);
    const field = document.getElementById("anesthesia");
    field.value = "GA";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    expect(Form.validate().isValid).toBe(true);
  });

  it("checks missing case identifiers and dates before contacting ACGME", () => {
    document.getElementById("caseId").value = " ";
    document.getElementById("date").value = "";
    expect(Form.validate().missing).toEqual(
      expect.arrayContaining(["Case ID", "Date"]),
    );
  });

  it("persists input immediately and restores it in a new popup session", async () => {
    const input = document.getElementById("attending");
    input.value = "CORRECTED, ATTENDING";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const stored = structuredClone(
      chrome.storage.local.set.mock.calls.at(-1)[0],
    );
    Target.tabId = null;
    State.reset();
    chrome.storage.local.get.mockResolvedValue(stored);
    await Storage.loadState();
    Form.populate(State.getCurrentCase());
    expect(input.value).toBe("CORRECTED, ATTENDING");
  });

  it("does not erase imported values merely by displaying them", () => {
    State.cases[0].anesthesia = "UNMAPPED";
    Form.populate(State.getCurrentCase());
    Navigation.goToCase(1);
    expect(State.cases[0].anesthesia).toBe("UNMAPPED");
  });

  it("does not copy the old form into a newly loaded session", () => {
    State.setCases([{ caseId: "NEW" }]);
    Navigation.goToCase(0);
    expect(State.cases[0]).toEqual({ caseId: "NEW" });
  });

  it("keeps an explicitly cleared inferred block site", () => {
    Object.assign(State.cases[0], {
      anesthesia: "PNB Single",
      primaryBlock: "Femoral",
    });
    Form.populate(State.getCurrentCase());
    const block = document.querySelector(
      'input[name="peripheralNerveBlockadeSite"][value="Femoral"]',
    );
    expect(block.checked).toBe(true);
    block.checked = false;
    block.dispatchEvent(new Event("change", { bubbles: true }));
    Navigation.goToCase(1);
    Navigation.goToCase(0);
    expect(block.checked).toBe(false);
    expect(Form.getData().peripheralNerveBlockadeSite).toBe("");
  });

  it("keeps an explicitly cleared automatic pathology selection", () => {
    State.settings.auto5EPathology = true;
    State.cases[0].asa = "5E";
    Form.populate(State.getCurrentCase());
    expect(Form.getRadioGroup("lifeThreateningPathology")).toBe("Non-Trauma");
    const none = document.querySelector(
      'input[name="lifeThreateningPathology"][value=""]',
    );
    // Explicitly update the group because happy-dom caches :checked for radios
    // it unchecks implicitly; browsers invalidate that selector.
    document
      .querySelectorAll('input[name="lifeThreateningPathology"]')
      .forEach((radio) => {
        radio.checked = radio === none;
      });
    expect(Form.getRadioGroup("lifeThreateningPathology")).toBe("");
    none.dispatchEvent(new Event("change", { bubbles: true }));
    expect(State.cases[0].lifeThreateningPathology).toBe("");
    Navigation.goToCase(1);
    Navigation.goToCase(0);
    expect(Form.getRadioGroup("lifeThreateningPathology")).toBe("");
  });

  it.each([
    [true, {}, "Non-Trauma"],
    [false, {}, ""],
    [true, { lifeThreateningPathology: "" }, ""],
    [true, { lifeThreateningPathology: "Trauma" }, "Trauma"],
  ])(
    "applies 5E defaults to the matched ASA while honoring settings and explicit choices (%s, %j)",
    (enabled, explicit, expected) => {
      State.settings.auto5EPathology = enabled;
      Object.assign(State.cases[0], { asa: "5E - Emergency", ...explicit });
      Form.populate(State.getCurrentCase());
      expect(Form.getData().asa).toBe("5E");
      expect(Form.getRadioGroup("lifeThreateningPathology")).toBe(expected);
    },
  );
  it("does not mistake Adult for infant age code a, and shows the original value for review", () => {
    State.cases[0].ageCategory = "Adult";
    Form.populate(State.getCurrentCase());
    const age = document.getElementById("ageCategory");
    expect(age.value).toBe("");
    expect(Form.validate().missing).toContain("Age (review imported value)");
    expect(age.parentElement.querySelector(".match-badge").textContent).toBe(
      "Review: Adult",
    );
    age.value = "d";
    age.dispatchEvent(new Event("change", { bubbles: true }));
    expect(State.cases[0].ageCategory).toBe("d");
    expect(Form.validate().missing).not.toContain(
      "Age (review imported value)",
    );
    expect(age.parentElement.querySelector(".match-badge")).toBeNull();
  });

  it("keeps age-code labels working and rejects ambiguous anesthesia prefixes", () => {
    expect(Form.setSelect("ageCategory", "d. 12 - 65yr").matched).toBe("d");
    expect(Form.setSelect("anesthesia", "PNB").type).toBe("none");
  });

  it("keeps completed cases quiet and puts correction behind Change status", () => {
    State.setCaseStatus(0, "submitted");
    Navigation.update();
    expect(
      document.getElementById("recoveryPanel").classList.contains("hidden"),
    ).toBe(true);
    expect(document.getElementById("completedActions").open).toBe(false);
    expect(
      document.getElementById("nextPendingBtn").classList.contains("hidden"),
    ).toBe(false);
    document.getElementById("completedActions").open = true;
    document.getElementById("resetStatusBtn").click();
    expect(State.getCaseStatus(0)).toBe("pending");
    expect(document.getElementById("completedActions").open).toBe(false);
  });

  it("leads uncertain saves with Check save and collapses manual recovery on each new case", () => {
    State.setCaseStatus(0, "review");
    State.caseAttempts[0] = { kind: "submission", baseline: [] };
    Navigation.update();
    expect(
      document.getElementById("recheckBtn").classList.contains("hidden"),
    ).toBe(false);
    expect(document.getElementById("manualRecovery").open).toBe(false);
    document.getElementById("manualRecovery").open = true;
    Navigation.goToCase(1);
    Navigation.goToCase(0);
    expect(document.getElementById("manualRecovery").open).toBe(false);
  });

  it("opens the connected ACGME tab without changing case progress", async () => {
    Target.tabId = 42;
    chrome.tabs.get.mockResolvedValue({
      id: 42,
      windowId: 7,
      url: "https://apps.acgme.org/ads/CaseLogs/CaseEntry/New",
    });
    document.getElementById("showAcgmeBtn").click();
    await vi.waitFor(() =>
      expect(chrome.windows.update).toHaveBeenCalledWith(7, { focused: true }),
    );
    expect(chrome.tabs.update).toHaveBeenCalledWith(42, { active: true });
    expect(State.getCaseStatus(0)).toBe("pending");
  });

  it("explains a closed ACGME tab in the window", async () => {
    Target.tabId = 42;
    chrome.tabs.get.mockRejectedValueOnce(new Error("Closed"));
    document.getElementById("showAcgmeBtn").click();
    await vi.waitFor(() =>
      expect(document.getElementById("statusMessage").textContent).toContain(
        "was closed",
      ),
    );
  });

  function transport({ saved = false, onSubmit = () => {} } = {}) {
    let attempted = false;
    chrome.tabs.get.mockResolvedValue({
      id: 42,
      status: "complete",
      url: "https://apps.acgme.org/ads/CaseLogs/CaseEntry/New",
    });
    chrome.tabs.query.mockResolvedValue([
      { id: 42, url: "https://apps.acgme.org/ads/CaseLogs/CaseEntry/New" },
    ]);
    chrome.tabs.sendMessage.mockImplementation((_id, message, callback) => {
      if (message.action === "getPageState") callback({ ready: true });
      if (message.action === "fillCase")
        callback({ success: true, result: { success: true } });
      if (message.action === "getRecentCases")
        callback({
          success: true,
          cases:
            attempted && saved
              ? [{ key: "saved-record", caseId: "CASE-A", date: "10/1/2026" }]
              : [],
        });
      if (message.action === "submitCase") {
        attempted = true;
        onSubmit();
        callback({ success: false, uncertain: true });
      }
    });
  }
  const messages = () =>
    chrome.tabs.sendMessage.mock.calls.map(([, message]) => message.action);
  async function finish(promise) {
    await vi.runAllTimersAsync();
    return promise;
  }

  it("offers an explicit manual-save action after filling without submitting", async () => {
    transport();
    await ACGMEForm.fill(false);
    expect(State.caseAttempts[0].kind).toBe("manual");
    expect(
      document.getElementById("recoveryPanel").classList.contains("hidden"),
    ).toBe(false);
    expect(messages()).not.toContain("submitCase");
    document.getElementById("markManualBtn").click();
    expect(State.getCaseStatus(0)).toBe("submitted");
    expect(State.caseAttempts[0]).toBeUndefined();
    expect(State.currentIndex).toBe(1);
    expect(messages()).not.toContain("submitCase");
  });

  it("removes stale manual-fill instructions when the case is edited", async () => {
    transport();
    await ACGMEForm.fill(false);
    const field = document.getElementById("comments");
    field.value = "Changed after filling";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(State.caseAttempts[0]).toBeUndefined();
    expect(
      document.getElementById("recoveryPanel").classList.contains("hidden"),
    ).toBe(true);
  });

  it("identifies an earlier manual fill without claiming it is still on the target page", async () => {
    transport();
    await ACGMEForm.fill(false);
    Navigation.goToCase(1);
    await ACGMEForm.fill(false);
    Navigation.goToCase(0);
    const message = document.getElementById("recoveryMessage").textContent;
    expect(message).toContain("CASE-A (10/01/2026)");
    expect(message).toContain("only after saving that case");
    expect(message).not.toContain("Form filled");
    // A user who already saved A manually can still record that outcome.
    document.getElementById("markManualBtn").click();
    expect(State.getCaseStatus(0)).toBe("submitted");
    expect(State.getCaseStatus(1)).toBe("pending");
  });

  it("removes an old manual-fill action after a failed refill", async () => {
    transport();
    await ACGMEForm.fill(false);
    const originalTransport = chrome.tabs.sendMessage.getMockImplementation();
    chrome.tabs.sendMessage.mockImplementation((id, message, callback) => {
      if (message.action === "fillCase")
        callback({
          success: true,
          result: {
            success: false,
            errors: ["Could not fill required field: attending"],
          },
        });
      else originalTransport(id, message, callback);
    });
    expect((await ACGMEForm.fill(false)).success).toBe(false);
    expect(State.caseAttempts[0]).toBeUndefined();
    expect(
      document.getElementById("recoveryPanel").classList.contains("hidden"),
    ).toBe(true);
  });

  it("explains a non-creation form immediately without filling or submitting", async () => {
    transport();
    chrome.tabs.sendMessage.mockImplementation((_id, message, callback) => {
      expect(message.action).toBe("getPageState");
      callback({
        success: false,
        ready: false,
        blocked: true,
        errors: ["Open a new ACGME case entry form."],
      });
    });
    const result = await ACGMEForm.fill(true);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Open a new");
    expect(State.getCaseStatus(0)).toBe("pending");
    expect(messages()).toEqual(["getPageState"]);
    expect(document.getElementById("fillSubmitBtn").disabled).toBe(false);
  });

  it("persists uncertainty before clicking, restores it, and rechecks without another submission", async () => {
    vi.useFakeTimers();
    let storedBeforeClick;
    transport({
      onSubmit: () => {
        storedBeforeClick = structuredClone(
          chrome.storage.local.set.mock.calls.at(-1)[0],
        );
      },
    });
    await finish(ACGMEForm.fill(true));
    expect(storedBeforeClick.acgme_caseStatuses[0]).toBe("review");
    expect(storedBeforeClick.acgme_caseAttempts[0].baseline).toEqual([]);
    Target.tabId = null;
    State.reset();
    chrome.storage.local.get.mockResolvedValue(storedBeforeClick);
    await Storage.loadState();
    Form.populate(State.getCurrentCase());
    Navigation.update();
    expect(document.getElementById("caseStatus").textContent).toBe(
      "Needs review",
    );
    expect(document.getElementById("reviewCount").textContent).toBe("1");
    expect((await ACGMEForm.fill(true)).success).toBe(false);
    chrome.tabs.sendMessage.mockClear();
    chrome.tabs.sendMessage.mockImplementation((_id, message, callback) => {
      expect(message.action).toBe("getRecentCases");
      callback({
        success: true,
        cases: [{ key: "saved-record", caseId: "CASE-A", date: "10/1/2026" }],
      });
    });
    await ACGMEForm.recheck();
    expect(State.getCaseStatus(0)).toBe("submitted");
    expect(State.caseAttempts[0]).toBeUndefined();
    expect(messages()).toEqual(["getRecentCases"]);
  });

  it("keeps an unconfirmed recheck reviewable and allows an explicit return to pending", async () => {
    vi.useFakeTimers();
    transport();
    await finish(ACGMEForm.fill(true));
    chrome.tabs.sendMessage.mockClear();
    await finish(ACGMEForm.recheck());
    expect(State.getCaseStatus(0)).toBe("review");
    expect(messages()).not.toContain("submitCase");
    expect(document.getElementById("statusMessage").textContent).toContain(
      "No new submission",
    );
    document.getElementById("returnPendingBtn").click();
    expect(State.getCaseStatus(0)).toBe("pending");
    expect(State.caseAttempts[0]).toBeUndefined();
    expect(document.getElementById("fillSubmitBtn").disabled).toBe(false);
  });

  it("rechecks a restored attempt in the current connected tab instead of its stale tab", async () => {
    vi.useFakeTimers();
    transport();
    Target.tabId = 42;
    State.setCaseStatus(0, "review");
    State.caseAttempts[0] = {
      kind: "submission",
      tabId: 7,
      caseId: "CASE-A",
      date: "10/01/2026",
      baseline: [{ key: "old-record" }],
    };
    chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
      expect(message.action).toBe("getRecentCases");
      callback(
        tabId === 42
          ? {
              success: true,
              cases: [
                { key: "new-record", caseId: "CASE-A", date: "10/1/2026" },
              ],
            }
          : { success: false },
      );
    });
    await finish(ACGMEForm.recheck());
    expect(State.getCaseStatus(0)).toBe("submitted");
    expect(chrome.tabs.sendMessage.mock.calls.map(([tabId]) => tabId)).toEqual([
      42,
    ]);
  });

  it("reports an unavailable connected tab without polling a restored tab ID", async () => {
    vi.useFakeTimers();
    transport();
    Target.tabId = 42;
    State.setCaseStatus(0, "review");
    State.caseAttempts[0] = {
      kind: "submission",
      tabId: 7,
      caseId: "CASE-A",
      date: "10/01/2026",
      baseline: [],
    };
    chrome.tabs.get.mockRejectedValueOnce(new Error("Closed"));
    await finish(ACGMEForm.recheck());
    expect(State.getCaseStatus(0)).toBe("review");
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    expect(document.getElementById("statusMessage").textContent).toContain(
      "Could not recheck",
    );
  });

  it("does not submit when the recovery record cannot be saved", async () => {
    vi.useFakeTimers();
    transport();
    chrome.storage.local.set.mockRejectedValue(new Error("Quota exceeded"));
    const result = await finish(ACGMEForm.fill(true));
    expect(result.success).toBe(false);
    expect(messages()).not.toContain("submitCase");
    expect(State.getCaseStatus(0)).toBe("pending");
    expect(
      document.getElementById("storageError").classList.contains("hidden"),
    ).toBe(false);
    chrome.storage.local.set.mockResolvedValue(undefined);
    document.getElementById("retrySaveBtn").click();
    await Promise.resolve();
    expect(
      document.getElementById("storageError").classList.contains("hidden"),
    ).toBe(true);
  });

  it("can cancel while persisting the attempt without leaving a false review status", async () => {
    vi.useFakeTimers();
    transport();
    chrome.storage.local.set.mockImplementationOnce(async () =>
      ACGMEForm.cancel(),
    );
    const result = await finish(ACGMEForm.fill(true));
    expect(result.cancelled).toBe(true);
    expect(messages()).not.toContain("submitCase");
    expect(State.getCaseStatus(0)).toBe("pending");
    expect(State.caseAttempts[0]).toBeUndefined();
  });

  it.each(["during", "after"])(
    "does not restore a cleared session when a fill finishes %s removal",
    async (timing) => {
      transport();
      let finishFill;
      const original = chrome.tabs.sendMessage.getMockImplementation();
      chrome.tabs.sendMessage.mockImplementation((id, message, callback) => {
        if (message.action === "fillCase")
          finishFill = () =>
            callback({ success: true, result: { success: true } });
        else original(id, message, callback);
      });
      let stored = { acgme_cases: structuredClone(State.cases) };
      const writes = [];
      chrome.storage.local.set.mockImplementation((data) => {
        const snapshot = structuredClone(data);
        return new Promise((resolve) =>
          writes.push(() => {
            stored = snapshot;
            resolve();
          }),
        );
      });
      let finishRemoval;
      chrome.storage.local.remove.mockImplementation(
        () =>
          new Promise((resolve) => {
            finishRemoval = () => {
              stored = {};
              resolve();
            };
          }),
      );
      const filling = ACGMEForm.fill(false);
      await vi.waitFor(() => expect(finishFill).toBeTypeOf("function"));
      const clearing = globalThis.__APP_TEST_API__.Session.clear();
      document.getElementById("confirmDialogOk").click();
      await vi.waitFor(() => expect(finishRemoval).toBeTypeOf("function"));
      if (timing === "during") {
        finishFill();
        await vi.waitFor(() => expect(ACGMEForm.busy).toBe(false));
      }
      finishRemoval();
      await clearing;
      if (timing === "after") finishFill();
      for (const finishWrite of writes) finishWrite();
      await filling;
      expect(State.cases).toEqual([]);
      expect(document.getElementById("statusMessage").textContent).toContain(
        "Session cleared",
      );
      chrome.storage.local.get.mockResolvedValue(stored);
      expect(await Storage.loadState()).toBe(false);
    },
  );

  it("waits for readiness without refilling and keeps progress visible while working", async () => {
    vi.useFakeTimers();
    transport();
    let ready = false;
    const transportImplementation =
      chrome.tabs.sendMessage.getMockImplementation();
    chrome.tabs.sendMessage.mockImplementation((id, message, callback) => {
      if (message.action === "getPageState") callback({ ready });
      else transportImplementation(id, message, callback);
    });
    const running = ACGMEForm.fill(false);
    await vi.advanceTimersByTimeAsync(4000);
    expect(messages()).not.toContain("fillCase");
    expect(
      document.getElementById("statusSection").classList.contains("hidden"),
    ).toBe(false);
    expect(document.getElementById("nextBtn").disabled).toBe(true);
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(State.currentIndex).toBe(0);
    ready = true;
    await finish(running);
    expect(messages().filter((action) => action === "fillCase")).toHaveLength(
      1,
    );
    expect(document.getElementById("nextBtn").disabled).toBe(false);
  });

  it("leaves a possible save recoverable when stopped after clicking submit", async () => {
    vi.useFakeTimers();
    transport({
      onSubmit: () => document.getElementById("cancelOperationBtn").click(),
    });
    const result = await finish(ACGMEForm.fill(true));
    expect(result.uncertain).toBe(true);
    expect(State.getCaseStatus(0)).toBe("review");
    expect(State.caseAttempts[0].kind).toBe("submission");
    expect(document.getElementById("recheckBtn").disabled).toBe(false);
  });

  it("shows skipped cases as reversible and jumps directly to cases needing review", () => {
    State.setCaseStatus(0, "skipped");
    State.setCaseStatus(1, "review");
    Navigation.update();
    expect(document.getElementById("completedActionsLabel").textContent).toBe(
      "Undo skip",
    );
    document.getElementById("reviewCasesBtn").click();
    expect(State.currentIndex).toBe(1);
    expect(document.getElementById("caseJump").value).toBe("1");
    expect(
      document.getElementById("recheckBtn").classList.contains("hidden"),
    ).toBe(true);
  });
});
