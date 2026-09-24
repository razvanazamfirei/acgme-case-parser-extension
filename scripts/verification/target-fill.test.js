/**
 * Loads local target.html (if present) and runs fillCase — verification only.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import "../../src/content/content.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const targetPath = join(root, "target.html");

const contentTestApi = globalThis.__CONTENT_TEST_API__;
const { fillCase, getFieldId } = contentTestApi ?? {};

describe.skipIf(!existsSync(targetPath))(
  "target.html fillCase integration",
  () => {
    beforeEach(() => {
      const html = readFileSync(targetPath, "utf8");
      document.documentElement.innerHTML = html;
    });

    it("resolves case id and date fields", () => {
      expect(getFieldId("caseId")).toBe(
        "71291aeec5a9d7383731151a615f5f0d3418ffdea0630e0b8dfab7161a5854b8",
      );
      expect(getFieldId("date")).toBe(
        "5b1ce523d862b284baf78d6c3d9a600a957dbf929d880ddc9256ac5e8dd02b54",
      );
    });

    it("fills a representative case on real ACGME DOM snapshot", () => {
      const result = fillCase({
        caseId: "VERIFY-001",
        date: "5/17/2026",
        attending: "Augoustides, Yianni",
        ageCategory: "d",
        institution: "HUP",
        asa: "3",
        anesthesia: "GA",
        airway: "Oral ETT",
        procedureCategory: "Cardiac without CPB",
        vascularAccess: "Arterial Catheter",
        monitoring: "TEE",
        comments: "Verification run | Block: lumbar",
        cardiacAutoFill: true,
        auto5EPathology: true,
        showWarnings: true,
      });

      expect(result.errors).toEqual([]);
      expect(result.filled).toContain("caseId");
      expect(result.filled).toContain("date");
      expect(result.filled).toContain("institution");
      expect(result.filled).toContain("attending");
      expect(result.filled).toContain("age");
      expect(result.filled).toContain("asa");
      expect(result.filled).toContain("anesthesia");

      const caseIdField = getFieldId("caseId");
      expect(document.getElementById(caseIdField).value).toBe("VERIFY-001");
      expect(document.getElementById("156634").checked).toBe(true);
      expect(document.getElementById("1256330").checked).toBe(true);
      expect(document.getElementById("156654").checked).toBe(true);
      expect(document.getElementById("Institutions").value).toBe("12748");
      expect(document.getElementById("PatientTypes").value).toBe("33");
      expect(document.getElementById("Comments").value).toContain(
        "Verification",
      );
    });
  },
);
