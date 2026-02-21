# Input Format Reference

This page documents the exact spreadsheet format accepted by the extension.

Last reviewed: `2026-02-21`

## File Types

- `.xlsx` (Excel 2007+, recommended)
- `.xls` (Excel 97-2003)
- `.csv` (comma-separated values)

Only the **first sheet** of a workbook is read. Additional sheets are ignored.

## Header Row

The first row must contain column headers. Headers are matched **case-insensitively** and leading/trailing whitespace is stripped. Additional columns beyond the expected set are silently ignored.

## Required Columns

All eight columns below must be present or file load fails with an error.

| Column Header | Description | Accepted Values |
|---|---|---|
| `Case ID` | Unique case identifier | Any non-empty string. Rows without a Case ID are skipped. |
| `Case Date` | Date of procedure | `M/D/YYYY`, ISO 8601 (`YYYY-MM-DD`), or Excel date serial number. Stored internally as `M/D/YYYY`. |
| `Supervisor` | Attending physician name | Free text, fuzzy-matched against the ADS attending dropdown. Recommended format: `LASTNAME, FIRSTNAME`. |
| `Age` | ACGME patient age category | `a` (< 3 months) · `b` (3 months – 3 years) · `c` (3 – 12 years) · `d` (12 – 65 years) · `e` (≥ 65 years) |
| `Original Procedure` | Procedure description | Free text. Stored in the ADS Comments field. |
| `ASA Physical Status` | ASA classification | `1` `2` `3` `4` `5` `6` `1E` `2E` `3E` `4E` `5E` |
| `Anesthesia Type` | Primary anesthetic technique | `GA` · `MAC` · `Spinal` · `Epidural` · `CSE` · `PNB Single` · `PNB Continuous` |
| `Procedure Category` | ACGME procedure classification | See [Procedure Categories](#procedure-categories) below. |

## Optional Columns

Missing optional columns are treated as empty — file loads without error. Values in these columns are semicolon-delimited (`value1; value2`).

| Column Header | Accepted Values |
|---|---|
| `Airway Management` | `ETT` · `Nasal ETT` · `Supraglottic Airway` · `Mask` · `DLT` · `Direct Laryngoscope` · `Video Laryngoscope` · `Flexible Bronchoscopic` + special token (see below) |
| `Specialized Vascular Access` | `Arterial Catheter` · `Central Venous Catheter` · `PA Catheter` · `Ultrasound Guided` |
| `Specialized Monitoring Techniques` | `TEE` · `Neuromonitoring` · `CSF Drain` |

### Special Token: `Difficult Airway`

When `Difficult Airway` appears as a semicolon-delimited token in the `Airway Management` column:

1. The token is extracted and removed from the airway device list.
2. The **Unanticipated** difficult airway classification is set automatically.

Example: `ETT; Video Laryngoscope; Difficult Airway` →
Airway devices: `ETT`, `Video Laryngoscope` · Difficult airway: `Unanticipated`

To indicate **Anticipated** difficult airway, set it manually in the popup before submitting.

## Procedure Categories

Exact canonical values (case-insensitive match):

| Value | Notes |
|---|---|
| `Cardiac with CPB` | Cardiac surgery requiring cardiopulmonary bypass |
| `Cardiac without CPB` | Off-pump cardiac or other cardiac without bypass |
| `Procedures on major vessels (open)` | Open vascular surgery |
| `Procedures on major vessels (endovascular)` | Endovascular/EVAR/TAVR |
| `Intracerebral Vascular (open)` | Open intracranial vascular |
| `Intracerebral Nonvascular (open)` | Open intracranial nonvascular |
| `Intracerebral (endovascular)` | Neuro-interventional |
| `Cesarean Delivery` | C-section |
| `Vaginal Delivery` | Vaginal obstetric delivery |
| `Intrathoracic non-cardiac` | Thoracic, non-cardiac |
| `Other (procedure cat)` | All other procedures |

Legacy alias: `Procedures Major Vessels` is accepted as an alias for `Procedures on major vessels (open)`.

## Date Formats

The parser handles three input types:

1. **Formatted string** `M/D/YYYY` or `MM/DD/YYYY` — passed through as-is.
2. **Excel serial number** (numeric) — converted using Excel epoch (1900-01-01 = day 1).
3. **Any parseable date string** — parsed by JavaScript `Date` constructor.

Output is always `M/D/YYYY`.

## Attending Name Matching

The Supervisor value is matched against the ADS attending dropdown in three passes:

1. **Exact** — case-insensitive normalized comparison.
2. **Structural** — last-name + first-name + optional middle name/initial parsing.
3. **Fuzzy** — `fuzzysort` library with an 85% threshold and 10% minimum score gap between top matches.

If no match is found, the case-level attending field is left empty. If a Default Attending is configured in Settings, it is used as a fallback.

## Multi-Value Field Format

Fields that accept multiple values use **semicolon** delimiters. Whitespace around delimiters is stripped.

```
ETT; Video Laryngoscope; Difficult Airway
Arterial Catheter; Central Venous Catheter; Ultrasound Guided
TEE; Neuromonitoring
```

## Minimal Valid Example

```
Case ID,Case Date,Supervisor,Age,Original Procedure,ASA Physical Status,Anesthesia Type,Procedure Category
12345,1/15/2026,SMITH JOHN,d,Appendectomy,2,GA,Other (procedure cat)
12346,1/16/2026,DOE JANE,e,CABG,3,GA,Cardiac with CPB
```

## Full Example with Optional Columns

```
Case ID,Case Date,Supervisor,Age,Original Procedure,ASA Physical Status,Anesthesia Type,Procedure Category,Airway Management,Specialized Vascular Access,Specialized Monitoring Techniques
12345,1/15/2026,SMITH JOHN,d,Appendectomy,2,GA,Other (procedure cat),ETT; Direct Laryngoscope,,
12346,1/16/2026,DOE JANE,e,CABG,3,GA,Cardiac with CPB,ETT; Difficult Airway,Arterial Catheter; Central Venous Catheter; PA Catheter; Ultrasound Guided,TEE
12347,1/17/2026,JONES BOB,a,VP Shunt,1,GA,Intracerebral Nonvascular (open),ETT; Video Laryngoscope,,Neuromonitoring
```

## Parser Compatibility

This format matches the standardized output of the companion case-parser tool. As long as the upstream export headers remain unchanged, no extension updates are needed.

See [Architecture and Interface](Architecture-and-Interface) for the full runtime contract and message API.
