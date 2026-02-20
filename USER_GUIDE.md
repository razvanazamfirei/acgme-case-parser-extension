# ACGME Case Submitter User Guide

Version: `1.3.0`

This guide is written in Markdown so it can be exported directly to PDF.

## 1. What this extension does

ACGME Case Submitter helps you import standardized case log spreadsheets and
fill the ACGME Case Entry form on:

- `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

## 2. Compliance and authorization

- This extension is **not affiliated with, endorsed by, or sponsored by ACGME**.
- You must use it only with authorized ADS credentials and institutional
  approval.
- You are responsible for following:
  - `https://www.acgme.org/about/legal/terms-of-use`
  - `https://apps.acgme.org/ads/` (including ADS-specific policies)
- ACGME Terms include restrictions on unauthorized access and use of automated
  tools to monitor/copy site content. Obtain institutional and/or ACGME
  approval before using automation features.
- This guide is operational documentation, not legal advice.
- No disclaimer can guarantee compliance by itself. Your account rights,
  institution policy, and ACGME terms control permitted use.
- For repository-level compliance language, see `ACGME_COMPLIANCE.md`.

## 3. Requirements

- Google Chrome (current stable)
- Access to ACGME Case Entry
- Spreadsheet file in `.xlsx`, `.xls`, or `.csv` format with required columns

Required spreadsheet columns:

- `Case ID`
- `Case Date`
- `Supervisor`
- `Age`
- `Original Procedure`
- `ASA Physical Status`
- `Anesthesia Type`
- `Procedure Category`

Optional columns:

- `Airway Management`
- `Specialized Vascular Access`
- `Specialized Monitoring Techniques`

## 4. Installation

### Option A: Install from Chrome Web Store (recommended)

1. Open the extension listing in Chrome Web Store.
2. Click `Add to Chrome`.
3. Confirm installation.
4. Pin the extension from the Chrome toolbar for quick access.

### Option B: Install unpacked from this repository

1. Open a terminal in the repository.
2. Build the extension:

```bash
npm install
npm run build
```

3. Open `chrome://extensions`.
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select the repository `dist/` folder.

## 5. First-time setup

1. Navigate to the ACGME Case Entry page and keep that tab open.
2. Click the extension icon in the Chrome toolbar.
3. Click the gear icon to open settings.
4. Optionally set:
- Default Institution
- Default Attending
- Auto-submit delay
- Cardiac auto-fill and 5E options
5. Click `Save Settings`.

![Settings](assets/screenshots/02-settings.png)

## 6. Load your case file

1. In the popup, click `Choose Excel File`.
2. Select your `.xlsx`, `.xls`, or `.csv` file.
3. Confirm the case counter appears and the first case loads.

![Upload](assets/screenshots/01-upload.png)

## 7. Review and process each case

1. Use `Previous`, `Next`, or `Jump to` to navigate.
2. Review and adjust any field values before submission.
3. Choose one action:
- `Fill Form`: fills fields on the ACGME page only
- `Submit`: fills then submits after configured delay
- `Skip`: marks case as skipped and moves to next pending case

![Case Review](assets/screenshots/03-review.png)

Validation and status messages appear in the popup.

![Action Status](assets/screenshots/04-actions.png)

## 8. BEAST mode (bulk processing)

Use `START BEAST MODE` to auto-process all pending cases.

Behavior:

- Works through pending cases automatically
- Pauses on validation/submission issues so you can correct and continue
- Supports stop/resume from the same button

## 9. Troubleshooting

### Popup says “Navigate to ACGME Case Entry page first”

- Make sure the active tab is on:
  `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

### “Content script not loaded” message

- Refresh the ACGME page
- Reopen the extension popup and retry

### Missing columns error during upload

- Verify exact header names against section 3
- Remove extra header rows above the real column header row

### Attending not found

- Confirm exact `LASTNAME, FIRSTNAME` format
- Set a Default Attending in settings

## 10. Data and privacy

- Files are parsed locally in your browser popup.
- Settings and session progress are stored in Chrome storage.
- No external API calls or telemetry are used by the extension.

See `PRIVACY.md` for details.

## 11. Export this guide to PDF

Example with Pandoc:

```bash
pandoc USER_GUIDE.md -o USER_GUIDE.pdf
```

If you want embedded images in the PDF, run the command from repository root
so relative image paths resolve correctly.
