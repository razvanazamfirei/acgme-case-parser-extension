# Permissions and Privacy

## Permissions

The extension requests only two permissions:

| Permission | Purpose |
|---|---|
| Storage | Saves your settings and current session progress locally |
| Access to `apps.acgme.org/ads/CaseLogs/CaseEntry/` | Limits the extension to the ADS Case Entry page only — it does not run on any other site |

## Data Handling

- Input files are parsed locally in the popup.
- Session progress is stored in `chrome.storage.local`.
- User settings are stored in `chrome.storage.sync`.
- No external APIs, telemetry, or analytics beacons.

## Data Categories Stored

- Case session rows and per-case status
- Selected case index
- Institution/default-attending preferences
- Feature toggles and submit-delay value

## User Controls

- **Clear Session** removes loaded session state.
- Settings can be changed any time from popup settings.

## Security Notes

- The extension only runs on the ACGME ADS Case Entry page.
- No data leaves your browser.
