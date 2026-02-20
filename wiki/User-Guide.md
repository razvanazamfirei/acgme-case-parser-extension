# User Guide

## 1. Open ADS Case Entry

Keep an active tab open on:

- `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

If you are not on this route, fill/submit actions are blocked by design.

## 2. Configure Settings

1. Open the popup.
2. Click the gear icon.
3. Configure any defaults:
   - Institution
   - Attending fallback (`LASTNAME, FIRSTNAME`)
   - Auto-submit delay
   - Cardiac/5E helper toggles
4. Click **Save Settings**.

![Settings](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/docs/screenshots/02-settings.png)

## 3. Load Cases

1. Click **Choose Excel File**.
2. Select your `.xlsx`, `.xls`, or `.csv` file.
3. Confirm case counters appear.

![Load cases](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/docs/screenshots/01-upload.png)

## 4. Review Case Data

1. Navigate with **Previous**, **Next**, or **Jump to**.
2. Review fields before writing to ADS.
3. Watch status chips (`pending`, `submitted`, `skipped`).

![Review case](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/docs/screenshots/03-review.png)

## 5. Execute Actions

- **Fill Form**: writes values to ADS but does not submit.
- **Submit**: fills and submits.
- **Skip**: marks case skipped.
- **START BEAST MODE**: processes all pending cases with delay.

![Action status](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/docs/screenshots/04-actions.png)

## 6. Recommended Operating Sequence

1. Load file.
2. Manually review first 2-3 cases.
3. Use **Fill Form** first to validate mappings.
4. Use **Submit** or **BEAST MODE** only after confirming mapping quality.

## 7. Where Behavior Lives in Code

- Popup wiring/state: `src/popup/app.js`, `src/popup/state.js`
- Spreadsheet parsing: `src/popup/excel.js`
- Case UI population/readback: `src/popup/form.js`
- ADS bridge messaging: `src/popup/acgme.js`
- On-page filling/submission logic: `src/content/content.js`
- Settings persistence: `src/popup/settings.js`, `src/popup/storage.js`

## 8. Safety and Compliance Reminders

- This tool is not affiliated with ACGME.
- Use only with authorized ADS credentials and institutional approval.
- This guide is operational documentation, not legal advice.
