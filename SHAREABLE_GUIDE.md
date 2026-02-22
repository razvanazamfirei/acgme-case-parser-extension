# ACGME Case Submitter: Shareable Quick Guide

Version: `1.3.3`

This is a simple guide you can share directly with residents/faculty.

## What this extension does

ACGME Case Submitter imports a standardized case-log spreadsheet and helps you fill the ADS Case Entry form on:

- `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

## Before you start

- You need authorized ADS access.
- You should have institutional approval for this workflow.
- This tool is not affiliated with, endorsed by, or sponsored by ACGME.

## Install

### Option A (recommended): Chrome Web Store

1. Open the Chrome Web Store listing.
2. Click `Add to Chrome`.
3. Pin the extension in Chrome.

### Option B: Unpacked build

1. From the repository root, run:

```bash
bun install
bun run build
```

2. Open `chrome://extensions`.
3. Turn on `Developer mode`.
4. Click `Load unpacked`.
5. Select the `dist/` folder.

## Step-by-step use

### 1. Open ADS Case Entry first

Keep the active tab on:

- `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

### 2. Configure settings (one-time)

1. Open the extension popup.
2. Click the gear icon.
3. Set defaults (institution, attending, submit delay).
4. Click `Save Settings`.

![Settings](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/assets/screenshots/02-settings.png)

### 3. Load your spreadsheet

1. Click `Choose Excel File`.
2. Select your `.xlsx`, `.xls`, or `.csv` file.

![Load cases](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/assets/screenshots/01-upload.png)

### 4. Review each case

1. Use `Previous`, `Next`, or `Jump to`.
2. Confirm key fields are correct.
3. Watch counters for `pending`, `submitted`, and `skipped`.

![Review case](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/assets/screenshots/03-review.png)

### 5. Choose an action

- `Fill Form`: fills ADS fields only.
- `Submit`: fills and submits.
- `Skip`: skips this case.
- `START BEAST MODE`: runs all pending cases with delay.

![Actions](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/assets/screenshots/04-actions.png)

## Required spreadsheet columns

- `Case ID`
- `Case Date`
- `Supervisor`
- `Age`
- `Original Procedure`
- `ASA Physical Status`
- `Anesthesia Type`
- `Procedure Category`

## Troubleshooting

- Message: `Navigate to ACGME Case Entry page first`:
  Make sure your active tab is the ADS Case Entry URL.
- Message: `Content script not loaded`:
  Refresh ADS page and retry.
- Upload errors:
  Confirm exact column headers and remove extra rows above the header row.

## Policy reminder

You are responsible for complying with:

- <https://www.acgme.org/about/legal/terms-of-use>
- <https://apps.acgme.org/ads/>

For the full documentation set, see `USER_GUIDE.md` and `wiki/`.
