/**
 * Verification: cross-check content.js code maps and selectors against local target.html.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NEURAXIAL_BLOCKADE_SITE_AREA,
  NEURAXIAL_BLOCKADE_SITE_OPTIONS,
  PERIPHERAL_NERVE_BLOCKADE_SITE_AREA,
  PERIPHERAL_NERVE_BLOCKADE_SITE_OPTIONS,
} from "../../src/shared/blockade-sites.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const targetHtml = readFileSync(join(root, "target.html"), "utf8");
const contentJs = readFileSync(join(root, "src/content/content.js"), "utf8");

const MAP_NAMES = [
  "ASA_MAP",
  "ANESTHESIA_MAP",
  "AIRWAY_MAP",
  "LARYNGOSCOPY_MAP",
  "PROCEDURE_CAT_MAP",
  "VASCULAR_MAP",
  "MONITORING_MAP",
  "DIFFICULT_AIRWAY_MAP",
  "LIFE_THREATENING_PATHOLOGY_MAP",
  "INSTITUTION_MAP",
];

function extractMapIds(mapName) {
  const re = new RegExp(`const ${mapName} = \\{([\\s\\S]*?)\\};`, "m");
  const match = contentJs.match(re);
  if (!match) return [];
  const ids = [];
  for (const m of match[1].matchAll(/:\s*"(\d+)"/g)) ids.push(m[1]);
  for (const m of match[1].matchAll(/:\s*(\d+)/g)) {
    const v = m[1];
    if (!ids.includes(v)) ids.push(v);
  }
  return [...new Set(ids)];
}

function hasId(id) {
  return (
    targetHtml.includes(`id="${id}"`) ||
    targetHtml.includes(`id='${id}'`) ||
    targetHtml.includes(`id="CaseTypes_${id}"`)
  );
}

function hasDataType(area, type) {
  const escapedArea = area.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `data-area="${escapedArea}"[\\s\\S]*?data-type="${escapedType}"|data-type="${escapedType}"[\\s\\S]*?data-area="${escapedArea}"`,
  );
  return re.test(targetHtml);
}

const coreSelectors = [
  ["#submitButton", 'id="submitButton"'],
  ["#Institutions", 'id="Institutions"'],
  ["#Attendings", 'id="Attendings"'],
  ["#PatientTypes", 'id="PatientTypes"'],
  ["#Comments", 'id="Comments"'],
  ["#clienterrors", 'id="clienterrors"'],
  ["#commentsContainer", 'id="commentsContainer"'],
  ["caseEntryApp.globals", "caseEntryApp.globals.CaseEntry99"],
  ["ProcedureDate", 'class="input-group date ProcedureDate"'],
  ["71291 prefix", 'id="71291'],
  ["5b1ce prefix", 'id="5b1ce'],
];

const results = { pass: [], fail: [] };

for (const [label, needle] of coreSelectors) {
  (targetHtml.includes(needle) ? results.pass : results.fail).push(
    `core:${label}`,
  );
}

for (const mapName of MAP_NAMES) {
  const ids = extractMapIds(mapName);
  for (const id of ids) {
    const key = `${mapName}:${id}`;
    let ok = false;
    if (mapName === "INSTITUTION_MAP") {
      ok = targetHtml.includes(`value="${id}"`);
    } else if (
      mapName.includes("DIFFICULT") ||
      mapName.includes("LIFE_THREATENING")
    ) {
      ok = hasId(id);
    } else {
      ok = hasId(id);
    }
    (ok ? results.pass : results.fail).push(key);
  }
}

for (const type of NEURAXIAL_BLOCKADE_SITE_OPTIONS) {
  const key = `neuraxial:${type}`;
  (hasDataType(NEURAXIAL_BLOCKADE_SITE_AREA, type)
    ? results.pass
    : results.fail
  ).push(key);
}

for (const type of PERIPHERAL_NERVE_BLOCKADE_SITE_OPTIONS) {
  const key = `peripheral:${type}`;
  (hasDataType(PERIPHERAL_NERVE_BLOCKADE_SITE_AREA, type)
    ? results.pass
    : results.fail
  ).push(key);
}

// Patient age option values
for (const v of ["30", "31", "32", "33", "34"]) {
  const key = `PatientTypes:${v}`;
  (targetHtml.includes(`value="${v}"`) ? results.pass : results.fail).push(key);
}

console.log(
  JSON.stringify(
    {
      pass: results.pass.length,
      fail: results.fail,
      failCount: results.fail.length,
    },
    null,
    2,
  ),
);
process.exit(results.fail.length > 0 ? 1 : 0);
