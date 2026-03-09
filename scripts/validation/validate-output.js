#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import vm from "node:vm";

import { Excel } from "../../src/popup/excel.js";

function printUsage() {
  console.error(
    "Usage: node scripts/validation/validate-output.js <output-dir> [--json <report-path>] [--limit <n>] [--fail-on-warnings]",
  );
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    rootDir: "",
    jsonPath: "",
    limit: 0,
    failOnWarnings: false,
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) {
      continue;
    }

    if (!options.rootDir && !arg.startsWith("--")) {
      options.rootDir = arg;
      continue;
    }

    if (arg === "--json") {
      options.jsonPath = args.shift() || "";
      continue;
    }

    if (arg === "--limit") {
      options.limit = Number.parseInt(args.shift() || "", 10) || 0;
      continue;
    }

    if (arg === "--fail-on-warnings") {
      options.failOnWarnings = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.rootDir) {
    throw new Error("Missing required output directory path");
  }

  return options;
}

function walkFiles(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.name.startsWith("~$")) {
        continue;
      }

      if (!/\.(xlsx|xls|csv)$/i.test(entry.name)) {
        continue;
      }

      files.push(fullPath);
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function loadXlsxGlobal() {
  if (globalThis.XLSX) {
    return globalThis.XLSX;
  }

  const xlsxBundlePath = path.resolve(process.cwd(), "public/xlsx.min.js");
  const code = fs.readFileSync(xlsxBundlePath, "utf8");
  const sandbox = { console, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  globalThis.XLSX = sandbox.XLSX;
  return globalThis.XLSX;
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function topEntries(map, limit = 20) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit);
}

function serializeMap(map) {
  return [...map.entries()].sort((a, b) =>
    String(a[0]).localeCompare(String(b[0])),
  );
}

function summarizeWarnings(warnings) {
  const counts = new Map();
  for (const entry of warnings) {
    increment(counts, entry.warning);
  }
  return topEntries(counts, 20).map(([warning, count]) => ({ warning, count }));
}

function collectReport(rootDir, files) {
  const XLSX = loadXlsxGlobal();
  const failures = [];
  const warnings = [];
  const formatCounts = new Map();
  const sheetLayoutCounts = new Map();
  const headerLayoutCounts = new Map();
  const metadataSheetCounts = new Map();
  const filesByFormat = new Map();
  const sampleCases = [];
  const startedAt = performance.now();

  files.forEach((file, index) => {
    const relativePath = path.relative(rootDir, file);

    if ((index + 1) % 100 === 0 || index === files.length - 1) {
      console.error(`Validated ${index + 1}/${files.length}: ${relativePath}`);
    }

    try {
      const workbook = XLSX.read(fs.readFileSync(file), { type: "buffer" });
      const meta = Excel.readMeta(workbook);
      const dataSheetName = Excel.findDataSheetName(workbook);
      if (!dataSheetName) {
        throw new Error("No data sheet found");
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[dataSheetName], {
        header: 1,
        defval: "",
      });
      if (rows.length < 2) {
        throw new Error("File has no data rows");
      }

      const { cases, mappingResult } = Excel.parseRows(rows, meta);
      if (cases.length === 0) {
        throw new Error("No valid cases found in file");
      }

      increment(formatCounts, meta.formatType || "unknown");
      increment(sheetLayoutCounts, workbook.SheetNames.join(" | "));
      increment(
        headerLayoutCounts,
        `${meta.formatType} | ${rows[0].map((h) => String(h || "").trim()).join(" | ")}`,
      );

      const metadataSheetName =
        workbook.SheetNames.find((name) => name === "_meta") ||
        workbook.SheetNames.find((name) => Excel.isMetadataSheetName(name)) ||
        "(none)";
      increment(metadataSheetCounts, metadataSheetName);

      if (!filesByFormat.has(meta.formatType)) {
        filesByFormat.set(meta.formatType, []);
      }
      const formatFiles = filesByFormat.get(meta.formatType);
      if (formatFiles.length < 5) {
        formatFiles.push(relativePath);
      }

      if (sampleCases.length < 25) {
        const sampleCase =
          cases.find((entry) => entry.comments?.includes("Block:")) || cases[0];
        sampleCases.push({
          file: relativePath,
          formatType: meta.formatType,
          caseCount: cases.length,
          sheets: workbook.SheetNames,
          sampleCase: {
            caseId: sampleCase.caseId,
            ageCategory: sampleCase.ageCategory,
            anesthesia: sampleCase.anesthesia,
            airway: sampleCase.airway,
            procedureCategory: sampleCase.procedureCategory,
            comments: sampleCase.comments,
          },
        });
      }

      for (const warning of mappingResult.warnings || []) {
        warnings.push({
          file: relativePath,
          warning,
        });
      }
    } catch (error) {
      failures.push({
        file: relativePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const durationMs = Math.round(performance.now() - startedAt);
  return {
    rootDir,
    totalFiles: files.length,
    durationMs,
    failures,
    warnings,
    summary: {
      failureCount: failures.length,
      warningCount: warnings.length,
      formatCounts: serializeMap(formatCounts),
      metadataSheetCounts: serializeMap(metadataSheetCounts),
      topSheetLayouts: topEntries(sheetLayoutCounts, 10),
      topHeaderLayouts: topEntries(headerLayoutCounts, 10),
      filesByFormat: serializeMap(filesByFormat),
      topWarnings: summarizeWarnings(warnings),
      sampleCases,
    },
  };
}

function printSummary(report) {
  console.log(`Root: ${report.rootDir}`);
  console.log(`Files checked: ${report.totalFiles}`);
  console.log(`Duration: ${report.durationMs}ms`);
  console.log(`Failures: ${report.summary.failureCount}`);
  console.log(`Warnings: ${report.summary.warningCount}`);

  console.log("Formats:");
  for (const [format, count] of report.summary.formatCounts) {
    console.log(`  ${format}: ${count}`);
  }

  console.log("Metadata sheets:");
  for (const [name, count] of report.summary.metadataSheetCounts) {
    console.log(`  ${name}: ${count}`);
  }

  if (report.summary.topWarnings.length > 0) {
    console.log("Top warnings:");
    for (const entry of report.summary.topWarnings) {
      console.log(`  ${entry.count}x ${entry.warning}`);
    }
  }

  if (report.failures.length > 0) {
    console.log("Failures:");
    for (const failure of report.failures.slice(0, 20)) {
      console.log(`  ${failure.file}: ${failure.error}`);
    }
  }
}

function writeJsonReport(jsonPath, report) {
  const resolved = path.resolve(jsonPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`);
  return resolved;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const rootDir = path.resolve(options.rootDir);
    const files = walkFiles(rootDir);
    const limitedFiles =
      options.limit > 0 ? files.slice(0, options.limit) : files;

    if (limitedFiles.length === 0) {
      throw new Error("No spreadsheet files found");
    }

    const report = collectReport(rootDir, limitedFiles);
    printSummary(report);

    if (options.jsonPath) {
      const resolved = writeJsonReport(options.jsonPath, report);
      console.log(`JSON report written to: ${resolved}`);
    }

    const hasFailures = report.summary.failureCount > 0;
    const hasWarnings = report.summary.warningCount > 0;
    if (hasFailures || (options.failOnWarnings && hasWarnings)) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printUsage();
    process.exitCode = 1;
  }
}

await main();
