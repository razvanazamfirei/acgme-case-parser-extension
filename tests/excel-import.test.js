import fs from "node:fs";
import vm from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Excel } from "../src/popup/excel.js";

// Exercise the same XLSX bundle and FileReader path as a real file upload.
const sandbox = {};
vm.runInNewContext(fs.readFileSync("public/xlsx.min.js", "utf8"), sandbox);
const xlsx = sandbox.XLSX;

const headers = [
  "Case ID",
  "Case Date",
  "Supervisor",
  "Age",
  "Original Procedure",
  "ASA Physical Status",
  "Procedure Category",
  "Procedure Name",
  "Primary Block",
  "Unmatched Primary Block (Original)",
];

const exports = [
  {
    name: "ob",
    procedure: "Epidural",
    category: "Vaginal Delivery",
    block: "Lumbar",
    anesthesia: "Epidural",
    vascularAccess: "",
  },
  {
    name: "blocks",
    procedure: "Peripheral nerve block",
    category: "Other (procedure cat)",
    block: "Adductor canal",
    anesthesia: "PNB Single",
    vascularAccess: "",
  },
  {
    name: "procedures",
    procedure: "PA catheter",
    category: "Other (procedure cat)",
    block: "",
    anesthesia: "",
    vascularAccess: "Pulmonary Artery Catheter",
  },
];

beforeEach(() => {
  vi.stubGlobal("XLSX", xlsx);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(exports)("$name file uploads", (record) => {
  it.each([
    "xlsx with metadata",
    "xlsx without metadata",
    "xlsx with version only",
    "csv",
  ])("imports %s with the standalone export columns", async (format) => {
    const worksheet = xlsx.utils.aoa_to_sheet([
      headers,
      [
        "TEST-001",
        "9/1/2026",
        "Test Attending",
        "d. >= 12 yr. and < 65 yr.",
        "Test procedure",
        "2",
        record.category,
        record.procedure,
        record.block,
        "",
      ],
    ]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "CaseLog");
    if (
      format === "xlsx with metadata" ||
      format === "xlsx with version only"
    ) {
      const meta = xlsx.utils.aoa_to_sheet([
        ["key", "value"],
        ["version", "2"],
        ["format_type", format === "xlsx with metadata" ? "standalone" : ""],
      ]);
      xlsx.utils.book_append_sheet(workbook, meta, "_meta");
    }

    const bookType = format === "csv" ? "csv" : "xlsx";
    const file = new File(
      [new Uint8Array(xlsx.write(workbook, { type: "array", bookType }))],
      `Test_${record.name}.${bookType}`,
    );
    const { cases, mappingResult } = await Excel.parseFile(file);

    expect(cases).toEqual([
      expect.objectContaining({
        caseId: "TEST-001",
        date: "9/1/2026",
        attending: "Test Attending",
        ageCategory: "d. >= 12 yr. and < 65 yr.",
        asa: "2",
        procedureCategory: record.category,
        anesthesia: record.anesthesia,
        vascularAccess: record.vascularAccess,
        primaryBlock: record.block,
        comments: record.block
          ? `Test procedure | Block: ${record.block}`
          : "Test procedure",
      }),
    ]);
    expect(mappingResult.missingRequired).toEqual([]);
    expect(mappingResult.warnings).toBeUndefined();
  });
});

it("imports a regular case log CSV using its Anesthesia Type column", async () => {
  const worksheet = xlsx.utils.aoa_to_sheet([
    [
      "Case ID",
      "Case Date",
      "Supervisor",
      "Age",
      "Original Procedure",
      "ASA Physical Status",
      "Anesthesia Type",
      "Procedure Category",
    ],
    [
      "TEST-002",
      "9/1/2026",
      "Test Attending",
      "Adult",
      "Test",
      "2",
      "MAC",
      "Other",
    ],
  ]);
  const file = new File(
    [xlsx.utils.sheet_to_csv(worksheet)],
    "Test_all_cases.csv",
  );
  const { cases, formatType } = await Excel.parseFile(file);
  expect(formatType).toBe("caselog");
  expect(cases[0]).toMatchObject({ caseId: "TEST-002", anesthesia: "MAC" });
});
