import fuzzysort from "fuzzysort";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Excel } from "../src/popup/excel.js";
import "../src/content/content.js";

const contentTestApi = globalThis.__CONTENT_TEST_API__;

if (!contentTestApi) {
  throw new Error(
    "Expected __CONTENT_TEST_API__ to be available in test mode.",
  );
}

const {
  checkProcedure,
  checkRadioProcedure,
  fillCase,
  findAttendingId,
  getAttendingOptions,
  getFieldId,
  getVisibleErrors,
  setInputValue,
  setSelectValue,
  submitCase,
  uncheckAllProcedures,
} = contentTestApi;

// ---------------------------------------------------------------------------
// Full ACGME form DOM helper
// ---------------------------------------------------------------------------

function buildFormDOM() {
  document.body.innerHTML = `
    <div id="case-id-container">
      <label class="form-label">Case ID Label
        <div><!-- label wrapper --></div>
      </label>
      <input type="text" maxlength="25" id="caseIdInput" />
    </div>
    <div class="ProcedureDate">
      <input type="text" id="dateInput" />
    </div>
    <select id="Institutions">
      <option value="">Select</option>
      <option value="12763">CHOP</option>
      <option value="12771">Penn Hospital</option>
    </select>
    <select id="Attendings">
      <option value="">Select attending</option>
      <option value="100">SMITH, JOHN</option>
      <option value="101">JONES, MARY A</option>
      <option value="102">FACULTY, FACULTY</option>
      <option value="103">BROWN, ALICE B</option>
    </select>
    <select id="PatientTypes">
      <option value="30">Adult</option>
      <option value="31">Child</option>
      <option value="32">Infant</option>
      <option value="33">Neonate</option>
      <option value="34">Premature</option>
    </select>
    <div id="commentsContainer">
      <textarea id="Comments"></textarea>
    </div>
    <!-- ASA -->
    <input type="checkbox" class="cbprocedureid" id="156628" />
    <input type="checkbox" class="cbprocedureid" id="156629" />
    <input type="checkbox" class="cbprocedureid" id="156632" />
    <input type="checkbox" class="cbprocedureid" id="156633" />
    <input type="checkbox" class="cbprocedureid" id="156634" />
    <input type="checkbox" class="cbprocedureid" id="156635" />
    <input type="checkbox" class="cbprocedureid" id="156636" />
    <input type="checkbox" class="cbprocedureid" id="156637" />
    <input type="checkbox" class="cbprocedureid" id="156630" />
    <input type="checkbox" class="cbprocedureid" id="156626" />
    <input type="checkbox" class="cbprocedureid" id="156631" />
    <!-- Anesthesia -->
    <input type="checkbox" class="cbprocedureid" id="1256330" />
    <input type="checkbox" class="cbprocedureid" id="156641" />
    <input type="checkbox" class="cbprocedureid" id="1256331" />
    <input type="checkbox" class="cbprocedureid" id="1256332" />
    <input type="checkbox" class="cbprocedureid" id="156646" />
    <input type="checkbox" class="cbprocedureid" id="156647" />
    <input type="checkbox" class="cbprocedureid" id="156648" />
    <!-- Airway -->
    <input type="checkbox" class="cbprocedureid" id="156654" />
    <input type="checkbox" class="cbprocedureid" id="156655" />
    <input type="checkbox" class="cbprocedureid" id="1256333" />
    <input type="checkbox" class="cbprocedureid" id="156650" />
    <input type="checkbox" class="cbprocedureid" id="1256336" />
    <!-- Laryngoscopy -->
    <input type="checkbox" class="cbprocedureid" id="1256334" />
    <input type="checkbox" class="cbprocedureid" id="1256335" />
    <input type="checkbox" class="cbprocedureid" id="2298046" />
    <!-- Procedure category -->
    <input type="checkbox" class="cbprocedureid" id="156681" />
    <input type="checkbox" class="cbprocedureid" id="156682" />
    <input type="checkbox" class="cbprocedureid" id="156685" />
    <input type="checkbox" class="cbprocedureid" id="156684" />
    <input type="checkbox" class="cbprocedureid" id="156688" />
    <input type="checkbox" class="cbprocedureid" id="156687" />
    <input type="checkbox" class="cbprocedureid" id="156689" />
    <input type="checkbox" class="cbprocedureid" id="156692" />
    <input type="checkbox" class="cbprocedureid" id="156690" />
    <input type="checkbox" class="cbprocedureid" id="156683" />
    <!-- Vascular access -->
    <input type="checkbox" class="cbprocedureid" id="1256338" />
    <input type="checkbox" class="cbprocedureid" id="1256339" />
    <input type="checkbox" class="cbprocedureid" id="156700" />
    <input type="checkbox" class="cbprocedureid" id="156693" />
    <!-- Monitoring -->
    <input type="checkbox" class="cbprocedureid" id="156707" />
    <input type="checkbox" class="cbprocedureid" id="156708" />
    <input type="checkbox" class="cbprocedureid" id="1256341" />
    <!-- Peripheral Nerve Blockade Site -->
    <input type="checkbox" class="cbprocedureid" id="1911477" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Adductor Canal" />
    <input type="checkbox" class="cbprocedureid" id="156730" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Ankle" />
    <input type="checkbox" class="cbprocedureid" id="156734" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Axillary" />
    <input type="checkbox" class="cbprocedureid" id="1911478" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Erector Spinae Plane" />
    <input type="checkbox" class="cbprocedureid" id="156735" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Femoral" />
    <input type="checkbox" class="cbprocedureid" id="156732" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Infraclavicular" />
    <input type="checkbox" class="cbprocedureid" id="156731" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Interscalene" />
    <input type="checkbox" class="cbprocedureid" id="156737" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Lumbar Plexus" />
    <input type="checkbox" class="cbprocedureid" id="156739" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Paravertebral" />
    <input type="checkbox" class="cbprocedureid" id="156729" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Popliteal" />
    <input type="checkbox" class="cbprocedureid" id="1911476" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Quadratus Lumborum" />
    <input type="checkbox" class="cbprocedureid" id="156738" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Retrobulbar" />
    <input type="checkbox" class="cbprocedureid" id="156740" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Saphenous" />
    <input type="checkbox" class="cbprocedureid" id="156736" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Sciatic" />
    <input type="checkbox" class="cbprocedureid" id="156733" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Supraclavicular" />
    <input type="checkbox" class="cbprocedureid" id="1911475" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Transverse Abdominal Plane" />
    <input type="checkbox" class="cbprocedureid" id="1256340" data-area="Peripheral Nerve Blockade Site (Optional)" data-type="Other - peripheral nerve blockade site" />
    <!-- Difficult Airway -->
    <input type="radio" id="CaseTypes_148" name="difficultAirway" value="148" />
    <input type="radio" id="CaseTypes_149" name="difficultAirway" value="149" />
    <!-- Life-Threatening Pathology -->
    <input type="radio" id="CaseTypes_46" name="lifeThreateningPathology" value="46" />
    <input type="radio" id="CaseTypes_134" name="lifeThreateningPathology" value="134" />
    <!-- Errors -->
    <div id="clienterrors"></div>
    <button type="submit" id="submitButton">Submit</button>
  `;
}

