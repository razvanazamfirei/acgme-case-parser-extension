# How It Works

## Overview

The extension has two parts: a **popup** (the panel that opens when you click the extension icon) and a **page script** that runs on the ACGME ADS Case Entry page.

The popup handles file import, case review, and navigation. The page script reads the form fields on the ADS page and fills them in when you trigger an action.

## Data Flow

1. You upload a spreadsheet in the popup.
2. The extension parses and normalizes each row into a case record.
3. You review cases one at a time in the popup.
4. When you click **Fill Form** or **Submit**, the popup sends the case data to the page script running on the ADS tab.
5. The page script writes values into the ADS form fields.
6. Optionally, the case is submitted; the result is returned and the case status is updated in the popup.

All data stays in your browser. Nothing is sent to any external server.

## Input Format

For the column names, accepted values, date formats, and multi-value field syntax, see the [Input Format Reference](Input-Format).

Required columns:

- `Case ID` · `Case Date` · `Supervisor` · `Age` · `Original Procedure` · `ASA Physical Status` · `Anesthesia Type` · `Procedure Category`

Optional columns (semicolon-delimited for multi-value fields):

- `Airway Management` · `Specialized Vascular Access` · `Specialized Monitoring Techniques`
