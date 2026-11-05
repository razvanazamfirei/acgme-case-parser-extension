# Extension Architecture

## Overview

The extension has two runtime surfaces:

1. Case window (`src/popup/*`)
2. Content script (`src/content/content.js`)

Popup manages file parsing, review state, and user actions.
Content script performs DOM mapping/filling on ACGME pages.

## Modules

### Case Window (`src/popup/`)

- `app.js`: bootstrap + event wiring
- `constants.js`: IDs, storage keys, enums, URL pattern
- `state.js`: in-memory session state
- `storage.js`: persistence layer for local/sync storage
- `excel.js`: spreadsheet parsing and column mapping
- `form.js`: case form populate/read/validation
- `navigation.js`: case navigation and counters
- `settings.js`: settings read/write and UI sync
- `ui.js`: common UI helpers and status rendering
- `acgme.js`: bridge between the case window and content script messaging
- `index.html`, `popup.css`: case window UI

### Window Launch and Target Binding

- `src/background.js` opens one reusable extension window from the toolbar.
- The launcher records the invoking ACGME tab in the window URL; `target.js`
  continues addressing that tab when browser focus changes.
- Switching tabs or windows does not stop a batch. Closing the case window does.
- A closed or redirected target produces an actionable error; an in-progress
  session never silently switches to another ACGME tab.

### Content Script

- `src/content/content.js`:
  - maps case values to ACGME control IDs
  - applies fill actions
  - optionally clicks the Submit button
  - responds to case-window messages

## Data Flow

1. User uploads Excel file in the case window
2. `excel.js` parses rows into case objects
3. `state.js` stores cases and status
4. User clicks Fill or Submit
5. `acgme.js` sends case payload to `content.js`
6. `content.js` fills ACGME form and returns result
7. Case window updates status and persists progress

## Runtime Interface

For strict parser-input and messaging contracts, see:

- `INTERFACE.md`

## Storage

- `chrome.storage.local`:
  - loaded cases
  - active case index
  - per-case status and recovery details (case identity, original tab, baseline record keys)
- `chrome.storage.sync`:
  - user settings

## Reliability Rules

- Fill result must be successful before enabling Submit.
- A new matching server record in Last 5 Cases must confirm submission before
  automatically marking the originating case as submitted. Users can also
  explicitly record a manual save after checking ACGME.
- STOP cancels work before the submit click. After a click, cancellation leaves
  the case in Needs review; rechecking never submits again.
- The content script verifies the creation form's POST action immediately before
  filling and clicking. Only explicit pre-click refusals allow an automatic retry;
  post-click errors still require save confirmation or manual review.
- Submission intent is persisted before clicking, so window closure cannot turn a
  possible save back into a pending case. Failure to persist prevents submission.
- Batch processing starts at the selected case and wraps once, skipping all
  non-pending cases. Page readiness includes waiting for browser navigation to
  finish, so the next case cannot fill the previous document during a save.
- Case-window edits persist on input and before navigation; delayed responses cannot
  change another case or a replacement session.
- Ambiguous or unmatched imported selections require review; partial matches
  in dropdowns retain a visible warning. Requested target selections that cannot
  be filled, or previous values that cannot be cleared, stop submission.
- Spreadsheet imports honor the workbook's 1900/1904 date system. Only the latest
  import can replace the current session, and clearing a session cancels pending imports.

## Vendored spreadsheet parser

`public/xlsx.min.js` is the unmodified SheetJS CE 0.20.3 full browser bundle from
[the official CDN](https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js).
It runs locally in the extension; no spreadsheet content is uploaded to SheetJS.
SHA-256: `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41`.
Real workbook import tests exercise this bundle, including standalone procedure
exports and both Excel date systems.
