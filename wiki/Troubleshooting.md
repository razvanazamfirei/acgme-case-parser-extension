# Troubleshooting

## Popup says: "Navigate to ACGME Case Entry page first"

- Ensure active tab matches:
  - `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`
- Refresh the ADS page and retry.

## "Content script not loaded"

- Reload ADS tab.
- Reopen popup.
- Confirm extension is enabled in `chrome://extensions`.

## Upload fails due missing columns

- Verify exact header names for required fields.
- Remove extra rows above header row.
- Re-export source spreadsheet and retry.

## Attending not found

- Use exact `LASTNAME, FIRSTNAME` formatting.
- Configure a default attending in settings.

## Case marked submitted unexpectedly

- Confirm whether **Submit** or **BEAST MODE** was used.
- Check delay and status messages in popup.

## BEAST mode pauses

- Review warning/error status output.
- Correct case data and continue.

## How to collect a useful bug report

Include:

- Extension version
- Chrome version
- Reproduction steps
- Popup status/error text
- Sanitized sample input (no patient identifiers)

Open issues at:

- <https://github.com/razvanazamfirei/acgme-case-parser-extension/issues>
