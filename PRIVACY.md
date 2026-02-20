# Privacy

## Data Processing Scope

The extension processes uploaded case files locally in the browser popup and
fills the active ACGME case-entry web page.

## Compliance and Affiliation

- This project is not affiliated with, endorsed by, or sponsored by ACGME.
- Users must comply with:
  - `https://www.acgme.org/about/legal/terms-of-use`
  - `https://apps.acgme.org/ads/`
- This document describes data handling only and is not legal advice.

## Data Storage

Stored locally:

- `chrome.storage.local`: current session cases, current index, per-case status
- `chrome.storage.sync`: user settings (institution, defaults, behavior toggles)

## Network Behavior

- No external API calls.
- No telemetry.
- No analytics beacons.
- Host permission is limited to:
  - `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

## Data Sharing

- No automatic export or transmission to third-party services.
- Data remains in browser-controlled storage unless the user clears it.

## User Controls

- Clear Session button removes loaded case/session state.
- Settings can be updated at any time in the popup.

## Security Posture

- Manifest V3 extension.
- No remote code execution.
- Content script only injected on ACGME case-entry pages.
