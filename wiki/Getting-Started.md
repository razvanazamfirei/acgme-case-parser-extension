# Getting Started

## Requirements

- Google Chrome (current stable)
- Authorized access to ADS Case Entry
- A standardized input file in `.xlsx`, `.xls`, or `.csv`

## Install Option A: Chrome Web Store (Recommended)

1. Open the extension listing in the Chrome Web Store.
2. Click **Add to Chrome**.
3. Confirm installation.
4. Pin the extension from the Chrome toolbar.

## Install Option B: Unpacked Build

1. Clone this repository.
2. Install dependencies and build:

```bash
bun install
bun run build
```

3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the repo `dist/` directory.

## First Run

1. Open ADS Case Entry in a tab:
   - `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`
2. Click the extension icon.
3. Open settings using the gear icon.
4. Save defaults (institution, attending, delay, optional toggles).

![Settings](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/docs/screenshots/02-settings.png)

## File Contract (Required Columns)

- `Case ID`
- `Case Date`
- `Supervisor`
- `Age`
- `Original Procedure`
- `ASA Physical Status`
- `Anesthesia Type`
- `Procedure Category`

See [Architecture and Interface](Architecture-and-Interface) for full schema details.
