/**
 * Excel file parsing
 */

import {
  EXPECTED_COLUMNS,
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
  STANDALONE_EXPECTED_COLUMNS,
  STANDALONE_OPTIONAL_COLUMNS,
  STANDALONE_REQUIRED_COLUMNS,
} from "./constants.js";

// Maps standalone "Procedure Name" values to caseData fields
const STANDALONE_PROCEDURE_MAP = {
  "Intubation complex": { anesthesia: "GA", airway: "Oral ETT" },
  "Intubation routine": { anesthesia: "GA", airway: "Oral ETT" },
  LMA: { anesthesia: "GA", airway: "LMA" },
  "Arterial line": { vascularAccess: "Arterial Catheter" },
  "Epidural Blood Patch": { anesthesia: "Epidural" },
  Epidural: { anesthesia: "Epidural" },
  CSE: { anesthesia: "CSE" },
  Spinal: { anesthesia: "Spinal" },
  "Peripheral nerve block": { anesthesia: "PNB Single" },
};

// Normalized (lowercase) lookup built once to handle source casing differences
const STANDALONE_PROCEDURE_MAP_LOWER = Object.fromEntries(
  Object.entries(STANDALONE_PROCEDURE_MAP).map(([k, v]) => [
    k.toLowerCase(),
    v,
  ]),
);

const METADATA_SHEET_NAMES = new Set(["_meta", "info"]);

