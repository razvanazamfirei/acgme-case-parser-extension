#!/usr/bin/env bun

import fs from "node:fs";
import path from "node:path";

const releaseType = process.argv[2];
const validTypes = new Set(["patch", "minor", "major"]);

if (!validTypes.has(releaseType)) {
  console.error("Usage: bun run scripts/release/bump.mjs <patch|minor|major>");
  process.exit(1);
}

const rootDir = process.cwd();
const packagePath = path.join(rootDir, "package.json");
const manifestPath = path.join(rootDir, "manifest.json");
const popupPath = path.join(rootDir, "src/popup/index.html");
const userGuidePath = path.join(rootDir, "USER_GUIDE.md");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function bumpSemver(version, type) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  let major = Number.parseInt(match[1], 10);
  let minor = Number.parseInt(match[2], 10);
  let patch = Number.parseInt(match[3], 10);

  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function replaceVersionInFile(filePath, pattern, replacement) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const current = fs.readFileSync(filePath, "utf8");
  const updated = current.replace(pattern, replacement);
  if (updated !== current) {
    fs.writeFileSync(filePath, updated);
  }
}

const packageJson = readJson(packagePath);
const oldVersion = packageJson.version;
const newVersion = bumpSemver(oldVersion, releaseType);

packageJson.version = newVersion;
writeJson(packagePath, packageJson);

const manifestJson = readJson(manifestPath);
manifestJson.version = newVersion;
writeJson(manifestPath, manifestJson);

replaceVersionInFile(
  popupPath,
  /v\d+\.\d+\.\d+\s*-\s*BEAST Mode/g,
  `v${newVersion} - BEAST Mode`,
);

replaceVersionInFile(
  userGuidePath,
  /Version:\s*`\d+\.\d+\.\d+`/g,
  `Version: \`${newVersion}\``,
);

console.log(`Version bumped: ${oldVersion} -> ${newVersion}`);
console.log(
  "Updated: package.json, manifest.json, src/popup/index.html, USER_GUIDE.md",
);
console.log(
  "Next: update CHANGELOG.md, then commit and run bun run release:publish",
);
