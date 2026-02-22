# Chrome Web Store Publishing

This page contains copy-ready text and checklist items for Chrome Web Store submission.

## 1. Pre-Submission Checklist

- `manifest.json` version equals `package.json` version.
- Build artifacts generated from clean state.
- Zip includes **contents of `dist/`**, not project root.
- Screenshots and description match current UI behavior.
- Policy and privacy links are valid and public.

Build/package commands:

```bash
bun install
bun run clean
bun run build
bun run package:zip
```

## 2. Single Purpose (Copy for Store Listing)

Use this exact statement:

> ACGME Case Submitter imports a standardized case-log spreadsheet and helps authorized ADS users fill the ACGME Case Entry form for user-directed submission.

Short single-purpose variant:

> Fill ADS Case Entry forms from standardized case-log spreadsheets.

## 3. Permission Justifications (Copy for Review)

### `storage`

Justification:

> Stores user settings (institution, defaults, toggles) and in-progress case session status locally so users can continue work without re-importing files.

### Host permission: `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

Justification:

> Limits script execution to the ADS Case Entry page only, where the extension fills user-approved case data into form fields. The extension does not run on unrelated sites.

## 4. Data Use and Privacy Summary

Use this in listing/notes:

> Data is processed locally in the browser. No analytics, telemetry, or external API calls are used. Settings and session state are stored in Chrome storage.

Privacy reference:

- <https://github.com/razvanazamfirei/acgme-case-parser-extension/blob/main/PRIVACY.md>

## 5. Compliance and Non-Affiliation Statement

Use this in listing/description/footer:

> This project is not affiliated with, endorsed by, or sponsored by ACGME. It is intended only for authorized ADS users operating under institutional approval and applicable ACGME/ADS terms.

Policy references:

- <https://www.acgme.org/about/legal/terms-of-use>
- <https://apps.acgme.org/ads/>

## 6. Recommended Store Metadata

- Name: `ACGME Case Submitter`
- Category: `Productivity`
- Language: `English`
- Support URL: `https://github.com/razvanazamfirei/acgme-case-parser-extension/issues`
- Homepage URL: `https://github.com/razvanazamfirei/acgme-case-parser-extension`

## 7. Screenshots

Use the prepared store-sized assets:

- `assets/screenshots/store-01-upload-640x400.png`
- `assets/screenshots/store-02-settings-640x400.png`
- `assets/screenshots/store-03-review-640x400.png`
- `assets/screenshots/store-04-actions-640x400.png`

## 8. Common Rejection Risks and Mitigations

- Over-broad permissions: mitigated by single host scope and `storage` only.
- Vague purpose: mitigated by explicit single-purpose description.
- Data handling ambiguity: mitigated by explicit no-telemetry/no-external-API disclosure.
- Unsupported claims: avoid claiming affiliation or policy authorization on behalf of ACGME.