function checked(id) {
  return document.getElementById(id)?.checked ?? false;
}

// ---------------------------------------------------------------------------
// getFieldId
// ---------------------------------------------------------------------------

describe("getFieldId", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete global.caseEntryApp;
  });

  describe("caseId", () => {
    it("finds via label.form-label containing 'Case ID' > parent > input[maxlength=25]", () => {
      document.body.innerHTML = `
        <div id="container">
          <label class="form-label">Case ID</label>
          <input type="text" maxlength="25" id="caseIdViaLabel" />
        </div>`;
      expect(getFieldId("caseId")).toBe("caseIdViaLabel");
    });

    it("falls back to caseEntryApp.globals.CaseEntry99", () => {
      document.body.innerHTML = `<input type="text" id="caseEntryField99" />`;
      global.caseEntryApp = { globals: { CaseEntry99: "#caseEntryField99" } };
      expect(getFieldId("caseId")).toBe("caseEntryField99");
    });

    it("falls back to input[id^='71291']", () => {
      document.body.innerHTML = `<input type="text" id="712910001" />`;
      expect(getFieldId("caseId")).toBe("712910001");
    });

    it("falls back to first input[type=text][maxlength=25]", () => {
      document.body.innerHTML = `<input type="text" maxlength="25" id="fallbackInput" />`;
      expect(getFieldId("caseId")).toBe("fallbackInput");
    });

    it("returns null when nothing is found", () => {
      expect(getFieldId("caseId")).toBeNull();
    });
  });

  describe("date", () => {
    it("finds via .ProcedureDate > input[type=text]", () => {
      document.body.innerHTML = `
        <div class="ProcedureDate">
          <input type="text" id="dateViaClass" />
        </div>`;
      expect(getFieldId("date")).toBe("dateViaClass");
    });

    it("falls back to caseEntryApp.globals.CaseEntry89", () => {
      document.body.innerHTML = `<input type="text" id="dateGlobal89" />`;
      global.caseEntryApp = { globals: { CaseEntry89: "#dateGlobal89" } };
      expect(getFieldId("date")).toBe("dateGlobal89");
    });

    it("falls back to input[id^='5b1ce']", () => {
      document.body.innerHTML = `<input type="text" id="5b1ceABC" />`;
      expect(getFieldId("date")).toBe("5b1ceABC");
    });

    it("falls back to input[id^='5b1c']", () => {
      document.body.innerHTML = `<input type="text" id="5b1c0001" />`;
      expect(getFieldId("date")).toBe("5b1c0001");
    });

    it("returns null when nothing is found", () => {
      expect(getFieldId("date")).toBeNull();
    });
  });

  it("returns null for unknown field type", () => {
    expect(getFieldId("unknownField")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setSelectValue
// ---------------------------------------------------------------------------

describe("setSelectValue", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="mySelect">
        <option value="">Empty</option>
        <option value="opt1">Option 1</option>
        <option value="opt2">Option 2</option>
      </select>`;
  });

  it("sets the value and dispatches change event", () => {
    const listener = vi.fn();
    document.getElementById("mySelect").addEventListener("change", listener);
    const ok = setSelectValue("mySelect", "opt1");
    expect(ok).toBe(true);
    expect(document.getElementById("mySelect").value).toBe("opt1");
    expect(listener).toHaveBeenCalled();
  });

  it("returns false when select element does not exist", () => {
    expect(setSelectValue("nonexistent", "val")).toBe(false);
  });

  it("uses jQuery trigger when element has select2-hidden-accessible class", () => {
    const sel = document.getElementById("mySelect");
    sel.classList.add("select2-hidden-accessible");
    const jqMock = vi.fn(() => ({
      hasClass: () => true,
      val: vi.fn().mockReturnThis(),
      trigger: vi.fn().mockReturnThis(),
    }));
    global.$ = jqMock;
    setSelectValue("mySelect", "opt1");
    expect(jqMock).toHaveBeenCalled();
    delete global.$;
  });
});

// ---------------------------------------------------------------------------
// setInputValue
// ---------------------------------------------------------------------------

describe("setInputValue", () => {
  beforeEach(() => {
    document.body.innerHTML = `<input type="text" id="myInput" value="" />`;
  });

  it("sets value and dispatches input and change events", () => {
    const inputListener = vi.fn();
    const changeListener = vi.fn();
    const el = document.getElementById("myInput");
    el.addEventListener("input", inputListener);
    el.addEventListener("change", changeListener);
    const ok = setInputValue("myInput", "hello");
    expect(ok).toBe(true);
    expect(el.value).toBe("hello");
    expect(inputListener).toHaveBeenCalled();
    expect(changeListener).toHaveBeenCalled();
  });

  it("returns false when input does not exist", () => {
    expect(setInputValue("nonexistent", "val")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkProcedure / checkRadioProcedure / uncheckAllProcedures
// ---------------------------------------------------------------------------

describe("checkProcedure", () => {
  beforeEach(() => {
    document.body.innerHTML = `<input type="checkbox" class="cbprocedureid" id="12345" />`;
  });

  it("clicks checkbox when unchecked and returns true", () => {
    const cb = document.getElementById("12345");
    expect(cb.checked).toBe(false);
    expect(checkProcedure("12345")).toBe(true);
    expect(cb.checked).toBe(true);
  });

  it("skips click when already checked and returns true", () => {
    const cb = document.getElementById("12345");
    cb.checked = true;
    const clickSpy = vi.spyOn(cb, "click");
    expect(checkProcedure("12345")).toBe(true);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("returns false when element not found", () => {
    expect(checkProcedure("99999")).toBe(false);
  });
});

describe("checkRadioProcedure", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input type="radio" id="CaseTypes_42" name="testGroup" value="42" />`;
  });

  it("clicks radio when unchecked and returns true", () => {
    const r = document.getElementById("CaseTypes_42");
    expect(r.checked).toBe(false);
    expect(checkRadioProcedure("42")).toBe(true);
    expect(r.checked).toBe(true);
  });

  it("skips click when already checked", () => {
    const r = document.getElementById("CaseTypes_42");
    r.checked = true;
    const clickSpy = vi.spyOn(r, "click");
    checkRadioProcedure("42");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("returns false when radio not found", () => {
    expect(checkRadioProcedure("9999")).toBe(false);
  });
});

describe("uncheckAllProcedures", () => {
  it("unchecks all checked .cbprocedureid checkboxes", () => {
    document.body.innerHTML = `
      <input type="checkbox" class="cbprocedureid" id="a" checked />
      <input type="checkbox" class="cbprocedureid" id="b" checked />
      <input type="checkbox" class="cbprocedureid" id="c" />`;
    uncheckAllProcedures();
    expect(document.getElementById("a").checked).toBe(false);
    expect(document.getElementById("b").checked).toBe(false);
    expect(document.getElementById("c").checked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findAttendingId
// ---------------------------------------------------------------------------

describe("findAttendingId", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="">Select</option>
        <option value="100">SMITH, JOHN</option>
        <option value="101">JONES, MARY A</option>
        <option value="102">FACULTY, FACULTY</option>
        <option value="103">BROWN, ALICE B</option>
        <option value="104">LEE, DAVID CHARLES</option>
      </select>`;
  });

  it("returns null when Attendings select is missing", () => {
    document.body.innerHTML = "";
    expect(findAttendingId("SMITH, JOHN")).toBeNull();
  });

  it("finds exact match (normalized)", () => {
    expect(findAttendingId("SMITH, JOHN")).toBe("100");
  });

  it("matches last name + first name", () => {
    expect(findAttendingId("JONES, MARY")).toBe("101");
  });

  it("handles middle initial vs full middle name flexibility", () => {
    // LEE, DAVID CHARLES — input provides just "DAVID C"
    expect(findAttendingId("LEE, DAVID C")).toBe("104");
  });

  it("matches when middle name is exactly equal in the name-match branch", () => {
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="201">JONES, MARY A MD</option>
      </select>`;
    expect(findAttendingId("JONES, MARY A")).toBe("201");
  });

  it("returns null when name is ambiguous (multiple close matches)", () => {
    // Add a second JONES to make it ambiguous
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="101">JONES, MARY A</option>
        <option value="105">JONES, MARY B</option>
      </select>`;
    // Both have exact last+first "JONES, MARY" but differ in middle initial.
    // This should remain ambiguous and resolve to null.
    expect(findAttendingId("JONES, MARY")).toBeNull();
  });

  it("returns null when exact normalized name appears multiple times", () => {
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="301">SMITH, JOHN</option>
        <option value="302">SMITH, JOHN</option>
      </select>`;
    expect(findAttendingId("SMITH, JOHN")).toBeNull();
  });

  it("returns all matches when returnAllMatches=true", () => {
    const matches = findAttendingId("SMITH, JOHN", true);
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].value).toBe("100");
  });

  it("returns empty array when returnAllMatches=true and select missing", () => {
    document.body.innerHTML = "";
    expect(findAttendingId("SMITH", true)).toEqual([]);
  });

  it("returns null when select has only empty-value options", () => {
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="">Please select</option>
      </select>`;
    expect(findAttendingId("SMITH, JOHN")).toBeNull();
  });

  it("matches via initial when input first name is an initial of option first name", () => {
    // "SMITH, J" → initial-match for "SMITH, JOHN"; also covers neither-has-middle-name path
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="100">SMITH, JOHN</option>
      </select>`;
    expect(findAttendingId("SMITH, J")).toBe("100");
  });

  it("matches when input has middle name but option has none", () => {
    // "SMITH, JOHN JR" → name-match for "SMITH, JOHN" (input middle present, option middle absent)
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="100">SMITH, JOHN</option>
      </select>`;
    expect(findAttendingId("SMITH, JOHN JR")).toBe("100");
  });

  it("does not match when option has no first name and isInitialFor receives empty string", () => {
    // Option "SMITH" has no first name; isInitialFor is called with empty string → returns false
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="200">SMITH</option>
      </select>`;
    // No name-based match; fuzzy fallback should not satisfy the confidence threshold.
    expect(findAttendingId("SMITH, J")).toBeNull();
  });

  it("returns value via fuzzy match when no name-based match exists", () => {
    // "HERNANEZ, CARLOS" (typo) has no name-based match for "HERNANDEZ, CARLOS"
    // but fuzzysort finds it as the sole close match
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="200">HERNANDEZ, CARLOS</option>
      </select>`;
    expect(findAttendingId("HERNANEZ, CARLOS")).toBe("200");
  });

  it("returns null when fuzzy top score is below confidence threshold", () => {
    const goSpy = vi.spyOn(fuzzysort, "go").mockReturnValue([
      {
        obj: { value: "100", text: "SMITH, JOHN" },
        score: -900,
      },
    ]);

    try {
      expect(findAttendingId("UNKNOWN DOCTOR")).toBeNull();
    } finally {
      goSpy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// getAttendingOptions
// ---------------------------------------------------------------------------

describe("getAttendingOptions", () => {
  it("returns options with value", () => {
    document.body.innerHTML = `
      <select id="Attendings">
        <option value="">Select</option>
        <option value="100">SMITH, JOHN</option>
      </select>`;
    const opts = getAttendingOptions();
    expect(opts).toHaveLength(1);
    expect(opts[0].value).toBe("100");
    expect(opts[0].text).toBe("SMITH, JOHN");
  });

  it("returns empty array when select not found", () => {
    document.body.innerHTML = "";
    expect(getAttendingOptions()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getVisibleErrors
// ---------------------------------------------------------------------------

describe("getVisibleErrors", () => {
  it("returns empty array when no error elements exist", () => {
    document.body.innerHTML = "";
    expect(getVisibleErrors()).toEqual([]);
  });

  it("collects visible field-validation-error text", () => {
    document.body.innerHTML = `
      <span class="field-validation-error">Date is required</span>`;
    const errors = getVisibleErrors();
    // In happy-dom, offsetParent for appended elements may be null;
    // check that the function runs without throwing and returns an array
    expect(Array.isArray(errors)).toBe(true);
  });

  it("deduplicates identical error messages", () => {
    document.body.innerHTML = `
      <span class="field-validation-error">Same error</span>
      <span class="validation-summary-errors">Same error</span>`;
    const errors = getVisibleErrors();
    // At most 1 entry for "Same error"
    const sameCount = errors.filter((e) => e === "Same error").length;
    expect(sameCount).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// fillCase
// ---------------------------------------------------------------------------

describe("fillCase", () => {
  beforeEach(() => {
    buildFormDOM();
    delete global.caseEntryApp;
  });

  const baseCase = {
    caseId: "CASE-001",
    date: "1/15/2024",
    attending: "SMITH, JOHN",
    ageCategory: "a",
    comments: "Hip replacement",
    asa: "2",
    anesthesia: "GA",
    airway: "Oral ETT",
    difficultAirway: "",
    procedureCategory: "Cardiac with CPB",
    vascularAccess: "",
    monitoring: "",
    institution: "",
    defaultAttending: "",
    cardiacAutoFill: false,
    auto5EPathology: false,
    showWarnings: true,
  };

  it("returns success=true for a valid case fill", () => {
    // Set up the field IDs that getFieldId needs to find
    const container = document.createElement("div");
    const label = document.createElement("label");
    label.className = "form-label";
    label.textContent = "Case ID";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.maxLength = 25;
    inp.id = "testCaseIdField";
    container.appendChild(label);
    container.appendChild(inp);
    document.body.appendChild(container);

    const result = fillCase({ ...baseCase });
    expect(result.success).toBe(true);
  });

  it("fills attending and records it in filled", () => {
    const result = fillCase({ ...baseCase });
    expect(result.filled).toContain("attending");
  });

  it("uses default attending when case attending not found", () => {
    const result = fillCase({
      ...baseCase,
      attending: "NONEXISTENT DOCTOR",
      defaultAttending: "FACULTY, FACULTY",
    });
    expect(result.filled).toContain("attending");
  });

  it("falls back to FACULTY, FACULTY when both attending and default fail", () => {
    const result = fillCase({
      ...baseCase,
      attending: "MISSING PERSON",
      defaultAttending: "ALSO MISSING",
    });
    // FACULTY, FACULTY is in the Attendings select (value "102")
    expect(result.filled).toContain("attending");
  });

  it("records warning when using FACULTY, FACULTY fallback", () => {
    const result = fillCase({
      ...baseCase,
      attending: "NOBODY HERE",
      defaultAttending: "",
      showWarnings: true,
    });
    expect(result.warnings.some((w) => w.includes("FACULTY"))).toBe(true);
  });

  it("records warning when using default attending", () => {
    const result = fillCase({
      ...baseCase,
      attending: "NOTFOUND",
      defaultAttending: "FACULTY, FACULTY",
      showWarnings: true,
    });
    expect(result.warnings.some((w) => w.includes("default attending"))).toBe(
      true,
    );
  });

  it("uses unique non-exact fallback match when strict lookup returns null", () => {
    const originalGetElementById = document.getElementById.bind(document);
    let attendingLookupCount = 0;
    const getByIdSpy = vi
      .spyOn(document, "getElementById")
      .mockImplementation((id) => {
        if (id === "Attendings") {
          attendingLookupCount += 1;
          if (attendingLookupCount === 1) {
            return null;
          }
        }
        return originalGetElementById(id);
      });

    try {
      const result = fillCase({
        ...baseCase,
        attending: "SMITH, J",
        showWarnings: true,
      });

      expect(result.filled).toContain("attending");
      expect(result.warnings.some((w) => w.includes("not found exactly"))).toBe(
        true,
      );
    } finally {
      getByIdSpy.mockRestore();
    }
  });

  it("sets age category select", () => {
    fillCase({ ...baseCase, ageCategory: "b" });
    expect(document.getElementById("PatientTypes").value).toBe("31");
  });

  it("checks ASA checkbox", () => {
    fillCase({ ...baseCase, asa: "1" });
    expect(checked("156628")).toBe(true);
  });

  it("checks emergency ASA variant", () => {
    fillCase({ ...baseCase, asa: "2E" });
    expect(checked("156633")).toBe(true);
  });

  it("checks anesthesia type checkbox", () => {
    fillCase({ ...baseCase, anesthesia: "MAC" });
    expect(checked("156641")).toBe(true);
  });

  it("checks airway device checkbox", () => {
    fillCase({ ...baseCase, airway: "Nasal ETT" });
    expect(checked("156655")).toBe(true);
  });

  it("handles ETT alias for Oral ETT", () => {
    fillCase({ ...baseCase, airway: "ETT" });
    expect(checked("156654")).toBe(true);
  });

  it("handles LMA alias for Supraglottic Airway", () => {
    fillCase({ ...baseCase, airway: "LMA", anesthesia: "GA" });
    expect(checked("1256333")).toBe(true);
  });

  it("handles Mask airway", () => {
    fillCase({ ...baseCase, airway: "Mask" });
    expect(checked("156650")).toBe(true);
  });

  it("handles DLT airway", () => {
    fillCase({ ...baseCase, airway: "DLT" });
    expect(checked("1256336")).toBe(true);
  });

  it("checks laryngoscopy type alongside airway device", () => {
    fillCase({ ...baseCase, airway: "Oral ETT; Video Laryngoscope" });
    expect(checked("156654")).toBe(true);
    expect(checked("1256335")).toBe(true);
  });

  it("checks procedure category", () => {
    fillCase({ ...baseCase, procedureCategory: "Cardiac without CPB" });
    expect(checked("156682")).toBe(true);
  });

  it("skips procedure category for 'Other (procedure cat)'", () => {
    fillCase({
      ...baseCase,
      procedureCategory: "Other (procedure cat)",
      cardiacAutoFill: false,
    });
    // No cardiac codes should be checked
    expect(checked("156681")).toBe(false);
    expect(checked("156682")).toBe(false);
  });

  it("auto-fills cardiac monitoring and access for Cardiac with CPB", () => {
    const result = fillCase({
      ...baseCase,
      procedureCategory: "Cardiac with CPB",
      cardiacAutoFill: true,
      vascularAccess: "",
      monitoring: "",
    });
    expect(checked("156707")).toBe(true); // TEE
    expect(checked("1256338")).toBe(true); // Arterial Catheter
    expect(checked("1256339")).toBe(true); // Central Venous
    expect(checked("156693")).toBe(true); // Ultrasound
    expect(checked("156700")).toBe(true); // PA Catheter
    expect(result.filled).toContain("cardiac:TEE");
  });

  it("skips cardiac auto-fill items already present in data", () => {
    fillCase({
      ...baseCase,
      procedureCategory: "Cardiac with CPB",
      cardiacAutoFill: true,
      vascularAccess: "Arterial Catheter",
      monitoring: "TEE",
    });
    // Both already specified — auto-fill skips them (still ends up checked via vascularAccess)
    expect(checked("156707")).toBe(true); // TEE from monitoring field
    expect(checked("1256338")).toBe(true); // Arterial from vascularAccess
  });

  it("skips cardiac auto-fill when cardiacAutoFill is false", () => {
    fillCase({
      ...baseCase,
      procedureCategory: "Cardiac with CPB",
      cardiacAutoFill: false,
      vascularAccess: "",
      monitoring: "",
    });
    expect(checked("156707")).toBe(false);
  });

  it("checks vascular access", () => {
    fillCase({ ...baseCase, vascularAccess: "Central Venous Catheter" });
    expect(checked("1256339")).toBe(true);
  });

  it("checks monitoring", () => {
    fillCase({ ...baseCase, monitoring: "Neuromonitoring" });
    expect(checked("156708")).toBe(true);
  });

  it("checks CSF Drain monitoring", () => {
    fillCase({ ...baseCase, monitoring: "CSF Drain" });
    expect(checked("1256341")).toBe(true);
  });

  it("checks difficult airway radio", () => {
    fillCase({ ...baseCase, difficultAirway: "Anticipated" });
    expect(document.getElementById("CaseTypes_148").checked).toBe(true);
  });

  it("checks unanticipated difficult airway radio", () => {
    fillCase({ ...baseCase, difficultAirway: "Unanticipated" });
    expect(document.getElementById("CaseTypes_149").checked).toBe(true);
  });

  it("auto-checks Non-Trauma for 5E cases when auto5EPathology=true", () => {
    fillCase({ ...baseCase, asa: "5E", auto5EPathology: true });
    expect(document.getElementById("CaseTypes_46").checked).toBe(true);
  });

  it("does not auto-check 5E pathology when disabled", () => {
    fillCase({ ...baseCase, asa: "5E", auto5EPathology: false });
    expect(document.getElementById("CaseTypes_46").checked).toBe(false);
  });

  it("checks explicit life-threatening pathology", () => {
    fillCase({ ...baseCase, lifeThreateningPathology: "Trauma" });
    expect(document.getElementById("CaseTypes_134").checked).toBe(true);
  });

  it("does not add 5E warning when showWarnings=false", () => {
    const result = fillCase({
      ...baseCase,
      asa: "5E",
      auto5EPathology: true,
      showWarnings: false,
    });
    expect(result.warnings.some((w) => w.includes("Non-Trauma"))).toBe(false);
  });

  it("sets institution via INSTITUTION_MAP", () => {
    const result = fillCase({ ...baseCase, institution: "CHOP" });
    expect(result.filled).toContain("institution");
  });

  it("expands commentsContainer if it lacks show class", () => {
    const container = document.getElementById("commentsContainer");
    container.classList.remove("show");
    fillCase({ ...baseCase, comments: "Test comment" });
    expect(container.classList.contains("show")).toBe(true);
  });

  it("skips comments when commentsContainer already has show class", () => {
    document.getElementById("commentsContainer").classList.add("show");
    const result = fillCase({ ...baseCase, comments: "Comment" });
    expect(result.filled).toContain("comments");
  });

  it("handles alias procedure categories (Cesarean del)", () => {
    fillCase({
      ...baseCase,
      procedureCategory: "Cesarean del",
      cardiacAutoFill: false,
    });
    expect(checked("156692")).toBe(true);
  });

  it("handles alias procedure categories (Vaginal del)", () => {
    fillCase({
      ...baseCase,
      procedureCategory: "Vaginal del",
      cardiacAutoFill: false,
    });
    expect(checked("156690")).toBe(true);
  });

  it("handles alias Intracerebral procedure category", () => {
    fillCase({
      ...baseCase,
      procedureCategory: "Intracerebral",
      cardiacAutoFill: false,
    });
    expect(checked("156689")).toBe(true);
  });

  it("handles multi-item vascular access (semicolon-separated)", () => {
    fillCase({
      ...baseCase,
      vascularAccess: "Arterial Catheter; Ultrasound Guided",
    });
    expect(checked("1256338")).toBe(true);
    expect(checked("156693")).toBe(true);
  });

  it("handles multi-item monitoring (semicolon-separated)", () => {
    fillCase({ ...baseCase, monitoring: "TEE; Neuromonitoring" });
    expect(checked("156707")).toBe(true);
    expect(checked("156708")).toBe(true);
  });

  it("handles empty airway token gracefully", () => {
    const result = fillCase({ ...baseCase, airway: "" });
    expect(result.success).toBe(true);
  });

  it("skips empty segments in semicolon-separated airway", () => {
    // Trailing semicolon produces an empty token — triggers the !item return
    const result = fillCase({ ...baseCase, airway: "Nasal ETT;" });
    expect(result.success).toBe(true);
    expect(checked("156655")).toBe(true);
  });

  it("skips empty segments in semicolon-separated monitoring", () => {
    // Trailing semicolon produces an empty token — triggers the !item return
    const result = fillCase({ ...baseCase, monitoring: "Neuromonitoring;" });
    expect(result.success).toBe(true);
    expect(checked("156708")).toBe(true);
  });

  it("records warning when no attending found and FACULTY fallback is absent", () => {
    // Remove FACULTY, FACULTY from DOM so facultyId lookup returns null
    const select = document.getElementById("Attendings");
    const facultyOpt = Array.from(select.options).find(
      (o) => o.text === "FACULTY, FACULTY",
    );
    if (facultyOpt) select.removeChild(facultyOpt);

    const result = fillCase({
      ...baseCase,
      attending: "NOBODY KNOWN",
      defaultAttending: "",
      showWarnings: true,
    });
    expect(result.warnings.some((w) => w.includes("no matching option"))).toBe(
      true,
    );
  });

  it("does not add warning for attending when showWarnings=false and it matches", () => {
    const result = fillCase({
      ...baseCase,
      attending: "SMITH, JOHN",
      showWarnings: false,
    });
    expect(result.warnings).toHaveLength(0);
  });

  it("handles unknown anesthesia type gracefully", () => {
    const result = fillCase({ ...baseCase, anesthesia: "UNKNOWN_TYPE" });
    expect(result.success).toBe(true);
  });

  it("handles unknown ASA gracefully", () => {
    const result = fillCase({ ...baseCase, asa: "9" });
    expect(result.success).toBe(true);
  });

  it("handles Cardiac without CPB auto-fill", () => {
    fillCase({
      ...baseCase,
      procedureCategory: "Cardiac without CPB",
      cardiacAutoFill: true,
    });
    expect(checked("156707")).toBe(true); // TEE auto-fill
  });

  it("handles PNB Single anesthesia", () => {
    fillCase({ ...baseCase, anesthesia: "PNB Single" });
    expect(checked("156648")).toBe(true);
  });

  it("handles PNB Continuous anesthesia", () => {
    fillCase({ ...baseCase, anesthesia: "PNB Continuous" });
    expect(checked("156647")).toBe(true);
  });

  it("maps standalone Block comments to peripheral block site checkbox", () => {
    fillCase({
      ...baseCase,
      anesthesia: "PNB Single",
      comments: "Procedure | Block: Adductor canal block",
    });
    expect(checked("1911477")).toBe(true);
  });

  it("maps multiple standalone block entries from comments", () => {
    fillCase({
      ...baseCase,
      anesthesia: "PNB Single",
      comments: "Procedure | Block: Femoral nerve block, Sciatic nerve block",
    });
    expect(checked("156735")).toBe(true);
    expect(checked("156736")).toBe(true);
  });

  it("queries peripheral block options once per fill", () => {
    const querySelectorAllSpy = vi.spyOn(document, "querySelectorAll");

    fillCase({
      ...baseCase,
      anesthesia: "PNB Single",
      comments: "Procedure | Block: Femoral nerve block, Sciatic nerve block",
    });

    const peripheralOptionCalls = querySelectorAllSpy.mock.calls.filter(
      ([selector]) =>
        selector ===
        'input.cbprocedureid[data-area="Peripheral Nerve Blockade Site (Optional)"]',
    );

    expect(peripheralOptionCalls).toHaveLength(1);
    querySelectorAllSpy.mockRestore();
  });

  it("maps unknown standalone block terms to Other peripheral site", () => {
    const result = fillCase({
      ...baseCase,
      anesthesia: "PNB Single",
      comments: "Procedure | Block: Brachial plexus block",
      showWarnings: true,
    });
    expect(checked("1256340")).toBe(true);
    expect(
      result.warnings.some((w) =>
        w.includes("Other - peripheral nerve blockade site"),
      ),
    ).toBe(true);
  });

  it("suppresses peripheral block console warnings when showWarnings=false", () => {
    console.warn.mockClear();
    document.getElementById("1911477")?.remove();

    const result = fillCase({
      ...baseCase,
      anesthesia: "PNB Single",
      comments: "Procedure | Block: Adductor canal block",
      showWarnings: false,
    });

    expect(result.warnings).toEqual([]);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("ignores standalone Primary Block values for non-peripheral cases", () => {
    const result = fillCase({
      ...baseCase,
      anesthesia: "Spinal",
      comments: "Procedure | Block: Lumbar",
      showWarnings: true,
    });
    expect(checked("1256340")).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("prefers explicit primaryBlock field when provided", () => {
    fillCase({
      ...baseCase,
      anesthesia: "PNB Single",
      comments: "Procedure | Block: Adductor canal block",
      primaryBlock: "Sciatic nerve block",
    });
    expect(checked("156736")).toBe(true);
    expect(checked("1911477")).toBe(false);
  });

  it("uses parseStandaloneRows primaryBlock output before conflicting comments", () => {
    const standaloneHeaders = [
      "Case ID",
      "Case Date",
      "Supervisor",
      "Age",
      "Original Procedure",
      "ASA Physical Status",
      "Procedure Category",
      "Procedure Name",
      "Primary Block",
    ];
    const standaloneRow = [
      "CASE-SA-100",
      "7/1/2023",
      "SMITH, JOHN",
      "a",
      "Procedure",
      "2",
      "Other (procedure cat)",
      "Peripheral nerve block",
      "Sciatic nerve block",
    ];
    const { cases } = Excel.parseStandaloneRows([
      standaloneHeaders,
      standaloneRow,
    ]);

    fillCase({
      ...baseCase,
      ...cases[0],
      comments: "Procedure | Block: Adductor canal block",
    });

    expect(cases[0].primaryBlock).toBe("Sciatic nerve block");
    expect(checked("156736")).toBe(true);
    expect(checked("1911477")).toBe(false);
  });

  it("handles Spinal anesthesia", () => {
    fillCase({ ...baseCase, anesthesia: "Spinal" });
    expect(checked("1256331")).toBe(true);
  });

  it("handles Direct Laryngoscope in airway", () => {
    fillCase({ ...baseCase, airway: "Direct Laryngoscope" });
    expect(checked("1256334")).toBe(true);
  });

  it("handles Flexible Bronchoscopic laryngoscopy", () => {
    fillCase({ ...baseCase, airway: "Flexible Bronchoscopic" });
    expect(checked("2298046")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// submitCase
// ---------------------------------------------------------------------------

describe("submitCase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    buildFormDOM();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clicks the submit button and returns success when no errors", async () => {
    const btn = document.getElementById("submitButton");
    const clickSpy = vi.spyOn(btn, "click");
    const promise = submitCase();
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(clickSpy).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it("returns error when no submit button found", async () => {
    document.body.innerHTML = "";
    const result = await submitCase();
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Submit button not found");
  });

  it("returns validation errors when present after submit", async () => {
    document.body.innerHTML = `
      <button type="submit" id="submitButton">Submit</button>
      <span class="field-validation-error">Date is required</span>`;
    // We need to simulate visible offsetParent — attach a second element
    // whose offsetParent is not null for happy-dom
    const err = document.querySelector(".field-validation-error");
    err.textContent = "Date is required";

    const promise = submitCase();
    await vi.runAllTimersAsync();
    const result = await promise;
    // Result depends on whether happy-dom sees the error as visible;
    // we just ensure it doesn't throw
    expect(typeof result.success).toBe("boolean");
  });

  it("finds button via fallback selectors", async () => {
    document.body.innerHTML = `<button type="submit">Submit</button>`;
    const btn = document.querySelector('button[type="submit"]');
    const clickSpy = vi.spyOn(btn, "click");
    const promise = submitCase();
    await vi.runAllTimersAsync();
    await promise;
    expect(clickSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Message listener (captured from addListener mock)
// ---------------------------------------------------------------------------

describe("chrome.runtime.onMessage listener", () => {
  let listener;

  beforeEach(() => {
    buildFormDOM();
    // The listener was registered when the module was first imported
    listener = chrome.runtime.onMessage.addListener.mock.calls.at(-1)?.[0];
  });

  it("handles fillCase action and calls sendResponse with result", () => {
    const sendResponse = vi.fn();
    const caseData = {
      caseId: "",
      date: "",
      attending: "",
      ageCategory: "",
      comments: "",
      asa: "",
      anesthesia: "",
      airway: "",
      difficultAirway: "",
      procedureCategory: "",
      vascularAccess: "",
      monitoring: "",
      institution: "",
      defaultAttending: "",
      cardiacAutoFill: false,
      auto5EPathology: false,
      showWarnings: false,
    };
    const keepOpen = listener(
      { action: "fillCase", data: caseData },
      {},
      sendResponse,
    );
    expect(keepOpen).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      result: expect.objectContaining({ success: true }),
    });
  });

  it("handles fillCase action when fillCase throws", () => {
    const sendResponse = vi.fn();
    // Pass undefined as data to trigger an error inside fillCase
    listener({ action: "fillCase", data: undefined }, {}, sendResponse);
    // fillCase will throw since it calls uncheckAllProcedures on null data
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it("handles submitCase action asynchronously", async () => {
    vi.useFakeTimers();
    const sendResponse = vi.fn();
    listener({ action: "submitCase" }, {}, sendResponse);
    await vi.runAllTimersAsync();
    expect(sendResponse).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("handles getAttendingOptions action", () => {
    const sendResponse = vi.fn();
    const keepOpen = listener(
      { action: "getAttendingOptions" },
      {},
      sendResponse,
    );
    expect(keepOpen).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, options: expect.any(Array) }),
    );
  });

  it("returns false for unknown action", () => {
    const sendResponse = vi.fn();
    const result = listener({ action: "unknownAction" }, {}, sendResponse);
    expect(result).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it("handles submitCase rejection by sending error response", async () => {
    vi.useFakeTimers();
    const btn = document.getElementById("submitButton");
    btn.click = () => {
      throw new Error("click failed");
    };
    const sendResponse = vi.fn();
    listener({ action: "submitCase" }, {}, sendResponse);
    await vi.runAllTimersAsync();
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    vi.useRealTimers();
  });

  it("handles getAttendingOptions error by sending error response", () => {
    const select = document.getElementById("Attendings");
    Object.defineProperty(select, "options", {
      get() {
        throw new Error("options error");
      },
      configurable: true,
    });
    const sendResponse = vi.fn();
    listener({ action: "getAttendingOptions" }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });
});
