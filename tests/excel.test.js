import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Excel } from "../src/popup/excel.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CASELOG_HEADERS = [
  "Case ID",
  "Case Date",
  "Supervisor",
  "Age",
  "Original Procedure",
  "ASA Physical Status",
  "Anesthesia Type",
  "Procedure Category",
  "Airway Management",
  "Specialized Vascular Access",
  "Specialized Monitoring Techniques",
];

const STANDALONE_HEADERS = [
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

function makeRow(values) {
  return CASELOG_HEADERS.map((h) => values[h] ?? "");
}

function makeStandaloneRow(values) {
  return STANDALONE_HEADERS.map((h) => values[h] ?? "");
}

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("Excel.formatDate", () => {
  it("returns empty string for falsy values", () => {
    expect(Excel.formatDate(null)).toBe("");
    expect(Excel.formatDate(undefined)).toBe("");
    expect(Excel.formatDate(0)).toBe("");
    expect(Excel.formatDate("")).toBe("");
  });

  it("returns the string unchanged when it matches m/d/yyyy", () => {
    expect(Excel.formatDate("1/15/2024")).toBe("1/15/2024");
    expect(Excel.formatDate("12/3/2023")).toBe("12/3/2023");
  });

  it("converts Excel serial number using UTC (no off-by-one in any TZ)", () => {
    // 45306 = 2024-01-15 UTC  (45292 = Jan 1 + 14 days)
    const result = Excel.formatDate(45306);
    expect(result).toBe("1/15/2024");
  });

  it("converts another Excel serial correctly", () => {
    // 44927 = 2023-01-01 UTC
    expect(Excel.formatDate(44927)).toBe("1/1/2023");
  });

  it("parses date strings not matching m/d/yyyy format via Date constructor using UTC", () => {
    // ISO strings are parsed as UTC midnight; UTC getters are used, so result is timezone-stable
    expect(Excel.formatDate("2024-06-15")).toBe("6/15/2024");
  });

  it("returns raw string for completely invalid date strings", () => {
    expect(Excel.formatDate("not-a-date")).toBe("not-a-date");
  });
});

// ---------------------------------------------------------------------------
// mapColumns
// ---------------------------------------------------------------------------

describe("Excel.mapColumns", () => {
  const required = ["A", "B"];
  const optional = ["C"];
  const expected = ["A", "B", "C"];

  it("maps all columns when all are present", () => {
    const result = Excel.mapColumns(
      ["A", "B", "C"],
      expected,
      required,
      optional,
    );
    expect(result.missingRequired).toEqual([]);
    expect(result.missingOptional).toEqual([]);
    expect(result.colIndex.A).toBe(0);
    expect(result.colIndex.B).toBe(1);
    expect(result.colIndex.C).toBe(2);
    expect(result.totalMapped).toBe(3);
    expect(result.requiredMapped).toBe(2);
    expect(result.optionalMapped).toBe(1);
  });

  it("flags missing required columns", () => {
    const result = Excel.mapColumns(["C"], expected, required, optional);
    expect(result.missingRequired).toEqual(["A", "B"]);
    expect(result.missingOptional).toEqual([]);
  });

  it("flags missing optional columns separately", () => {
    const result = Excel.mapColumns(["A", "B"], expected, required, optional);
    expect(result.missingRequired).toEqual([]);
    expect(result.missingOptional).toEqual(["C"]);
  });

  it("is case-insensitive", () => {
    const result = Excel.mapColumns(
      ["a", "b", "c"],
      expected,
      required,
      optional,
    );
    expect(result.missingRequired).toEqual([]);
    expect(result.colIndex.A).toBe(0);
  });

  it("reports correct totalExpected and requiredExpected", () => {
    const result = Excel.mapColumns(
      ["A", "B", "C"],
      expected,
      required,
      optional,
    );
    expect(result.totalExpected).toBe(3);
    expect(result.requiredExpected).toBe(2);
    expect(result.optionalExpected).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// readMeta
// ---------------------------------------------------------------------------

describe("Excel.readMeta", () => {
  it("returns caselog defaults when no _meta sheet exists", () => {
    const workbook = { Sheets: {}, SheetNames: [] };
    const meta = Excel.readMeta(workbook);
    expect(meta.formatType).toBe("caselog");
    expect(meta.version).toBe("1");
  });

  it("reads format_type and version from _meta sheet", () => {
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      ["key", "value"],
      ["version", "2"],
      ["format_type", "standalone"],
    ]);
    const workbook = { Sheets: { _meta: {} }, SheetNames: ["Sheet1", "_meta"] };
    const meta = Excel.readMeta(workbook);
    expect(meta.formatType).toBe("standalone");
    expect(meta.version).toBe("2");
  });

  it("falls back to the Info sheet when _meta is absent", () => {
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      ["Field", "Value"],
      ["Version", "2"],
      ["Format Type", "standalone"],
    ]);
    const workbook = { Sheets: { Info: {} }, SheetNames: ["Info"] };
    const meta = Excel.readMeta(workbook);
    expect(meta.formatType).toBe("standalone");
    expect(meta.version).toBe("2");
  });

  it("uses defaults for missing keys in _meta", () => {
    XLSX.utils.sheet_to_json.mockReturnValueOnce([["key", "value"]]);
    const workbook = { Sheets: { _meta: {} }, SheetNames: ["_meta"] };
    const meta = Excel.readMeta(workbook);
    expect(meta.formatType).toBe("caselog");
    expect(meta.version).toBe("1");
  });

  it("normalizes format_type to lowercase", () => {
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      ["key", "value"],
      ["format_type", "Standalone"],
    ]);
    const workbook = { Sheets: { _meta: {} }, SheetNames: ["_meta"] };
    const meta = Excel.readMeta(workbook);
    expect(meta.formatType).toBe("standalone");
  });

  it("trims whitespace from format_type", () => {
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      ["key", "value"],
      ["format_type", "  caselog  "],
    ]);
    const workbook = { Sheets: { _meta: {} }, SheetNames: ["_meta"] };
    const meta = Excel.readMeta(workbook);
    expect(meta.formatType).toBe("caselog");
  });

  it("skips rows where value is undefined", () => {
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      ["key", "value"],
      ["format_type"], // no value at index 1
    ]);
    const workbook = { Sheets: { _meta: {} }, SheetNames: ["_meta"] };
    const meta = Excel.readMeta(workbook);
    expect(meta.formatType).toBe("caselog");
  });
});

