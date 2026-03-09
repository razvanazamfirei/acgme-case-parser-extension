# Interface Contract

This document defines the application interface between:

- upstream case-parser exports (spreadsheet input),
- popup runtime model,
- content-script form-filling API.

## Contract Version

- Version: `2.0`
- Status: active

## Input Spreadsheet Contract

The extension reads workbook metadata from `_meta` when present, otherwise from
`Info` when present. It then reads the `CaseLog` sheet when available,
falling back to the first non-metadata sheet, and maps columns by header name
(case-insensitive, whitespace-trimmed). If no non-metadata sheet exists, the
file load fails with an error.

### Format Detection

An optional metadata sheet (preferably `_meta`, with `Info` supported as a
fallback) controls parsing behaviour. Its first row is treated as a header and
is ignored. Subsequent rows contain key-value pairs in columns A and B:

| Key           | Values                  | Default   |
| ------------- | ----------------------- | --------- |
| `format_type` | `caselog`, `standalone` | `caselog` |
| `version`     | string                  | `1`       |

The `format_type` value is trimmed and case-normalized before use. If no
metadata sheet is present, `caselog` format is assumed (backwards compatible
with files that predate this feature).

### Caselog Format (`format_type: caselog`)

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

### Standalone Procedure Format (`format_type: standalone`)

Used for single-procedure records such as nerve blocks uploaded separately from
the main case log.

Required columns:

- `Case ID`
- `Case Date`
- `Supervisor`
- `Original Procedure`
- `ASA Physical Status`
- `Procedure Category`
- `Procedure Name`

Optional columns:

- `Age`
- `Primary Block`

Behavior:

- `Procedure Name` is looked up case-insensitively in the procedure map below to
  derive `anesthesia`, `airway`, and `vascularAccess`. Unrecognized names are
  collected and reported as a warning; their fields are left blank.
- If `Primary Block` is non-empty, it is appended to `Original Procedure` as
  `"<original> | Block: <block>"` (or `"Block: <block>"` when the original
  procedure is blank). The result is stored in `comments`.
- If `Age` is present, it is preserved as `ageCategory`; otherwise
  `ageCategory` is set to `""`.
- Missing required columns: file load fails with an error.
- Missing optional columns: file loads; those values are treated as empty.
- Additional columns: ignored.

`Procedure Name` canonical values and their mappings:

| `Procedure Name`         | `anesthesia` | `airway`   | `vascularAccess`    |
| ------------------------ | ------------ | ---------- | ------------------- |
| `Intubation complex`     | `GA`         | `Oral ETT` |                     |
| `Intubation routine`     | `GA`         | `Oral ETT` |                     |
| `LMA`                    | `GA`         | `LMA`      |                     |
| `Arterial line`          |              |            | `Arterial Catheter` |
| `Epidural Blood Patch`   | `Epidural`   |            |                     |
| `Epidural`               | `Epidural`   |            |                     |
| `CSE`                    | `CSE`        |            |                     |
| `Spinal`                 | `Spinal`     |            |                     |
| `Peripheral nerve block` | `PNB Single` |            |                     |

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

Each spreadsheet row is normalized to a case object regardless of input format:

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
  "difficultAirway": "...",
  "procedureCategory": "...",
  "vascularAccess": "...",
  "monitoring": "..."
}
```

Format-specific notes:

- **Caselog**: all fields populated from columns; `difficultAirway` is set to
  `"Unanticipated"` when `"Difficult Airway"` appears in `Airway Management`
  (the token is stripped from `airway`).
- **Standalone**: `ageCategory` is populated from `Age` when present and `""`
  otherwise; `monitoring` is always `""`; `anesthesia`, `airway`, and
  `vascularAccess` are derived from `Procedure Name`; `comments` combines
  `Original Procedure` and `Primary Block`; `difficultAirway` is always `""`.

Dates are formatted as `M/D/YYYY`. Excel serial numbers are converted using UTC
to avoid timezone-dependent off-by-one errors.

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

The caselog format contract matches the case-parser standardized output headers
produced by the companion `case-parser` tool (see its `domain.py` module).

The standalone format is produced by the same tool when exporting individual
procedures (e.g., nerve blocks) as a separate sheet with metadata identifying
`format_type: standalone`.

As long as those headers remain unchanged, the extension input interface remains
compatible.
