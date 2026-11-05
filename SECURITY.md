# Security Policy

## Supported versions

Security updates are provided for the latest release line.

| Version | Supported |
| ------- | --------- |
| 1.5.x   | Yes       |
| <1.5.0  | No        |

## Dependency review (2026-11-04)

The bundled SheetJS parser was updated from 0.18.5 to the official 0.20.3 release,
which includes the fix for
[CVE-2023-30533](https://cdn.sheetjs.com/advisories/CVE-2023-30533).

`bun audit` still reports
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
for Zod 3.25.76, pulled in by the Codecov build-analysis plugin. Codecov's current
2.0.1 release requires Zod 3; the advisory lists Zod 4.6.6 as the fixed version.
This dependency is used during builds and is absent from the packaged extension.
The advisory remains open pending a compatible upstream update; do not force a
Zod major-version override without validating Codecov's build-analysis behavior.

## Reporting a vulnerability

Please do not open public GitHub issues for suspected security vulnerabilities.

Use one of these channels:

1. GitHub Security Advisories (preferred) for this repository
2. Directly contact the repository owner if private reporting is unavailable

Please include:

- Description of the issue
- Impact assessment
- Reproduction steps or proof of concept
- Suggested mitigation (if available)

You will receive acknowledgment as soon as possible, and we will coordinate
validation, remediation, and disclosure timing.
