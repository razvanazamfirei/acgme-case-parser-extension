# ACGME Case Submitter Chrome Extension

Standalone Chrome extension repository for uploading standardized case-parser
output and auto-filling the ACGME Case Entry page:

- `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

## Important Compliance Notice

- This project is **not affiliated with, endorsed by, or sponsored by ACGME**.
- Use is intended only for users who already have authorized ADS access and
  institutional approval for this workflow.
- Users are responsible for complying with:
  - `https://www.acgme.org/about/legal/terms-of-use`
  - `https://apps.acgme.org/ads/` (including any ADS-specific terms/policies)
- This repository does not provide legal advice and cannot guarantee compliance
  in every environment.

## Features

- Parse `.xlsx`, `.xls`, and `.csv` exports in the popup.
- Validate required input columns before loading a session.
- Navigate case-by-case with pending/submitted/skipped tracking.
- Fill ACGME form fields from standardized values.
- Optional delayed auto-submit after fill.
- Session persistence (`chrome.storage.local`) and settings sync (`chrome.storage.sync`).

## Installation

### Chrome Web Store

Install from the Chrome Web Store listing (recommended for normal users).

### Unpacked (local build)

```bash
npm install
npm run build
```

Load in Chrome:

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `dist/`.

## Quick Start (Development)

```bash
npm install
npm run build
```

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

## Documentation and Metadata

- `BUILD.md`: Build and release pipeline
- `ARCHITECTURE.md`: Module boundaries and data flow
- `INTERFACE.md`: Parser and runtime interface contract
- `SETTINGS.md`: Runtime options
- `PRIVACY.md`: Data handling and privacy statement
- `ACGME_COMPLIANCE.md`: Non-affiliation, policy-aware usage, legal disclaimer
- `CHANGELOG.md`: Release history
- `USER_GUIDE.md`: End-user install and operation guide (PDF-friendly Markdown)
- `CHROME_STORE_PUBLISHING_AND_USAGE_GUIDE.md`: Publishing and listing checklist
- `CONTRIBUTING.md`: Contributor workflow and standards
- `CODE_OF_CONDUCT.md`: Community behavior expectations
- `SECURITY.md`: Vulnerability reporting process
- `SUPPORT.md`: Support and troubleshooting channels
- `LICENSE`: Project license

## Screenshots

- Full guide screenshots: `assets/screenshots/`
- Chrome Web Store ready images (`640x400`): `assets/screenshots/store-*.png`

## Support and Security

- Support: see `SUPPORT.md`
- Security reporting: see `SECURITY.md`

## License

MIT. See `LICENSE`.