// ---------------------------------------------------------------------------
// parseCaselogRows
// ---------------------------------------------------------------------------

describe("Excel.parseCaselogRows", () => {
  it("throws when required columns are missing", () => {
    expect(() => Excel.parseCaselogRows([["Case ID"]])).toThrow(
      "Missing required columns",
    );
  });

  it("parses a complete caselog row", () => {
    const row = makeRow({
      "Case ID": "CASE-001",
      "Case Date": "1/15/2024",
      Supervisor: "Smith",
      Age: "Adult",
      "Original Procedure": "Hip replacement",
      "ASA Physical Status": "2",
      "Anesthesia Type": "GA",
      "Procedure Category": "Cardiac with CPB",
      "Airway Management": "Oral ETT",
      "Specialized Vascular Access": "Arterial Catheter",
      "Specialized Monitoring Techniques": "TEE",
    });
    const { cases } = Excel.parseCaselogRows([CASELOG_HEADERS, row]);
    expect(cases).toHaveLength(1);
    const c = cases[0];
    expect(c.caseId).toBe("CASE-001");
    expect(c.attending).toBe("Smith");
    expect(c.asa).toBe("2");
    expect(c.anesthesia).toBe("GA");
    expect(c.airway).toBe("Oral ETT");
    expect(c.vascularAccess).toBe("Arterial Catheter");
    expect(c.monitoring).toBe("TEE");
    expect(c.difficultAirway).toBe("");
  });

  it("extracts Difficult Airway and strips it from airway string", () => {
    const row = makeRow({
      "Case ID": "CASE-002",
      "Case Date": "1/15/2024",
      Supervisor: "Smith",
      Age: "Adult",
      "Original Procedure": "Procedure",
      "ASA Physical Status": "3",
      "Anesthesia Type": "GA",
      "Procedure Category": "Other (procedure cat)",
      "Airway Management": "Oral ETT; Difficult Airway",
    });
    const { cases } = Excel.parseCaselogRows([CASELOG_HEADERS, row]);
    expect(cases[0].difficultAirway).toBe("Unanticipated");
    expect(cases[0].airway).toBe("Oral ETT");
  });

  it("ignores empty rows", () => {
    const { cases } = Excel.parseCaselogRows([CASELOG_HEADERS, [], null]);
    expect(cases).toHaveLength(0);
  });

  it("skips rows without a caseId", () => {
    const row = makeRow({ "Case ID": "", Supervisor: "Smith" });
    const { cases } = Excel.parseCaselogRows([CASELOG_HEADERS, row]);
    expect(cases).toHaveLength(0);
  });

  it("handles missing optional columns gracefully", () => {
    const minHeaders = [
      "Case ID",
      "Case Date",
      "Supervisor",
      "Age",
      "Original Procedure",
      "ASA Physical Status",
      "Anesthesia Type",
      "Procedure Category",
    ];
    const row = [
      "CASE-003",
      "1/15/2024",
      "Jones",
      "Adult",
      "Procedure",
      "1",
      "MAC",
      "Cardiac without CPB",
    ];
    const { cases } = Excel.parseCaselogRows([minHeaders, row]);
    expect(cases[0].airway).toBe("");
    expect(cases[0].vascularAccess).toBe("");
    expect(cases[0].monitoring).toBe("");
  });

  it("handles Difficult Airway alone without other airway entries", () => {
    const row = makeRow({
      "Case ID": "CASE-004",
      "Case Date": "1/15/2024",
      Supervisor: "Smith",
      Age: "Adult",
      "Original Procedure": "Procedure",
      "ASA Physical Status": "2",
      "Anesthesia Type": "GA",
      "Procedure Category": "Other (procedure cat)",
      "Airway Management": "Difficult Airway",
    });
    const { cases } = Excel.parseCaselogRows([CASELOG_HEADERS, row]);
    expect(cases[0].difficultAirway).toBe("Unanticipated");
    expect(cases[0].airway).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseStandaloneRows
// ---------------------------------------------------------------------------

describe("Excel.parseStandaloneRows", () => {
  it("throws when required standalone columns are missing", () => {
    expect(() => Excel.parseStandaloneRows([["Case ID"]])).toThrow(
      "Missing required columns",
    );
  });

  const procedureCases = [
    [
      "Intubation complex",
      { anesthesia: "GA", airway: "Oral ETT", vascularAccess: "" },
    ],
    [
      "Intubation routine",
      { anesthesia: "GA", airway: "Oral ETT", vascularAccess: "" },
    ],
    ["LMA", { anesthesia: "GA", airway: "LMA", vascularAccess: "" }],
    [
      "Arterial line",
      { anesthesia: "", airway: "", vascularAccess: "Arterial Catheter" },
    ],
    [
      "Epidural Blood Patch",
      { anesthesia: "Epidural", airway: "", vascularAccess: "" },
    ],
    ["Epidural", { anesthesia: "Epidural", airway: "", vascularAccess: "" }],
    ["CSE", { anesthesia: "CSE", airway: "", vascularAccess: "" }],
    ["Spinal", { anesthesia: "Spinal", airway: "", vascularAccess: "" }],
    [
      "Peripheral nerve block",
      { anesthesia: "PNB Single", airway: "", vascularAccess: "" },
    ],
  ];

  for (const [procedureName, expected] of procedureCases) {
    it(`maps ${procedureName} correctly`, () => {
      const row = makeStandaloneRow({
        "Case ID": "CASE-SA-001",
        "Case Date": "7/1/2023",
        Supervisor: "Jones",
        "Original Procedure": "Some Procedure",
        "ASA Physical Status": "2",
        "Procedure Category": "Other (procedure cat)",
        "Procedure Name": procedureName,
        "Primary Block": "",
      });
      const { cases } = Excel.parseStandaloneRows([STANDALONE_HEADERS, row]);
      expect(cases).toHaveLength(1);
      expect(cases[0].anesthesia).toBe(expected.anesthesia);
      expect(cases[0].airway).toBe(expected.airway);
      expect(cases[0].vascularAccess).toBe(expected.vascularAccess);
    });
  }

  it("appends primary block to comments", () => {
    const row = makeStandaloneRow({
      "Case ID": "CASE-SA-002",
      "Case Date": "8/1/2023",
      Supervisor: "Jones",
      "Original Procedure": "Hip Replacement",
      "ASA Physical Status": "2",
      "Procedure Category": "Other (procedure cat)",
      "Procedure Name": "Peripheral nerve block",
      "Primary Block": "Adductor canal block",
    });
    const { cases } = Excel.parseStandaloneRows([STANDALONE_HEADERS, row]);
    expect(cases[0].comments).toContain("Hip Replacement");
    expect(cases[0].comments).toContain("Block: Adductor canal block");
  });

  it("sets block-only comment when original procedure is blank", () => {
    const row = makeStandaloneRow({
      "Case ID": "CASE-SA-003",
      "Case Date": "8/1/2023",
      Supervisor: "Jones",
      "Original Procedure": "",
      "ASA Physical Status": "2",
      "Procedure Category": "Other (procedure cat)",
      "Procedure Name": "Peripheral nerve block",
      "Primary Block": "Femoral nerve block",
    });
    const { cases } = Excel.parseStandaloneRows([STANDALONE_HEADERS, row]);
    expect(cases[0].comments).toBe("Block: Femoral nerve block");
  });

  it("preserves ageCategory when the standalone export includes Age", () => {
    const row = makeStandaloneRow({
      "Case ID": "CASE-SA-004",
      "Case Date": "9/1/2023",
      Supervisor: "Jones",
      Age: "d. >= 12 yr. and < 65 yr.",
      "Original Procedure": "Procedure",
      "ASA Physical Status": "3",
      "Procedure Category": "Other (procedure cat)",
      "Procedure Name": "Spinal",
      "Primary Block": "",
    });
    const { cases } = Excel.parseStandaloneRows([STANDALONE_HEADERS, row]);
    expect(cases[0].ageCategory).toBe("d. >= 12 yr. and < 65 yr.");
  });

  it("leaves ageCategory blank when the optional Age column is absent", () => {
    const headersNoAge = STANDALONE_HEADERS.filter((h) => h !== "Age");
    const row = headersNoAge.map((h) =>
      h === "Case ID"
        ? "CASE-SA-004B"
        : h === "Procedure Name"
          ? "Spinal"
          : "val",
    );
    const { cases } = Excel.parseStandaloneRows([headersNoAge, row]);
    expect(cases[0].ageCategory).toBe("");
  });

  it("records unknown procedure names in mappingResult.warnings", () => {
    const row = makeStandaloneRow({
      "Case ID": "CASE-SA-005",
      "Case Date": "9/1/2023",
      Supervisor: "Jones",
      "Original Procedure": "Procedure",
      "ASA Physical Status": "2",
      "Procedure Category": "Other (procedure cat)",
      "Procedure Name": "Unknown Procedure XYZ",
      "Primary Block": "",
    });
    const { mappingResult, cases } = Excel.parseStandaloneRows([
      STANDALONE_HEADERS,
      row,
    ]);
    expect(mappingResult.warnings).toBeDefined();
    expect(mappingResult.warnings[0]).toContain("Unknown Procedure XYZ");
    expect(cases[0].anesthesia).toBe("");
    expect(cases[0].airway).toBe("");
  });

  it("does not add warnings when all procedures are known", () => {
    const row = makeStandaloneRow({
      "Case ID": "CASE-SA-006",
      "Case Date": "9/1/2023",
      Supervisor: "Jones",
      "Original Procedure": "Procedure",
      "ASA Physical Status": "2",
      "Procedure Category": "Other (procedure cat)",
      "Procedure Name": "LMA",
      "Primary Block": "",
    });
    const { mappingResult } = Excel.parseStandaloneRows([
      STANDALONE_HEADERS,
      row,
    ]);
    expect(mappingResult.warnings).toBeUndefined();
  });

  it("skips rows without a caseId", () => {
    const row = makeStandaloneRow({ "Case ID": "", "Procedure Name": "LMA" });
    const { cases } = Excel.parseStandaloneRows([STANDALONE_HEADERS, row]);
    expect(cases).toHaveLength(0);
  });

  it("ignores empty and null rows", () => {
    const { cases } = Excel.parseStandaloneRows([STANDALONE_HEADERS, [], null]);
    expect(cases).toHaveLength(0);
  });

  it("handles missing optional Primary Block column", () => {
    const headersNoPB = STANDALONE_HEADERS.filter((h) => h !== "Primary Block");
    const row = headersNoPB.map((h) =>
      h === "Case ID"
        ? "CASE-SA-007"
        : h === "Procedure Name"
          ? "Spinal"
          : "val",
    );
    const { cases } = Excel.parseStandaloneRows([headersNoPB, row]);
    expect(cases).toHaveLength(1);
    expect(cases[0].anesthesia).toBe("Spinal");
  });

  it("looks up procedure names case-insensitively", () => {
    const row = makeStandaloneRow({
      "Case ID": "CASE-CI-001",
      "Case Date": "9/1/2023",
      Supervisor: "Jones",
      "Original Procedure": "Procedure",
      "ASA Physical Status": "2",
      "Procedure Category": "Other (procedure cat)",
      "Procedure Name": "PERIPHERAL NERVE BLOCK",
      "Primary Block": "",
    });
    const { cases, mappingResult } = Excel.parseStandaloneRows([
      STANDALONE_HEADERS,
      row,
    ]);
    expect(cases[0].anesthesia).toBe("PNB Single");
    expect(mappingResult.warnings).toBeUndefined();
  });

  it("deduplicates unknown procedure warnings (same name multiple rows)", () => {
    const makeRow2 = (id) =>
      makeStandaloneRow({
        "Case ID": id,
        "Case Date": "9/1/2023",
        Supervisor: "Jones",
        "Original Procedure": "Procedure",
        "ASA Physical Status": "2",
        "Procedure Category": "Other (procedure cat)",
        "Procedure Name": "WeirdProcedure",
        "Primary Block": "",
      });
    const { mappingResult } = Excel.parseStandaloneRows([
      STANDALONE_HEADERS,
      makeRow2("ID-1"),
      makeRow2("ID-2"),
    ]);
    // Should appear only once in the warning
    const warningText = mappingResult.warnings[0];
    const occurrences = (warningText.match(/WeirdProcedure/g) || []).length;
    expect(occurrences).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// parseRows (format routing)
// ---------------------------------------------------------------------------

describe("Excel.parseRows", () => {
  it("routes to parseCaselogRows when formatType is caselog", () => {
    const rows = [
      CASELOG_HEADERS,
      makeRow({
        "Case ID": "C1",
        "Case Date": "1/1/2024",
        Supervisor: "Smith",
        Age: "Adult",
        "Original Procedure": "Proc",
        "ASA Physical Status": "1",
        "Anesthesia Type": "GA",
        "Procedure Category": "Other (procedure cat)",
      }),
    ];
    const { cases } = Excel.parseRows(rows, { formatType: "caselog" });
    expect(cases[0].caseId).toBe("C1");
  });

  it("routes to parseStandaloneRows when formatType is standalone", () => {
    const rows = [
      STANDALONE_HEADERS,
      makeStandaloneRow({
        "Case ID": "S1",
        "Case Date": "1/1/2024",
        Supervisor: "Jones",
        "Original Procedure": "Proc",
        "ASA Physical Status": "2",
        "Procedure Category": "Other (procedure cat)",
        "Procedure Name": "LMA",
        "Primary Block": "",
      }),
    ];
    const { cases } = Excel.parseRows(rows, { formatType: "standalone" });
    expect(cases[0].caseId).toBe("S1");
    expect(cases[0].anesthesia).toBe("GA");
  });

  it("defaults to caselog when meta is omitted", () => {
    const rows = [
      CASELOG_HEADERS,
      makeRow({
        "Case ID": "C2",
        "Case Date": "1/1/2024",
        Supervisor: "Smith",
        Age: "Adult",
        "Original Procedure": "Proc",
        "ASA Physical Status": "1",
        "Anesthesia Type": "MAC",
        "Procedure Category": "Other (procedure cat)",
      }),
    ];
    const { cases } = Excel.parseRows(rows);
    expect(cases[0].anesthesia).toBe("MAC");
  });
});

// ---------------------------------------------------------------------------
// getString
// ---------------------------------------------------------------------------

describe("Excel.getString", () => {
  it("returns empty string for undefined index", () => {
    expect(Excel.getString(["a", "b"], undefined)).toBe("");
    expect(Excel.getString(["a", "b"], null)).toBe("");
  });

  it("returns empty string for null/undefined cell value", () => {
    expect(Excel.getString([null, undefined], 0)).toBe("");
    expect(Excel.getString([null, undefined], 1)).toBe("");
  });

  it("returns trimmed string value", () => {
    expect(Excel.getString(["  hello  ", "world"], 0)).toBe("hello");
  });

  it("converts numbers to strings", () => {
    expect(Excel.getString([42], 0)).toBe("42");
  });
});

// ---------------------------------------------------------------------------
// parseFile (integration with FileReader + XLSX mocks)
// ---------------------------------------------------------------------------

describe("Excel.parseFile", () => {
  const originalFileReader = global.FileReader;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.FileReader = originalFileReader;
  });

  function mockFileReader(result) {
    global.FileReader = class {
      readAsArrayBuffer() {
        setTimeout(() => {
          if (result === "error") {
            this.onerror();
          } else {
            this.onload({ target: { result } });
          }
        }, 0);
      }
    };
  }

  it("rejects when file read fails", async () => {
    mockFileReader("error");
    await expect(Excel.parseFile({})).rejects.toThrow("Failed to read file");
  });

  it("rejects when the sheet has fewer than 2 rows", async () => {
    mockFileReader(new Uint8Array([1, 2, 3]));
    XLSX.read.mockReturnValue({
      Sheets: { Sheet1: {} },
      SheetNames: ["Sheet1"],
    });
    XLSX.utils.sheet_to_json.mockReturnValueOnce([["Case ID"]]); // first sheet: only header
    await expect(Excel.parseFile({})).rejects.toThrow("no data rows");
  });

  it("rejects when XLSX.read throws", async () => {
    mockFileReader(new Uint8Array([1, 2, 3]));
    XLSX.read.mockImplementation(() => {
      throw new Error("bad workbook");
    });
    await expect(Excel.parseFile({})).rejects.toThrow("bad workbook");
  });

  it("resolves with caselog cases on success", async () => {
    mockFileReader(new Uint8Array([1, 2, 3]));
    XLSX.read.mockReturnValue({
      Sheets: { Sheet1: {} },
      SheetNames: ["Sheet1"],
    });
    // readMeta call: no _meta sheet so skipped
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      CASELOG_HEADERS,
      makeRow({
        "Case ID": "PARSE-001",
        "Case Date": "1/15/2024",
        Supervisor: "Smith",
        Age: "Adult",
        "Original Procedure": "Procedure",
        "ASA Physical Status": "2",
        "Anesthesia Type": "GA",
        "Procedure Category": "Other (procedure cat)",
      }),
    ]);
    const result = await Excel.parseFile({});
    expect(result.cases[0].caseId).toBe("PARSE-001");
  });

  it("rejects when all sheets are named _meta (no data sheet)", async () => {
    mockFileReader(new Uint8Array([1, 2, 3]));
    XLSX.read.mockReturnValue({
      Sheets: { _meta: {} },
      SheetNames: ["_meta"],
    });
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      ["key", "value"],
      ["format_type", "caselog"],
    ]);
    await expect(Excel.parseFile({})).rejects.toThrow("No data sheet found");
  });

  it("rejects when all sheets are metadata sheets", async () => {
    const infoSheet = { name: "Info" };
    const metaSheet = { name: "_meta" };
    mockFileReader(new Uint8Array([1, 2, 3]));
    XLSX.read.mockReturnValue({
      Sheets: { Info: infoSheet, _meta: metaSheet },
      SheetNames: ["Info", "_meta"],
    });
    XLSX.utils.sheet_to_json.mockReturnValueOnce([
      ["Field", "Value"],
      ["Format Type", "caselog"],
    ]);
    await expect(Excel.parseFile({})).rejects.toThrow("No data sheet found");
    expect(XLSX.utils.sheet_to_json).toHaveBeenCalledTimes(1);
    expect(XLSX.utils.sheet_to_json).toHaveBeenCalledWith(metaSheet, {
      header: 1,
    });
  });

  it("reads data from the first non-_meta sheet when _meta is listed first", async () => {
    mockFileReader(new Uint8Array([1, 2, 3]));
    XLSX.read.mockReturnValue({
      Sheets: { _meta: {}, Sheet1: {} },
      SheetNames: ["_meta", "Sheet1"],
    });
    XLSX.utils.sheet_to_json
      .mockReturnValueOnce([
        ["key", "value"],
        ["format_type", "caselog"],
      ])
      .mockReturnValueOnce([
        CASELOG_HEADERS,
        makeRow({
          "Case ID": "META-FIRST-001",
          "Case Date": "1/15/2024",
          Supervisor: "Smith",
          Age: "Adult",
          "Original Procedure": "Procedure",
          "ASA Physical Status": "2",
          "Anesthesia Type": "GA",
          "Procedure Category": "Other (procedure cat)",
        }),
      ]);
    const result = await Excel.parseFile({});
    expect(result.cases[0].caseId).toBe("META-FIRST-001");
  });

  it("skips the Info sheet and reads metadata from it when _meta is absent", async () => {
    const infoSheet = { name: "Info" };
    const caseLogSheet = { name: "CaseLog" };
    mockFileReader(new Uint8Array([1, 2, 3]));
    XLSX.read.mockReturnValue({
      Sheets: { Info: infoSheet, CaseLog: caseLogSheet },
      SheetNames: ["Info", "CaseLog"],
    });
    XLSX.utils.sheet_to_json
      .mockReturnValueOnce([
        ["Field", "Value"],
        ["Version", "2"],
        ["Format Type", "standalone"],
      ])
      .mockReturnValueOnce([
        STANDALONE_HEADERS,
        makeStandaloneRow({
          "Case ID": "INFO-SHEET-001",
          "Case Date": "7/1/2023",
          Supervisor: "Jones",
          Age: "d. >= 12 yr. and < 65 yr.",
          "Original Procedure": "Proc",
          "ASA Physical Status": "2",
          "Procedure Category": "Other (procedure cat)",
          "Procedure Name": "Spinal",
          "Primary Block": "",
        }),
      ]);
    const result = await Excel.parseFile({});
    expect(result.cases[0].caseId).toBe("INFO-SHEET-001");
    expect(result.cases[0].ageCategory).toBe("d. >= 12 yr. and < 65 yr.");
    expect(result.cases[0].anesthesia).toBe("Spinal");
    expect(XLSX.utils.sheet_to_json).toHaveBeenNthCalledWith(1, infoSheet, {
      header: 1,
    });
    expect(XLSX.utils.sheet_to_json).toHaveBeenNthCalledWith(2, caseLogSheet, {
      header: 1,
    });
  });

  it("prefers the CaseLog sheet over earlier non-metadata sheets", async () => {
    const otherSheet = { name: "OtherSheet" };
    const infoSheet = { name: "Info" };
    const caseLogSheet = { name: "CaseLog" };
    mockFileReader(new Uint8Array([1, 2, 3]));
    XLSX.read.mockReturnValue({
      Sheets: {
        OtherSheet: otherSheet,
        Info: infoSheet,
        CaseLog: caseLogSheet,
      },
      SheetNames: ["OtherSheet", "Info", "CaseLog"],
    });
    XLSX.utils.sheet_to_json
      .mockReturnValueOnce([
        ["Field", "Value"],
        ["Version", "2"],
        ["Format Type", "standalone"],
      ])
      .mockReturnValueOnce([
        STANDALONE_HEADERS,
        makeStandaloneRow({
          "Case ID": "INFO-SHEET-001",
          "Case Date": "7/1/2023",
          Supervisor: "Jones",
          Age: "d. >= 12 yr. and < 65 yr.",
          "Original Procedure": "Proc",
          "ASA Physical Status": "2",
          "Procedure Category": "Other (procedure cat)",
          "Procedure Name": "Spinal",
          "Primary Block": "",
        }),
      ]);
    const result = await Excel.parseFile({});
    expect(result.cases[0].caseId).toBe("INFO-SHEET-001");
    expect(result.cases[0].ageCategory).toBe("d. >= 12 yr. and < 65 yr.");
    expect(result.cases[0].anesthesia).toBe("Spinal");
    expect(XLSX.utils.sheet_to_json).toHaveBeenNthCalledWith(1, infoSheet, {
      header: 1,
    });
    expect(XLSX.utils.sheet_to_json).toHaveBeenNthCalledWith(2, caseLogSheet, {
      header: 1,
    });
  });

  it("resolves with standalone cases when _meta says standalone", async () => {
    mockFileReader(new Uint8Array([1, 2, 3]));
    XLSX.read.mockReturnValue({
      Sheets: { Sheet1: {}, _meta: {} },
      SheetNames: ["Sheet1", "_meta"],
    });
    // readMeta call (sheet_to_json for _meta)
    XLSX.utils.sheet_to_json
      .mockReturnValueOnce([
        ["key", "value"],
        ["version", "1"],
        ["format_type", "standalone"],
      ])
      // parseFile call (sheet_to_json for Sheet1)
      .mockReturnValueOnce([
        STANDALONE_HEADERS,
        makeStandaloneRow({
          "Case ID": "SA-PARSE-001",
          "Case Date": "7/1/2023",
          Supervisor: "Jones",
          "Original Procedure": "Proc",
          "ASA Physical Status": "2",
          "Procedure Category": "Other (procedure cat)",
          "Procedure Name": "Spinal",
          "Primary Block": "",
        }),
      ]);
    const result = await Excel.parseFile({});
    expect(result.cases[0].caseId).toBe("SA-PARSE-001");
    expect(result.cases[0].anesthesia).toBe("Spinal");
  });
});
