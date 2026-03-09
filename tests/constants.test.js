import { describe, expect, it } from "vitest";
import {
  ACGME_URL_PATTERN,
  DOM,
  EXPECTED_COLUMNS,
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
  STANDALONE_EXPECTED_COLUMNS,
  STANDALONE_OPTIONAL_COLUMNS,
  STANDALONE_REQUIRED_COLUMNS,
  STATUS_TYPES,
  STORAGE_KEYS,
} from "../src/popup/constants.js";

describe("constants", () => {
  describe("DOM", () => {
    it("has all required section keys", () => {
      expect(DOM.uploadSection).toBe("uploadSection");
      expect(DOM.navSection).toBe("navSection");
      expect(DOM.previewSection).toBe("previewSection");
      expect(DOM.settingsSection).toBe("settingsSection");
      expect(DOM.statusSection).toBe("statusSection");
    });

    it("has all form field keys", () => {
      expect(DOM.caseId).toBe("caseId");
      expect(DOM.date).toBe("date");
      expect(DOM.attending).toBe("attending");
      expect(DOM.ageCategory).toBe("ageCategory");
      expect(DOM.asa).toBe("asa");
      expect(DOM.anesthesia).toBe("anesthesia");
      expect(DOM.procedureCategory).toBe("procedureCategory");
      expect(DOM.comments).toBe("comments");
      expect(DOM.caseStatus).toBe("caseStatus");
    });

    it("has all action button keys", () => {
      expect(DOM.fillBtn).toBe("fillBtn");
      expect(DOM.fillSubmitBtn).toBe("fillSubmitBtn");
      expect(DOM.skipBtn).toBe("skipBtn");
      expect(DOM.beastModeBtn).toBe("beastModeBtn");
    });

    it("has all settings keys", () => {
      expect(DOM.settingInstitution).toBe("settingInstitution");
      expect(DOM.settingDefaultAttending).toBe("settingDefaultAttending");
      expect(DOM.settingSubmitDelay).toBe("settingSubmitDelay");
      expect(DOM.settingCardiacAutoFill).toBe("settingCardiacAutoFill");
      expect(DOM.settingAuto5EPathology).toBe("settingAuto5EPathology");
      expect(DOM.settingShowWarnings).toBe("settingShowWarnings");
    });
  });

  describe("REQUIRED_COLUMNS", () => {
    it("contains the 8 required caselog columns", () => {
      expect(REQUIRED_COLUMNS).toHaveLength(8);
      expect(REQUIRED_COLUMNS).toContain("Case ID");
      expect(REQUIRED_COLUMNS).toContain("Case Date");
      expect(REQUIRED_COLUMNS).toContain("Supervisor");
      expect(REQUIRED_COLUMNS).toContain("Age");
      expect(REQUIRED_COLUMNS).toContain("Original Procedure");
      expect(REQUIRED_COLUMNS).toContain("ASA Physical Status");
      expect(REQUIRED_COLUMNS).toContain("Anesthesia Type");
      expect(REQUIRED_COLUMNS).toContain("Procedure Category");
    });
  });

  describe("OPTIONAL_COLUMNS", () => {
    it("contains the 3 optional caselog columns", () => {
      expect(OPTIONAL_COLUMNS).toHaveLength(3);
      expect(OPTIONAL_COLUMNS).toContain("Airway Management");
      expect(OPTIONAL_COLUMNS).toContain("Specialized Vascular Access");
      expect(OPTIONAL_COLUMNS).toContain("Specialized Monitoring Techniques");
    });
  });

  describe("EXPECTED_COLUMNS", () => {
    it("is the union of required and optional", () => {
      expect(EXPECTED_COLUMNS).toHaveLength(
        REQUIRED_COLUMNS.length + OPTIONAL_COLUMNS.length,
      );
      for (const col of REQUIRED_COLUMNS) {
        expect(EXPECTED_COLUMNS).toContain(col);
      }
      for (const col of OPTIONAL_COLUMNS) {
        expect(EXPECTED_COLUMNS).toContain(col);
      }
    });
  });

  describe("STANDALONE_REQUIRED_COLUMNS", () => {
    it("contains the 7 required standalone columns", () => {
      expect(STANDALONE_REQUIRED_COLUMNS).toHaveLength(7);
      expect(STANDALONE_REQUIRED_COLUMNS).toContain("Case ID");
      expect(STANDALONE_REQUIRED_COLUMNS).toContain("Procedure Name");
      expect(STANDALONE_REQUIRED_COLUMNS).not.toContain("Age");
      expect(STANDALONE_REQUIRED_COLUMNS).not.toContain("Anesthesia Type");
    });
  });

  describe("STANDALONE_OPTIONAL_COLUMNS", () => {
    it("contains the optional standalone columns", () => {
      expect(STANDALONE_OPTIONAL_COLUMNS).toEqual(["Age", "Primary Block"]);
    });
  });

  describe("STANDALONE_EXPECTED_COLUMNS", () => {
    it("is the union of standalone required and optional", () => {
      expect(STANDALONE_EXPECTED_COLUMNS).toHaveLength(
        STANDALONE_REQUIRED_COLUMNS.length + STANDALONE_OPTIONAL_COLUMNS.length,
      );
    });
  });

  describe("STORAGE_KEYS", () => {
    it("has all required keys", () => {
      expect(STORAGE_KEYS.cases).toBe("acgme_cases");
      expect(STORAGE_KEYS.currentIndex).toBe("acgme_currentIndex");
      expect(STORAGE_KEYS.caseStatuses).toBe("acgme_caseStatuses");
      expect(STORAGE_KEYS.settings).toBe("acgme_settings");
    });
  });

  describe("STATUS_TYPES", () => {
    it("has the three case statuses", () => {
      expect(STATUS_TYPES.pending).toBe("pending");
      expect(STATUS_TYPES.submitted).toBe("submitted");
      expect(STATUS_TYPES.skipped).toBe("skipped");
    });
  });

  describe("ACGME_URL_PATTERN", () => {
    it("matches the ACGME case entry URL", () => {
      expect("https://apps.acgme.org/ads/CaseLogs/CaseEntry/New").toContain(
        ACGME_URL_PATTERN,
      );
    });
  });
});
