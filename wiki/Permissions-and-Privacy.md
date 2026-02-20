# Permissions and Privacy

## Manifest Permissions

`manifest.json` defines a least-privilege policy.

| Permission | Purpose |
|---|---|
| `storage` | Persist settings and current session progress locally/synced |
| Host: `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*` | Restrict content script injection to ADS Case Entry only |

No `activeTab`, no `scripting`, no broad host patterns.

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

- Manifest V3 extension model
- `content_security_policy` restricts extension pages to local scripts
- Content script runs only on approved ADS route

## Reference Documents

- `PRIVACY.md`
- `SECURITY.md`
- `manifest.json`
