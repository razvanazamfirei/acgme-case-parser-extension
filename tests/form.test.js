import { beforeEach, describe, expect, it } from "vitest";
import { Form } from "../src/popup/form.js";
import { State } from "../src/popup/state.js";

function buildFormDOM() {
  document.body.innerHTML = `
    <input type="text" id="caseId" value="" />
    <input type="text" id="date" value="" />
    <input type="text" id="attending" value="" />
    <textarea id="comments"></textarea>
    <select id="ageCategory">
      <option value="">Select</option>
      <option value="Adult">Adult</option>
      <option value="Pediatric">Pediatric</option>
    </select>
    <select id="asa">
      <option value="">Select</option>
      <option value="1">ASA 1</option>
      <option value="2">ASA 2</option>
      <option value="2E">ASA 2E</option>
    </select>
    <select id="anesthesia">
      <option value="">Select</option>
      <option value="GA">GA</option>
      <option value="mac">MAC</option>
    </select>
    <select id="procedureCategory">
      <option value="">Select</option>
      <option value="Cardiac with CPB">Cardiac with CPB</option>
    </select>
    <details id="neuraxialBlockadeSection" class="hidden">
      <input
        type="checkbox"
        name="neuraxialBlockadeSite"
        value="Lumbar" />
      <input
        type="checkbox"
        name="neuraxialBlockadeSite"
        value="T 1-7" />
    </details>
    <details id="peripheralBlockadeSection" class="hidden">
      <input
        type="checkbox"
        name="peripheralNerveBlockadeSite"
        value="Femoral" />
      <input
        type="checkbox"
        name="peripheralNerveBlockadeSite"
        value="Sciatic" />
      <input
        type="checkbox"
        name="peripheralNerveBlockadeSite"
        value="Other - peripheral nerve blockade site" />
    </details>
    <input type="checkbox" name="airway" value="Oral ETT" />
    <input type="checkbox" name="airway" value="LMA" />
    <input type="checkbox" name="vascular" value="Arterial Catheter" />
    <input type="checkbox" name="monitoring" value="TEE" />
    <input type="radio" name="difficultAirway" value="" />
    <input type="radio" name="difficultAirway" value="Unanticipated" />
    <input type="radio" name="lifeThreateningPathology" value="" />
    <input type="radio" name="lifeThreateningPathology" value="Non-Trauma" />
    <span id="caseStatus" class="status-badge pending">Pending</span>
    <div id="matchBadgeContainer">
      <select id="matchedSelect">
        <option value="a">a option</option>
        <option value="B">B option</option>
      </select>
    </div>
    <div id="settingInstitution"></div>
    <div id="settingDefaultAttending"></div>
    <div id="settingSubmitDelay"></div>
    <div id="submitDelayValue"></div>
    <div id="settingCardiacAutoFill"></div>
    <div id="settingAuto5EPathology"></div>
    <div id="settingShowWarnings"></div>
  `;
}

