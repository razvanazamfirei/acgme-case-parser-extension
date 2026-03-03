import { beforeEach, describe, expect, it, vi } from "vitest";
import { Settings } from "../src/popup/settings.js";
import { State } from "../src/popup/state.js";

vi.mock("../src/popup/storage.js", () => ({
  Storage: { saveSettings: vi.fn() },
}));

import { Storage } from "../src/popup/storage.js";

function buildSettingsDOM() {
  document.body.innerHTML = `
    <select id="settingInstitution">
      <option value="">None</option>
      <option value="CHOP">CHOP</option>
    </select>
    <input type="text" id="settingDefaultAttending" value="" />
    <input type="range" id="settingSubmitDelay" value="0.5" min="0" max="3" />
    <span id="submitDelayValue">0.5s</span>
    <input type="checkbox" id="settingCardiacAutoFill" checked />
    <input type="checkbox" id="settingAuto5EPathology" checked />
    <input type="checkbox" id="settingShowWarnings" checked />
    <button id="saveSettingsBtn">Save</button>
    <div id="settingsSection" class="hidden"></div>
    <div id="statusSection" class="hidden">
      <span id="statusMessage"></span>
    </div>
  `;
}

describe("Settings", () => {
  beforeEach(() => {
    buildSettingsDOM();
    State.settings = {
      defaultInstitution: "CHOP",
      defaultAttending: "SMITH",
      submitDelay: 1.5,
      cardiacAutoFill: true,
      auto5EPathology: false,
      showWarnings: false,
    };
    vi.resetAllMocks();
  });

  describe("readFromUI()", () => {
    it("reads all settings from the DOM elements", () => {
      document.getElementById("settingInstitution").value = "CHOP";
      document.getElementById("settingDefaultAttending").value = "  JONES  ";
      document.getElementById("settingSubmitDelay").value = "2";
      document.getElementById("settingCardiacAutoFill").checked = false;
      document.getElementById("settingAuto5EPathology").checked = true;
      document.getElementById("settingShowWarnings").checked = true;

      const settings = Settings.readFromUI();
      expect(settings.defaultInstitution).toBe("CHOP");
      expect(settings.defaultAttending).toBe("JONES"); // trimmed
      expect(settings.submitDelay).toBe(2);
      expect(settings.cardiacAutoFill).toBe(false);
      expect(settings.auto5EPathology).toBe(true);
      expect(settings.showWarnings).toBe(true);
    });
  });

  describe("applyToUI()", () => {
    it("populates DOM from State.settings", () => {
      Settings.applyToUI();
      expect(document.getElementById("settingInstitution").value).toBe("CHOP");
      expect(document.getElementById("settingDefaultAttending").value).toBe(
        "SMITH",
      );
      expect(document.getElementById("settingSubmitDelay").value).toBe("1.5");
      expect(document.getElementById("submitDelayValue").textContent).toBe(
        "1.5s",
      );
      expect(document.getElementById("settingCardiacAutoFill").checked).toBe(
        true,
      );
      expect(document.getElementById("settingAuto5EPathology").checked).toBe(
        false,
      );
      expect(document.getElementById("settingShowWarnings").checked).toBe(
        false,
      );
    });

    it("falls back to empty string when institution and attending are falsy", () => {
      State.settings.defaultInstitution = "";
      State.settings.defaultAttending = "";
      Settings.applyToUI();
      expect(document.getElementById("settingInstitution").value).toBe("");
      expect(document.getElementById("settingDefaultAttending").value).toBe("");
    });

    it("treats undefined auto5EPathology as true", () => {
      State.settings.auto5EPathology = undefined;
      Settings.applyToUI();
      // `undefined !== false` is true → checked
      expect(document.getElementById("settingAuto5EPathology").checked).toBe(
        true,
      );
    });
  });

  describe("save()", () => {
    it("reads settings, saves, shows success, and hides settings section", async () => {
      Storage.saveSettings.mockResolvedValue(undefined);
      document.getElementById("settingsSection").classList.remove("hidden");

      await Settings.save();

      expect(Storage.saveSettings).toHaveBeenCalled();
      expect(document.getElementById("statusMessage").textContent).toBe(
        "Settings saved",
      );
      expect(
        document.getElementById("settingsSection").classList.contains("hidden"),
      ).toBe(true);
    });

    it("shows error message when save fails", async () => {
      Storage.saveSettings.mockRejectedValue(new Error("write error"));
      await Settings.save();
      expect(document.getElementById("statusMessage").textContent).toBe(
        "Error saving settings",
      );
    });
  });

  describe("toggle()", () => {
    it("toggles the settingsSection visibility", () => {
      const section = document.getElementById("settingsSection");
      expect(section.classList.contains("hidden")).toBe(true);
      Settings.toggle();
      expect(section.classList.contains("hidden")).toBe(false);
      Settings.toggle();
      expect(section.classList.contains("hidden")).toBe(true);
    });
  });
});
