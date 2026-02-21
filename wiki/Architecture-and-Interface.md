# Architecture and Interface

## Runtime Surfaces

1. Popup app (`src/popup/*`)
2. Content script (`src/content/content.js`)

The popup handles import, state, and user actions. The content script writes to ADS form controls and submits when requested.

## Module Map

### Popup modules

- `src/popup/app.js`: bootstrap and event wiring
- `src/popup/excel.js`: spreadsheet parsing and normalization
- `src/popup/state.js`: in-memory session state
- `src/popup/storage.js`: storage read/write wrappers
- `src/popup/form.js`: popup form synchronization/validation
- `src/popup/navigation.js`: case navigation/counters
- `src/popup/settings.js`: settings load/save
- `src/popup/acgme.js`: messaging bridge to content script
- `src/popup/ui.js`: status and reusable UI helpers

### Content module

- `src/content/content.js`: field mapping, fill execution, submit action, response payloads

## Data Flow

1. Upload file in popup
2. Parse rows to normalized case objects
3. Navigate/review case in popup
4. Send `fillCase` message to content script
5. Apply form values on ADS page
6. Optionally submit case
7. Return result and update local status

## Input Contract

Full column definitions, accepted value sets, date formats, multi-value field syntax, and annotated examples are in the [Input Format Reference](Input-Format).

Summary of required columns:

- `Case ID` · `Case Date` · `Supervisor` · `Age` · `Original Procedure` · `ASA Physical Status` · `Anesthesia Type` · `Procedure Category`

Optional columns (semicolon-delimited):

- `Airway Management` · `Specialized Vascular Access` · `Specialized Monitoring Techniques`

## Message API

- `fillCase`
- `submitCase`
- `getAttendingOptions`

Request/response payloads and accepted enums are specified in `INTERFACE.md` and summarized in [Input Format Reference](Input-Format).
