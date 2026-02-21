# Getting Started

## Requirements

- Google Chrome (current stable)
- Authorized access to ADS Case Entry
- A standardized input file in `.xlsx`, `.xls`, or `.csv`

## Install from Chrome Web Store

1. Open the extension listing in the Chrome Web Store.
2. Click **Add to Chrome**.
3. Confirm installation.
4. Pin the extension from the Chrome toolbar.

## First Run: Authorization Confirmation

On first launch the extension displays an **Authorization Required** modal. You must:

1. Select your primary UPHS institution (sets the default for form filling).
2. Check both confirmation boxes: one affirming your identity as an authorized UPHS anesthesia resident, and one accepting responsibility for verifying the accuracy of submitted case data.
3. Click **Confirm Access**.

This confirmation is saved and will not be shown again on this device.

If you decline, the extension does not proceed. Close the popup to exit.

## After Confirmation

1. Open ADS Case Entry in a tab:
   - `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`
2. Click the extension icon.
3. Optionally open settings (gear icon) to adjust institution, attending fallback, submit delay, or toggle helpers.
4. Save Settings if you make changes.

![Settings](https://raw.githubusercontent.com/razvanazamfirei/acgme-case-parser-extension/main/docs/screenshots/02-settings.png)

## Spreadsheet Format

Required columns (all eight must be present):

- `Case ID`
- `Case Date`
- `Supervisor`
- `Age`
- `Original Procedure`
- `ASA Physical Status`
- `Anesthesia Type`
- `Procedure Category`

Optional columns (missing = treated as empty):

- `Airway Management`
- `Specialized Vascular Access`
- `Specialized Monitoring Techniques`

See [Input Format Reference](Input-Format) for accepted values, date formats, multi-value field syntax, and examples.
