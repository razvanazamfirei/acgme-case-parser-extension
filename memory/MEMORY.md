# case-parser-extension Memory

## ACGME Mock Website — Form Submission Internals

Source: `mock-website/` (minified JS in `core-caselogs`, `core-internal`)

### Submit button

- ID: `submitButton` (not `btnSave`)
- Type: `type="submit"` inside a `<form action=".../insert" method="post">`

### Submit flow (jQuery-based, traditional POST)

Two submit handlers are registered on the form:

1. **caseEntry040 handler** — for anesthesia-style cases with `cbprocedureid` checkboxes:
   - Always calls `n.preventDefault()`
   - Runs `$("form").valid()` (jQuery unobtrusive validation)
   - Checks date field value != `"__/__/____"` (inputmask placeholder)
   - Calls `SelectAll040Cpts()`: collects checked `.cbprocedureid` checkboxes + radio values into hidden `SelectedCodes` input
   - If 0 selections: appends `.alert-danger` to `#clienterrors` div, returns
   - If all pass: `$("form").off().submit()` → removes handlers, fires native POST → **page navigates**
2. **onSubmitCaseEntryForm** — for CPT-based cases (not anesthesia): uses `BuildSelectedCodes()` from `.selectedCodesBody li`, then `onSubmitCaseEntryFormConfirmed()` → same `$("form").off().submit()`

### On success: page navigates away

- Content script is destroyed mid-wait
- Popup gets `chrome.runtime.lastError: "The message channel closed before a response was received"`
- This is the correct signal for a successful submission

### Error locations (when submission is blocked)

- `.field-validation-error` — jQuery unobtrusive validation per-field errors (required fields: Supervisor, Site, Patient Age, Date)
- `.validation-summary-errors` — jQuery validation summary
- `.alert-danger` inside `#clienterrors` — created by `appendAlert()` for "At least 1 selection is required" and similar

### Validation libraries

- `jquery.validate.min.js` + `jquery.validate.unobtrusive.min.js`
- Bootstrap 5 for alerts/UI
- Select2 for Attendings dropdown (`select2-hidden-accessible` class)
- jQuery UI datepicker for date field with inputmask (`99/99/9999`)

### SelectedCodes hidden input

`SelectAll040Cpts` builds a comma-separated string of checkbox IDs (`.cbprocedureid:checked`) and radio values (excluding `CaseTypes_` IDs) and stores it in `input[id=SelectedCodes]`.

## Bug Fixes Applied (v1.3.6)

### 1. Beast mode race condition (`acgme.js`, `app.js`)

`_handleFillResult` was scheduling `setTimeout(() => Navigation.goToNextPending(), 1000)` unconditionally. In beast mode this timer fired during the next case's 1500ms page-load wait, overwrote the form data with a different case's values, and caused the wrong case to be submitted. Fix: moved the setTimeout to the `fillSubmitBtn` handler only.

### 2. Successful submit detected as failure (`acgme.js`)

When ACGME navigates on success, the content script is destroyed and the popup gets `lastError: "The message channel closed..."`. This was treated as failure. Fix: detect that specific error message and resolve as success.

### 3. No validation feedback on blocked submit (`content.js`)

`submitCase()` returned immediately after clicking the button with no verification. Fix: wait 500ms for synchronous jQuery validation to run, then scan for `.field-validation-error`, `.validation-summary-errors`, `.alert-danger` elements. If page navigated (success), content script is destroyed before `sendResponse` fires — handled by fix #2.