describe("Form", () => {
  beforeEach(() => {
    buildFormDOM();
    State.reset();
    State.setCases([{ caseId: "C1" }]);
    State.settings = {
      defaultInstitution: "",
      defaultAttending: "",
      submitDelay: 0.5,
      cardiacAutoFill: true,
      auto5EPathology: true,
      showWarnings: true,
    };
  });

  // -------------------------------------------------------------------------
  // setSelect
  // -------------------------------------------------------------------------

  describe("setSelect()", () => {
    it("returns none when element not found", () => {
      const result = Form.setSelect("nonexistent", "val");
      expect(result.type).toBe("none");
    });

    it("returns none when value is falsy, clears the field", () => {
      const sel = document.getElementById("asa");
      sel.value = "1";
      const result = Form.setSelect("asa", "");
      expect(result.type).toBe("none");
      expect(sel.value).toBe("");
    });

    it("exact match sets value directly", () => {
      const result = Form.setSelect("asa", "2");
      expect(result.type).toBe("exact");
      expect(document.getElementById("asa").value).toBe("2");
    });

    it("case-insensitive match", () => {
      const result = Form.setSelect("anesthesia", "MAC");
      // 'MAC' vs option value 'mac'
      expect(result.type).toBe("exact");
      expect(document.getElementById("anesthesia").value).toBe("mac");
    });

    it("partial match (value prefix)", () => {
      const result = Form.setSelect("matchedSelect", "a");
      expect(result.type).toBe("exact"); // exact since "a" === "a"
    });

    it("partial match when input starts with option value", () => {
      const result = Form.setSelect("matchedSelect", "a opt");
      // fallback: partial match — 'a opt'.startsWith('a') → true
      expect(result.type).toBe("partial");
    });

    it("returns none when no match found", () => {
      const result = Form.setSelect("asa", "ZZZZ");
      expect(result.type).toBe("none");
      expect(document.getElementById("asa").value).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // setCheckboxGroup
  // -------------------------------------------------------------------------

  describe("setCheckboxGroup()", () => {
    it("clears all checkboxes when value is empty", () => {
      document.querySelector('input[name="airway"][value="Oral ETT"]').checked =
        true;
      Form.setCheckboxGroup("airway", "");
      expect(
        document.querySelector('input[name="airway"][value="Oral ETT"]')
          .checked,
      ).toBe(false);
    });

    it("returns none type when value is empty", () => {
      const result = Form.setCheckboxGroup("airway", "");
      expect(result.type).toBe("none");
    });

    it("checks matching checkbox (exact match)", () => {
      Form.setCheckboxGroup("airway", "Oral ETT");
      expect(
        document.querySelector('input[name="airway"][value="Oral ETT"]')
          .checked,
      ).toBe(true);
      expect(
        document.querySelector('input[name="airway"][value="LMA"]').checked,
      ).toBe(false);
    });

    it("returns exact type when all matches are exact", () => {
      const result = Form.setCheckboxGroup("airway", "Oral ETT");
      expect(result.type).toBe("exact");
    });

    it("handles partial match when value is a substring of checkbox value", () => {
      Form.setCheckboxGroup("airway", "oral"); // partial: "oral" ⊂ "oral ett"
      const result = Form.setCheckboxGroup("airway", "oral");
      expect(result.type).toBe("partial");
    });

    it("returns partial type when mix of exact and partial", () => {
      // Add a checkbox with a longer value
      document.body.insertAdjacentHTML(
        "beforeend",
        '<input type="checkbox" name="airway" value="LMA Extended" />',
      );
      const result = Form.setCheckboxGroup("airway", "Oral ETT; LMA Ex");
      expect(result.type).toBe("partial");
    });

    it("tracks unmatched values", () => {
      const result = Form.setCheckboxGroup(
        "airway",
        "Oral ETT; Unknown Device",
      );
      expect(result.matches.unmatched).toContain("unknown device");
    });

    it("returns none when no match found", () => {
      const result = Form.setCheckboxGroup("airway", "XYZZY");
      expect(result.type).toBe("none");
    });

    it("handles semicolon-separated values", () => {
      Form.setCheckboxGroup("airway", "Oral ETT; LMA");
      expect(
        document.querySelector('input[name="airway"][value="Oral ETT"]')
          .checked,
      ).toBe(true);
      expect(
        document.querySelector('input[name="airway"][value="LMA"]').checked,
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getCheckboxGroup
  // -------------------------------------------------------------------------

  describe("getCheckboxGroup()", () => {
    it("returns empty string when nothing checked", () => {
      expect(Form.getCheckboxGroup("airway")).toBe("");
    });

    it("returns checked values joined by '; '", () => {
      document.querySelector('input[name="airway"][value="Oral ETT"]').checked =
        true;
      document.querySelector('input[name="airway"][value="LMA"]').checked =
        true;
      const result = Form.getCheckboxGroup("airway");
      expect(result).toContain("Oral ETT");
      expect(result).toContain("LMA");
    });
  });

  // -------------------------------------------------------------------------
  // setRadioGroup / getRadioGroup
  // -------------------------------------------------------------------------

  describe("setRadioGroup() / getRadioGroup()", () => {
    it("sets radio with matching value", () => {
      Form.setRadioGroup("difficultAirway", "Unanticipated");
      const radio = document.querySelector(
        'input[name="difficultAirway"][value="Unanticipated"]',
      );
      expect(radio.checked).toBe(true);
    });

    it("sets the empty-value radio when value is falsy", () => {
      Form.setRadioGroup("difficultAirway", "Unanticipated");
      Form.setRadioGroup("difficultAirway", "");
      const emptyRadio = document.querySelector(
        'input[name="difficultAirway"][value=""]',
      );
      expect(emptyRadio.checked).toBe(true);
    });

    it("getRadioGroup returns empty string when none checked", () => {
      expect(Form.getRadioGroup("difficultAirway")).toBe("");
    });

    it("getRadioGroup returns the checked value", () => {
      Form.setRadioGroup("difficultAirway", "Unanticipated");
      expect(Form.getRadioGroup("difficultAirway")).toBe("Unanticipated");
    });
  });

  // -------------------------------------------------------------------------
  // validate
  // -------------------------------------------------------------------------

  describe("validate()", () => {
    it("returns invalid when attending is missing and no default", () => {
      State.settings.defaultAttending = "";
      document.getElementById("attending").value = "";
      const result = Form.validate();
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain("Attending");
    });

    it("is valid when default attending is set even if form field is empty", () => {
      State.settings.defaultAttending = "SMITH, JOHN";
      document.getElementById("attending").value = "";
      const result = Form.validate();
      expect(result.isValid).toBe(true);
    });

    it("warns about missing ASA", () => {
      State.settings.defaultAttending = "SMITH";
      document.getElementById("asa").value = "";
      const result = Form.validate();
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings).toContain("ASA");
    });

    it("warns about missing Anesthesia Type", () => {
      State.settings.defaultAttending = "SMITH";
      document.getElementById("anesthesia").value = "";
      const result = Form.validate();
      expect(result.warnings).toContain("Anesthesia Type");
    });

    it("warns about missing Procedure Category", () => {
      State.settings.defaultAttending = "SMITH";
      document.getElementById("procedureCategory").value = "";
      const result = Form.validate();
      expect(result.warnings).toContain("Procedure Category");
    });

    it("is valid and has no warnings when all fields filled", () => {
      document.getElementById("attending").value = "SMITH, JOHN";
      document.getElementById("asa").value = "2";
      document.getElementById("anesthesia").value = "GA";
      document.getElementById("procedureCategory").value = "Cardiac with CPB";
      const result = Form.validate();
      expect(result.isValid).toBe(true);
      expect(result.hasWarnings).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // populate
  // -------------------------------------------------------------------------

  describe("populate()", () => {
    it("does nothing when caseData is null", () => {
      Form.populate(null);
      expect(document.getElementById("caseId").value).toBe("");
    });

    it("fills all basic text fields", () => {
      Form.populate({
        caseId: "C-001",
        date: "1/15/2024",
        attending: "JONES",
        comments: "Hip replacement",
        ageCategory: "",
        asa: "",
        anesthesia: "",
        procedureCategory: "",
        airway: "",
        vascularAccess: "",
        monitoring: "",
        difficultAirway: "",
        lifeThreateningPathology: "",
      });
      expect(document.getElementById("caseId").value).toBe("C-001");
      expect(document.getElementById("date").value).toBe("1/15/2024");
      expect(document.getElementById("attending").value).toBe("JONES");
      expect(document.getElementById("comments").value).toBe("Hip replacement");
    });

    it("auto-applies 5E pathology when settings.auto5EPathology=true", () => {
      State.settings.auto5EPathology = true;
      Form.populate({
        caseId: "C-002",
        date: "1/15/2024",
        attending: "",
        comments: "",
        ageCategory: "",
        asa: "5E",
        anesthesia: "",
        procedureCategory: "",
        airway: "",
        vascularAccess: "",
        monitoring: "",
        difficultAirway: "",
        lifeThreateningPathology: "",
      });
      const radio = document.querySelector(
        'input[name="lifeThreateningPathology"][value="Non-Trauma"]',
      );
      expect(radio.checked).toBe(true);
    });

    it("does not auto-apply 5E pathology when already set", () => {
      State.settings.auto5EPathology = true;
      Form.populate({
        caseId: "C-003",
        date: "",
        attending: "",
        comments: "",
        ageCategory: "",
        asa: "5E",
        anesthesia: "",
        procedureCategory: "",
        airway: "",
        vascularAccess: "",
        monitoring: "",
        difficultAirway: "",
        lifeThreateningPathology: "Trauma",
      });
      const nonTrauma = document.querySelector(
        'input[name="lifeThreateningPathology"][value="Non-Trauma"]',
      );
      expect(nonTrauma.checked).toBe(false);
    });

    it("populates derived peripheral blockade site selections from comments", () => {
      Form.populate({
        caseId: "C-004",
        date: "",
        attending: "",
        comments: "Procedure | Block: Sciatic nerve block",
        ageCategory: "",
        asa: "",
        anesthesia: "PNB Single",
        procedureCategory: "",
        airway: "",
        vascularAccess: "",
        monitoring: "",
        difficultAirway: "",
        lifeThreateningPathology: "",
      });

      expect(
        document.querySelector(
          'input[name="peripheralNerveBlockadeSite"][value="Sciatic"]',
        ).checked,
      ).toBe(true);
      expect(
        document
          .getElementById("peripheralBlockadeSection")
          .classList.contains("hidden"),
      ).toBe(false);
    });

    it("populates derived neuraxial blockade site selections from comments", () => {
      Form.populate({
        caseId: "C-005",
        date: "",
        attending: "",
        comments: "Procedure | Block: Lumbar",
        ageCategory: "",
        asa: "",
        anesthesia: "Spinal",
        procedureCategory: "",
        airway: "",
        vascularAccess: "",
        monitoring: "",
        difficultAirway: "",
        lifeThreateningPathology: "",
      });

      expect(
        document.querySelector(
          'input[name="neuraxialBlockadeSite"][value="Lumbar"]',
        ).checked,
      ).toBe(true);
      expect(
        document
          .getElementById("neuraxialBlockadeSection")
          .classList.contains("hidden"),
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getData
  // -------------------------------------------------------------------------

  describe("getData()", () => {
    it("returns all form field values including settings", () => {
      document.getElementById("caseId").value = "TEST-001";
      document.getElementById("attending").value = "SMITH";
      document.getElementById("anesthesia").value = "GA";
      State.settings.defaultInstitution = "CHOP";
      const data = Form.getData();
      expect(data.caseId).toBe("TEST-001");
      expect(data.attending).toBe("SMITH");
      expect(data.institution).toBe("CHOP");
      expect(data.cardiacAutoFill).toBe(true);
      expect(data.auto5EPathology).toBe(true);
      expect(data.neuraxialBlockadeSite).toBe("");
      expect(data.peripheralNerveBlockadeSite).toBe("");
    });

    it("returns blockade site selections only for compatible anesthesia types", () => {
      document.getElementById("anesthesia").innerHTML = `
        <option value="">Select</option>
        <option value="GA">GA</option>
        <option value="Spinal">Spinal</option>
        <option value="PNB Single">PNB Single</option>
      `;
      document.getElementById("anesthesia").value = "PNB Single";
      document.querySelector(
        'input[name="neuraxialBlockadeSite"][value="Lumbar"]',
      ).checked = true;
      document.querySelector(
        'input[name="peripheralNerveBlockadeSite"][value="Femoral"]',
      ).checked = true;

      let data = Form.getData();
      expect(data.neuraxialBlockadeSite).toBe("");
      expect(data.peripheralNerveBlockadeSite).toBe("Femoral");

      document.getElementById("anesthesia").value = "Spinal";
      data = Form.getData();
      expect(data.neuraxialBlockadeSite).toBe("Lumbar");
      expect(data.peripheralNerveBlockadeSite).toBe("");
    });
  });
});
