/**
 * Form manipulation and data handling
 */

import {
  isNeuraxialBlockAnesthesia,
  isPeripheralBlockAnesthesia,
  resolveNeuraxialBlockadeSiteSelections,
  resolvePeripheralBlockadeSiteSelections,
} from "../shared/blockade-sites.js";
import { DOM, STATUS_LABELS } from "./constants.js";
import { State } from "./state.js";
import { UI } from "./ui.js";

const CHECKBOX_ALIASES = {
  airway: { "oral ett": "ett", lma: "supraglottic airway" },
  vascular: { "pulmonary artery catheter": "pa catheter" },
};

export const Form = {
  renderedCase: null,
  renderedData: null,
  unmappedFields: {},

  saveCurrent() {
    if (!this.renderedCase || this.renderedCase !== State.getCurrentCase())
      return;
    const data = this.getData();
    for (const key of Object.keys(data)) {
      if (
        [
          "institution",
          "defaultAttending",
          "cardiacAutoFill",
          "auto5EPathology",
          "showWarnings",
        ].includes(key)
      )
        continue;
      if (data[key] !== this.renderedData[key]) {
        this.renderedCase[key] = data[key];
        delete this.unmappedFields[key];
        if (State.caseAttempts[State.currentIndex]?.kind === "manual")
          delete State.caseAttempts[State.currentIndex];
      }
    }
    this.renderedData = data;
  },
  setSelect(selectId, value) {
    const select = UI.get(selectId);
    if (!select || !value) {
      if (select) {
        select.value = "";
      }
      return { type: "none", original: value };
    }

    const options = [...select.options];

    // Exact match
    if (options.some((opt) => opt.value === value)) {
      select.value = value;
      return { type: "exact", original: value, matched: value };
    }

    // Case-insensitive match
    const valueLower = value.toLowerCase();
    const caseInsensitive = options.find(
      (opt) => opt.value.toLowerCase() === valueLower,
    );
    if (caseInsensitive) {
      select.value = caseInsensitive.value;
      return {
        type: "exact",
        original: value,
        matched: caseInsensitive.value,
      };
    }

    // Accept a complete code or phrase prefix, never a shared first letter.
    const startsWithToken = (text, prefix) =>
      text.startsWith(prefix) && /[\s.()-]/.test(text.charAt(prefix.length));
    const candidates = options.filter(
      (opt) =>
        opt.value &&
        (startsWithToken(valueLower, opt.value.toLowerCase()) ||
          startsWithToken(opt.value.toLowerCase(), valueLower)),
    );
    if (candidates.length === 1) {
      const partial = candidates[0];
      select.value = partial.value;
      return { type: "partial", original: value, matched: partial.value };
    }

    select.value = "";
    return { type: "none", original: value };
  },

  setCheckboxGroup(name, valuesString) {
    const checkboxes = [...document.querySelectorAll(`input[name="${name}"]`)];
    const matchInfo = { exact: [], partial: [], unmatched: [] };

    checkboxes.forEach((cb) => {
      cb.checked = false;
    });

    if (!valuesString) {
      return { type: "none", matches: matchInfo };
    }

    const values = valuesString
      .split(";")
      .map((v) => v.trim())
      .filter(Boolean);

    // Resolve each value to at most one checkbox. Selecting every checkbox that
    // merely shares a substring would make "Nasal ETT" also tick "ETT", which
    // logs the case as both a nasal and an oral intubation.
    for (const original of values) {
      const lower = original.toLowerCase();
      const value = CHECKBOX_ALIASES[name]?.[lower] || lower;
      const exact = checkboxes.find((cb) => cb.value.toLowerCase() === value);
      if (exact) {
        exact.checked = true;
        matchInfo.exact.push({ original: value, matched: exact.value });
        continue;
      }

      // A partial value is usable only when it identifies one option.
      const candidates = checkboxes.filter((cb) => {
        const cbValue = cb.value.toLowerCase();
        return cbValue.includes(value) || value.includes(cbValue);
      });
      const partial = candidates.length === 1 ? candidates[0] : null;

      if (partial) {
        partial.checked = true;
        matchInfo.partial.push({ original: value, matched: partial.value });
      } else {
        matchInfo.unmatched.push(original);
      }
    }

    const hasPartial = matchInfo.partial.length > 0;
    const hasExact = matchInfo.exact.length > 0;

    if (hasExact) {
      return {
        type: hasPartial ? "partial" : "exact",
        matches: matchInfo,
      };
    } else {
      return {
        type: hasPartial ? "partial" : "none",
        matches: matchInfo,
      };
    }
  },

  getCheckboxGroup(name) {
    const checked = [];
    document.querySelectorAll(`input[name="${name}"]:checked`).forEach((cb) => {
      checked.push(cb.value);
    });
    return checked.join("; ");
  },

  setRadioGroup(name, value) {
    if (!value) {
      const emptyRadio = document.querySelector(
        `input[name="${name}"][value=""]`,
      );
      if (emptyRadio) {
        emptyRadio.checked = true;
      }
      return;
    }

    document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
      if (radio.value === value) {
        radio.checked = true;
      }
    });
  },

  getRadioGroup(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "";
  },

  populate(caseData) {
    if (!caseData) {
      return;
    }

    // Clear all match badges first
    UI.clearMatchBadges();
    UI.get(DOM.validationSummary)?.classList.add("hidden");
    this.unmappedFields = {};

    UI.get(DOM.caseId).value = caseData.caseId || "";
    UI.get(DOM.date).value = caseData.date || "";
    UI.get(DOM.attending).value = caseData.attending || "";
    UI.get(DOM.comments).value = caseData.comments || "";

    const ageCategoryMatch = this.setSelect(
      DOM.ageCategory,
      caseData.ageCategory,
    );
    const asaMatch = this.setSelect(DOM.asa, caseData.asa);
    const anesthesiaMatch = this.setSelect(DOM.anesthesia, caseData.anesthesia);
    const procedureCategoryMatch = this.setSelect(
      DOM.procedureCategory,
      caseData.procedureCategory,
    );

    const mappedCase = {
      ...caseData,
      anesthesia: UI.get(DOM.anesthesia).value,
    };
    const neuraxial = resolveNeuraxialBlockadeSiteSelections(mappedCase);
    const peripheral = resolvePeripheralBlockadeSiteSelections(mappedCase);
    for (const [name, key, label, values, unmapped = []] of [
      ["airway", "airway", "Airway", caseData.airway],
      [
        "vascular",
        "vascularAccess",
        "Vascular access",
        caseData.vascularAccess,
      ],
      ["monitoring", "monitoring", "Monitoring", caseData.monitoring],
      [
        "neuraxialBlockadeSite",
        "neuraxialBlockadeSite",
        "Neuraxial block site",
        neuraxial.selectedTypes.join("; "),
        neuraxial.unmappedTokens,
      ],
      [
        "peripheralNerveBlockadeSite",
        "peripheralNerveBlockadeSite",
        "Peripheral block site",
        peripheral.selectedTypes.join("; "),
      ],
    ]) {
      const match = this.setCheckboxGroup(name, values);
      const unmatched = [...match.matches.unmatched, ...unmapped];
      if (unmatched.length) {
        this.unmappedFields[key] = label;
        UI.showMatchBadge(name, {
          type: "none",
          original: unmatched.join("; "),
        });
      }
    }

    // Show match badges for partial matches
    UI.showMatchBadge(DOM.ageCategory, ageCategoryMatch);
    UI.showMatchBadge(DOM.asa, asaMatch);
    UI.showMatchBadge(DOM.anesthesia, anesthesiaMatch);
    UI.showMatchBadge(DOM.procedureCategory, procedureCategoryMatch);

    this.setRadioGroup("difficultAirway", caseData.difficultAirway || "");
    this.setRadioGroup(
      "lifeThreateningPathology",
      caseData.lifeThreateningPathology || "",
    );

    this.apply5ELogic(caseData);
    this.syncBlockadeSiteVisibility();
    this.updateStatusBadge();
    this.renderedCase = caseData;
    this.renderedData = this.getData();
  },

  apply5ELogic(caseData) {
    const isFiveE = caseData.asa?.toString().toUpperCase() === "5E";
    if (
      State.settings.auto5EPathology &&
      isFiveE &&
      !Object.hasOwn(caseData, "lifeThreateningPathology")
    ) {
      this.setRadioGroup("lifeThreateningPathology", "Non-Trauma");
    }
  },

  updateStatusBadge() {
    const status = State.getCaseStatus(State.currentIndex);
    const badge = UI.get(DOM.caseStatus);
    badge.className = `status-badge ${status}`;
    badge.textContent = STATUS_LABELS[status];
  },

  getData() {
    const anesthesia = UI.get(DOM.anesthesia).value;

    return {
      caseId: UI.get(DOM.caseId).value.trim(),
      date: UI.get(DOM.date).value.trim(),
      attending: UI.get(DOM.attending).value.trim(),
      ageCategory: UI.get(DOM.ageCategory).value,
      asa: UI.get(DOM.asa).value,
      anesthesia,
      airway: this.getCheckboxGroup("airway"),
      procedureCategory: UI.get(DOM.procedureCategory).value,
      vascularAccess: this.getCheckboxGroup("vascular"),
      monitoring: this.getCheckboxGroup("monitoring"),
      neuraxialBlockadeSite: isNeuraxialBlockAnesthesia(anesthesia)
        ? this.getCheckboxGroup("neuraxialBlockadeSite")
        : "",
      peripheralNerveBlockadeSite: isPeripheralBlockAnesthesia(anesthesia)
        ? this.getCheckboxGroup("peripheralNerveBlockadeSite")
        : "",
      difficultAirway: this.getRadioGroup("difficultAirway"),
      lifeThreateningPathology: this.getRadioGroup("lifeThreateningPathology"),
      comments: UI.get(DOM.comments).value,
      institution: State.settings.defaultInstitution,
      defaultAttending: State.settings.defaultAttending,
      cardiacAutoFill: State.settings.cardiacAutoFill,
      auto5EPathology: State.settings.auto5EPathology,
      showWarnings: State.settings.showWarnings,
    };
  },

  validate() {
    const missing = [];
    const warnings = [];

    const data = this.getData();
    const hasAttending = data.attending || State.settings.defaultAttending;

    if (!data.caseId) missing.push("Case ID");
    if (!data.date) missing.push("Date");
    if (!hasAttending) {
      missing.push("Attending");
    }

    // Imported values that could not be mapped need an explicit correction.
    if (this.renderedCase === State.getCurrentCase()) {
      for (const [key, label] of Object.entries(this.unmappedFields)) {
        if (
          key === "neuraxialBlockadeSite" &&
          !isNeuraxialBlockAnesthesia(data.anesthesia)
        )
          continue;
        if (
          key === "peripheralNerveBlockadeSite" &&
          !isPeripheralBlockAnesthesia(data.anesthesia)
        )
          continue;
        missing.push(`${label} (review imported value)`);
      }
      for (const [key, label] of [
        ["ageCategory", "Age"],
        ["asa", "ASA"],
        ["anesthesia", "Anesthesia Type"],
        ["procedureCategory", "Procedure Category"],
      ]) {
        if (this.renderedCase?.[key] && !data[key])
          missing.push(`${label} (review imported value)`);
      }
    }
    if (!data.asa) {
      warnings.push("ASA");
    }
    if (!data.anesthesia) {
      warnings.push("Anesthesia Type");
    }
    if (!data.procedureCategory) {
      warnings.push("Procedure Category");
    }

    return {
      isValid: missing.length === 0,
      missing,
      warnings,
      hasWarnings: warnings.length > 0,
    };
  },

  syncBlockadeSiteVisibility(anesthesia = UI.get(DOM.anesthesia)?.value || "") {
    const showNeuraxial = isNeuraxialBlockAnesthesia(anesthesia);
    const showPeripheral = isPeripheralBlockAnesthesia(anesthesia);

    if (showNeuraxial) {
      UI.showSection(DOM.neuraxialBlockadeSection);
    } else {
      UI.hideSection(DOM.neuraxialBlockadeSection);
    }

    if (showPeripheral) {
      UI.showSection(DOM.peripheralBlockadeSection);
    } else {
      UI.hideSection(DOM.peripheralBlockadeSection);
    }
  },
};
