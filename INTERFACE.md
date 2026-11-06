# Interface Contract

This document defines the application interface between:

- upstream case-parser exports (spreadsheet input),
- case window runtime model,
- content-script form-filling API.

## Contract Version

- Version: `2.0`
- Status: active

## Input Spreadsheet Contract

The extension reads workbook metadata from `_meta` when present, otherwise from
`Info` when present. Supported metadata sheet names are matched after trimming
and case-normalizing the sheet name. It then reads the `CaseLog` sheet when
available, falling back to the first non-metadata sheet, and maps columns by
header name (case-insensitive, whitespace-trimmed). If no non-metadata sheet
exists, the file load fails with an error.

### Format Detection

An optional metadata sheet (preferably `_meta`, with `Info` supported as a
fallback) controls parsing behaviour. Its first row is treated as a header and
is ignored. Subsequent rows contain key-value pairs in columns A and B:

| Key           | Values                  | Default               |
| ------------- | ----------------------- | --------------------- |
| `format_type` | `caselog`, `standalone` | Detected from headers |
| `version`     | string                  | `1`                   |

Metadata keys are trimmed and case-normalized before lookup, and non-alphanumeric
separators are normalized to underscores. This means the parser treats
`format_type`, `format type`, and `Format Type` as the same key
(`format_type`), and likewise accepts `version` and `Version` for `version`.

The `format_type` value is trimmed and case-normalized before use, so values
like `Caselog` and `Standalone` are accepted. If `format_type` is missing or
blank (including CSV files and workbooks without metadata), headers determine
the format: `Procedure Name` without `Anesthesia Type` selects `standalone`;
otherwise the parser uses `caselog`. Explicit format metadata takes precedence.
The `version` defaults to `1`.

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

Used for OB, nerve block, and other procedure records uploaded separately from
the main case log. These files use `Procedure Name` instead of `Anesthesia Type`.

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

| `Procedure Name`         | `anesthesia` | `airway`   | `vascularAccess`            |
| ------------------------ | ------------ | ---------- | --------------------------- |
| `Intubation complex`     | `GA`         | `Oral ETT` |                             |
| `Intubation routine`     | `GA`         | `Oral ETT` |                             |
| `LMA`                    | `GA`         | `LMA`      |                             |
| `Arterial line`          |              |            | `Arterial Catheter`         |
| `PA catheter`            |              |            | `Pulmonary Artery Catheter` |
| `Epidural Blood Patch`   | `Epidural`   |            |                             |
| `Epidural`               | `Epidural`   |            |                             |
| `CSE`                    | `CSE`        |            |                             |
| `Spinal`                 | `Spinal`     |            |                             |
| `Peripheral nerve block` | `PNB Single` |            |                             |

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

## Case window Runtime Model

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

## Case window <-> Content Script Message API

### `getPageState`

Request: `{ "action": "getPageState" }`

Response: `{ "success": true, "ready": true }`

Read-only check for enabled case-ID, date, attending, and submit controls. The
case window polls while a page is loading, before sending a single fill request.

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
{ "action": "submitCase", "data": { "caseId": "...", "date": "M/D/YYYY" } }
```

Response for a click whose save is not yet confirmed:

```json
{
  "success": false,
  "attempted": true,
  "uncertain": true,
  "errors": []
}
```

or

```json
{ "success": false, "attempted": false, "errors": ["..."] }
```

`attempted: false` is returned only when submission was refused before clicking.
Errors observed after a click retain uncertainty, since they may be stale.
Both filling and submitting require a `CaseEntry/New` or `CaseEntry/Insert` page
whose form posts to the same-origin `CaseEntry/Insert` endpoint; an existing-case
editor is left untouched.

The case window reads `getRecentCases` before submitting and polls it afterward. A
case is automatically marked submitted only when a new record link appears with the matching
case ID and date. Navigation, a closed message channel, and the absence of
validation errors do not confirm a save. An unconfirmed attempt stops bulk
processing and is persisted as `review` (displayed as Needs review). A recovery
record in `acgme_caseAttempts` holds the case ID, date, original tab ID, and
baseline record keys. This record is saved before sending `submitCase`.
Rechecking reads recent cases without clicking Submit; users may also explicitly
mark the case saved or return it to pending after checking ACGME. Confirmed saves
clear their recovery record. Fill-only records use `kind: "manual"` and keep the
case pending until the user records the manual save. Their instructions identify
the case to check rather than asserting that it still occupies the ACGME form.
A failed refill clears the earlier manual-fill action for that case.

### `getRecentCases`

Request: `{ "action": "getRecentCases" }`

Response: `{ "success": true, "cases": [{ "caseId": "...", "date": "...", "key": "..." }] }`

The content script reads ACGME's Last 5 Cases endpoint. `key` identifies the
server record using its case-log links, excluding display timestamps. Missing
verification controls, record links, authentication, or an unexpected response
produce `{ "success": false, "errors": ["..."] }`.

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