export const Excel = {
  async parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const meta = this.readMeta(workbook);
          const dataSheetName = this.findDataSheetName(workbook);
          if (!dataSheetName) {
            reject(new Error("No data sheet found"));
            return;
          }
          const firstSheet = workbook.Sheets[dataSheetName];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (rows.length < 2) {
            reject(new Error("File has no data rows"));
            return;
          }

          const result = this.parseRows(rows, meta);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  },

  readMeta(workbook) {
    const metaSheetName =
      workbook.SheetNames.find((name) => name === "_meta") ||
      workbook.SheetNames.find((name) => this.isMetadataSheetName(name));
    const metaSheet = metaSheetName ? workbook.Sheets[metaSheetName] : null;
    if (!metaSheet) {
      return { version: "1", formatType: "caselog" };
    }

    const rows = XLSX.utils.sheet_to_json(metaSheet, { header: 1 });
    const meta = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row?.[0] && row[1] !== undefined) {
        const key = this.normalizeMetaKey(row[0]);
        if (key) {
          meta[key] = String(row[1]);
        }
      }
    }

    return {
      version: meta.version || "1",
      formatType: (meta.format_type || "caselog").trim().toLowerCase(),
    };
  },

  isMetadataSheetName(name) {
    return METADATA_SHEET_NAMES.has(
      String(name || "")
        .trim()
        .toLowerCase(),
    );
  },

  normalizeMetaKey(key) {
    return String(key || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  },

  findDataSheetName(workbook) {
    const sheetNames = workbook.SheetNames || [];
    const caseLogSheet = sheetNames.find(
      (name) =>
        String(name || "")
          .trim()
          .toLowerCase() === "caselog",
    );
    if (caseLogSheet) {
      return caseLogSheet;
    }

    return sheetNames.find((name) => !this.isMetadataSheetName(name));
  },

  parseRows(rows, meta = {}) {
    const { formatType = "caselog" } = meta;

    if (formatType === "standalone") {
      return this.parseStandaloneRows(rows);
    }
    return this.parseCaselogRows(rows);
  },

  parseCaselogRows(rows) {
    const headers = rows[0].map((h) => String(h || "").trim());
    const mappingResult = this.mapColumns(
      headers,
      EXPECTED_COLUMNS,
      REQUIRED_COLUMNS,
      OPTIONAL_COLUMNS,
    );
    if (mappingResult.missingRequired.length > 0) {
      throw new Error(
        `Missing required columns: ${mappingResult.missingRequired.join(", ")}`,
      );
    }

    const colIndex = mappingResult.colIndex;
    const cases = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) {
        continue;
      }

      let airwayStr = this.getString(row, colIndex["Airway Management"]);
      let difficultAirway = "";
      if (airwayStr) {
        const airwayTokens = airwayStr.split(";").map((t) => t.trim());
        if (airwayTokens.some((t) => t === "Difficult Airway")) {
          difficultAirway = "Unanticipated";
          airwayStr = airwayTokens
            .filter((t) => t !== "Difficult Airway")
            .join("; ");
        }
      }

      const caseData = {
        caseId: this.getString(row, colIndex["Case ID"]),
        date: this.formatDate(row[colIndex["Case Date"]]),
        attending: this.getString(row, colIndex.Supervisor),
        ageCategory: this.getString(row, colIndex.Age),
        comments: this.getString(row, colIndex["Original Procedure"]),
        asa: this.getString(row, colIndex["ASA Physical Status"]),
        anesthesia: this.getString(row, colIndex["Anesthesia Type"]),
        airway: airwayStr,
        difficultAirway: difficultAirway,
        procedureCategory: this.getString(row, colIndex["Procedure Category"]),
        vascularAccess: this.getString(
          row,
          colIndex["Specialized Vascular Access"],
        ),
        monitoring: this.getString(
          row,
          colIndex["Specialized Monitoring Techniques"],
        ),
      };

      if (caseData.caseId) {
        cases.push(caseData);
      }
    }

    return { cases, mappingResult };
  },

  parseStandaloneRows(rows) {
    const headers = rows[0].map((h) => String(h || "").trim());
    const mappingResult = this.mapColumns(
      headers,
      STANDALONE_EXPECTED_COLUMNS,
      STANDALONE_REQUIRED_COLUMNS,
      STANDALONE_OPTIONAL_COLUMNS,
    );
    if (mappingResult.missingRequired.length > 0) {
      throw new Error(
        `Missing required columns: ${mappingResult.missingRequired.join(", ")}`,
      );
    }

    const colIndex = mappingResult.colIndex;
    const cases = [];
    const unknownProcedures = new Set();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) {
        continue;
      }

      const procedureName = this.getString(row, colIndex["Procedure Name"]);
      const primaryBlock = this.getString(row, colIndex["Primary Block"]);
      const procedureNameLower = procedureName.toLowerCase();
      const procedureFields =
        STANDALONE_PROCEDURE_MAP_LOWER[procedureNameLower] || {};
      const knownProcedure =
        procedureName &&
        Object.hasOwn(STANDALONE_PROCEDURE_MAP_LOWER, procedureNameLower);
      if (procedureName && !knownProcedure) {
        unknownProcedures.add(procedureName);
      }

      let comments = this.getString(row, colIndex["Original Procedure"]);
      if (primaryBlock) {
        comments = comments
          ? `${comments} | Block: ${primaryBlock}`
          : `Block: ${primaryBlock}`;
      }

      const caseData = {
        caseId: this.getString(row, colIndex["Case ID"]),
        date: this.formatDate(row[colIndex["Case Date"]]),
        attending: this.getString(row, colIndex.Supervisor),
        ageCategory: this.getString(row, colIndex.Age),
        comments,
        primaryBlock,
        asa: this.getString(row, colIndex["ASA Physical Status"]),
        anesthesia: procedureFields.anesthesia || "",
        airway: procedureFields.airway || "",
        difficultAirway: "",
        procedureCategory: this.getString(row, colIndex["Procedure Category"]),
        vascularAccess: procedureFields.vascularAccess || "",
        monitoring: "",
      };

      if (caseData.caseId) {
        cases.push(caseData);
      }
    }

    if (unknownProcedures.size > 0) {
      mappingResult.warnings = [
        `Unknown procedure names (fields left blank): ${[...unknownProcedures].join(", ")}`,
      ];
    }

    return { cases, mappingResult };
  },

  mapColumns(headers, expectedCols, requiredCols, optionalCols) {
    const colIndex = {};
    const mapped = [];
    const missing = [];
    const missingRequired = [];
    const missingOptional = [];

    expectedCols.forEach((col) => {
      const idx = headers.findIndex(
        (h) => h.toLowerCase() === col.toLowerCase(),
      );
      if (idx === -1) {
        missing.push(col);
        if (requiredCols.includes(col)) {
          missingRequired.push(col);
        } else if (optionalCols.includes(col)) {
          missingOptional.push(col);
        }
      } else {
        colIndex[col] = idx;
        mapped.push(col);
      }
    });

    return {
      colIndex,
      mapped,
      missing,
      missingRequired,
      missingOptional,
      totalExpected: expectedCols.length,
      totalMapped: mapped.length,
      requiredExpected: requiredCols.length,
      requiredMapped: requiredCols.length - missingRequired.length,
      optionalExpected: optionalCols.length,
      optionalMapped: optionalCols.length - missingOptional.length,
    };
  },

  getString(row, idx) {
    if (idx === undefined || idx === null) {
      return "";
    }
    const val = row[idx];
    if (val === null || val === undefined) {
      return "";
    }
    return String(val).trim();
  },

  formatDate(val) {
    if (!val) {
      return "";
    }

    if (typeof val === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
      return val;
    }

    if (typeof val === "number") {
      const date = new Date((val - 25569) * 86400 * 1000);
      return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
    }

    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
    }

    return String(val);
  },
};
