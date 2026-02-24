= ACGME Case Submitter: Shareable Quick Guide
<acgme-case-submitter-shareable-quick-guide>
Version: `1.3.3`

== What this extension does
<what-this-extension-does>
ACGME Case Submitter imports a standardized case-log spreadsheet and
helps you fill the ADS Case Entry form on:

- `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

== Before you start
<before-you-start>
- You need authorized ADS access.
- You should have institutional approval for this workflow.
- This tool is not affiliated with, endorsed by, or sponsored by ACGME.

== Install
<install>
=== Option A (recommended): Chrome Web Store
<option-a-recommended-chrome-web-store>
+ Open the Chrome Web Store listing.
+ Click `Add to Chrome`.
+ Pin the extension in Chrome.

=== Option B: Unpacked build
<option-b-unpacked-build>
+ From the repository root, run:

```bash
bun install
bun run build
```

#block[
#set enum(numbering: "1.", start: 2)
+ Open `chrome://extensions`.
+ Turn on `Developer mode`.
+ Click `Load unpacked`.
+ Select the `dist/` folder.
]

== Step-by-step use
<step-by-step-use>
=== 1. Open ADS Case Entry first
<open-ads-case-entry-first>
Keep the active tab on:

- `https://apps.acgme.org/ads/CaseLogs/CaseEntry/*`

=== 2. Configure settings (one-time)
<configure-settings-one-time>
+ Open the extension popup.
+ Click the gear icon.
+ Set defaults (institution, attending, submit delay).
+ Click `Save Settings`.

#figure(image("assets/screenshots/02-settings.png"),
  caption: [
    Settings
  ]
)

=== 3. Load your spreadsheet
<load-your-spreadsheet>
+ Click `Choose Excel File`.
+ Select your `.xlsx`, `.xls`, or `.csv` file.

#figure(image("assets/screenshots/01-upload.png"),
  caption: [
    Load cases
  ]
)

=== 4. Review each case
<review-each-case>
+ Use `Previous`, `Next`, or `Jump to`.
+ Confirm key fields are correct.
+ Watch counters for `pending`, `submitted`, and `skipped`.

#figure(image("assets/screenshots/03-review.png"),
  caption: [
    Review case
  ]
)

=== 5. Choose an action
<choose-an-action>
- `Fill Form`: fills ADS fields only.
- `Submit`: fills and submits.
- `Skip`: skips this case.
- `START BEAST MODE`: runs all pending cases with delay.

#figure(image("assets/screenshots/04-actions.png"),
  caption: [
    Actions
  ]
)

== Required spreadsheet columns
<required-spreadsheet-columns>
- `Case ID`
- `Case Date`
- `Supervisor`
- `Age`
- `Original Procedure`
- `ASA Physical Status`
- `Anesthesia Type`
- `Procedure Category`

== Troubleshooting
<troubleshooting>
- Message: `Navigate to ACGME Case Entry page first`: Make sure your
  active tab is the ADS Case Entry URL.
- Message: `Content script not loaded`: Refresh ADS page and retry.
- Upload errors: Confirm exact column headers and remove extra rows
  above the header row.

== Policy reminder
<policy-reminder>
You are responsible for complying with:

- #link("https://www.acgme.org/about/legal/terms-of-use")
- #link("https://apps.acgme.org/ads/")

For the full documentation set, see `USER_GUIDE.md` and `wiki/`.
