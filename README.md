# ACGME Case Submitter Chrome Extension

Standalone Chrome extension repository for uploading standardized case-parser
output and auto-filling the ACGME Case Entry page:

- `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

## Features

- Parse `.xlsx`, `.xls`, and `.csv` exports in the popup.
- Validate required input columns before loading a session.
- Navigate case-by-case with pending/submitted/skipped tracking.
- Fill ACGME form fields from standardized values.
- Optional delayed auto-submit after fill.
- Session persistence (`chrome.storage.local`) and settings sync (`chrome.storage.sync`).

## Quick Start

```bash
npm install
npm run build
```

Load in Chrome:

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `dist/`.

## Development

```bash
npm run dev         # Vite dev server for popup iteration
npm run build       # Production build
npm run build:dev   # Unminified build with sourcemaps
npm run clean

npm run lint
npm run lint:fix
npm run format
npm run check
```

If you prefer Bun, `bun run <script>` works with the same script names.

## Packaging For Chrome Web Store

```bash
npm run package:zip
```

This creates `acgme-case-submitter-v<version>.zip` at repo root.

## Permissions

- `storage`
- Host access only for `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

No remote code execution, no external network calls, no third-party telemetry.

## Interface Contract

The parser-extension interface is versioned and documented in:

- `INTERFACE.md`

This includes:

- required input columns and accepted values,
- popup-to-content message contract,
- compatibility expectations with parser output.

## Documentation

- `BUILD.md`: Build and release pipeline
- `ARCHITECTURE.md`: Module boundaries and data flow
- `INTERFACE.md`: Parser and runtime interface contract
- `SETTINGS.md`: Runtime options
- `PRIVACY.md`: Data handling and privacy statement
- `CHANGELOG.md`: Release history
