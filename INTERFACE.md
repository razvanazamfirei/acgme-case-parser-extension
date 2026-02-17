# Interface Contract

This document defines the application interface between:

- upstream case-parser exports (spreadsheet input),
- popup runtime model,
- content-script form-filling API.

## Contract Version

- Version: `1.0`
- Status: active

## Input Spreadsheet Contract

The extension reads the first sheet and maps columns by exact header name
(case-insensitive).

Required columns:

- `Case ID`
- `Case Date`
- `Supervisor`
- `Age`
- `Original Procedure`
- `ASA Physical Status`
- `Anesthesia Type`
- `Procedure Category`

Optional columns:

- `Airway Management`
- `Specialized Vascular Access`
- `Specialized Monitoring Techniques`

Behavior:

- Missing required columns: file load fails with an error.
- Missing optional columns: file loads; those values are treated as empty.
- Additional columns: ignored.

## Accepted Value Sets

`Procedure Category` (canonical values):

- `Cardiac with CPB`
- `Cardiac without CPB`
- `Procedures on major vessels (endovascular)`
- `Procedures on major vessels (open)`
- `Intracerebral (endovascular)`
- `Intracerebral Vascular (open)`
- `Intracerebral Nonvascular (open)`
- `Cesarean Delivery`
- `Vaginal Delivery`
- `Intrathoracic non-cardiac`
- `Other (procedure cat)`

`ASA Physical Status`:

- `1`, `2`, `3`, `4`, `5`, `6`, `1E`, `2E`, `3E`, `4E`, `5E`

`Anesthesia Type`:

- `GA`, `MAC`, `Spinal`, `Epidural`, `CSE`, `PNB Continuous`, `PNB Single`

Multi-value fields:

- `Airway Management`, `Specialized Vascular Access`, and
  `Specialized Monitoring Techniques` use `;`-delimited values.

## Popup Runtime Model

Each spreadsheet row is normalized to:

```json
{
  "caseId": "...",
  "date": "M/D/YYYY",
  "attending": "...",
  "ageCategory": "...",
  "comments": "...",
  "asa": "...",
  "anesthesia": "...",
  "airway": "...",
  "procedureCategory": "...",
  "vascularAccess": "...",
  "monitoring": "..."
}
```

## Popup <-> Content Script Message API

### `fillCase`

Request:

```json
{
  "action": "fillCase",
  "data": {
    "caseId": "...",
    "date": "...",
    "attending": "...",
    "ageCategory": "...",
    "asa": "...",
    "anesthesia": "...",
    "airway": "...",
    "procedureCategory": "...",
    "vascularAccess": "...",
    "monitoring": "...",
    "difficultAirway": "",
    "lifeThreateningPathology": "",
    "comments": "...",
    "institution": "CHOP",
    "defaultAttending": "",
    "cardiacAutoFill": true,
    "auto5EPathology": true,
    "showWarnings": true
  },
  "autoSubmit": false
}
```

Response success envelope:

```json
{
  "success": true,
  "result": {
    "success": true,
    "filled": ["field tokens..."],
    "warnings": ["..."],
    "errors": ["..."],
    "submitted": false
  }
}
```

Error envelope:

```json
{
  "success": false,
  "errors": ["..."]
}
```

### `submitCase`

Request:

```json
{ "action": "submitCase" }
```

Response:

```json
{ "success": true }
```

or

```json
{ "success": false, "errors": ["..."] }
```

### `getAttendingOptions`

Request:

```json
{ "action": "getAttendingOptions" }
```

Response:

```json
{ "success": true, "options": ["..."] }
```

## Parser Compatibility

This contract matches the case-parser standardized output headers currently
produced in `/Users/razvanazamfirei/Projects/random/case-parser/src/case_parser/domain.py`.

As long as those headers remain unchanged, the extension input interface remains
compatible.
