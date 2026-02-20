# Settings Reference

Open settings via the gear icon in the popup header.

## Default Institution

- Type: select
- Values: `CHOP`, `HUP`, `PPMC`, `Penn Hospital`
- Applied when filling institution field in ADS

## Default Attending

- Type: text (`LASTNAME, FIRSTNAME`)
- Used when case-level attending cannot be matched
- Final fallback can use `FACULTY, FACULTY` when available

## Auto-Submit Delay

- Type: range (`0` to `2` seconds)
- Delay between fill completion and submit click

## Auto-fill Cardiac Case Extras

When enabled, cardiac cases can auto-check common adjuncts such as TEE and vascular access values if absent.

## Auto-check Non-Trauma for ASA 5E

When enabled, ASA `5E` with empty pathology defaults to `Non-Trauma`.

## Show Warnings

When enabled, popup shows warning-level mapping/fallback messages.

## Persistence Model

- Session state: `chrome.storage.local`
- Settings: `chrome.storage.sync`

## Keyboard Shortcuts

- `ArrowLeft`: previous case
- `ArrowRight`: next case
