# Contributing Guide

## Prerequisites

- Node.js `>=18`
- Bun
- Chrome browser for manual verification

## Local setup

```bash
bun install
bun run build
```

Load `dist/` as an unpacked extension in `chrome://extensions`.

## Development workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Run checks locally.
4. Open a pull request with clear testing notes.

Recommended checks:

```bash
bun run check
bun run build
```

## Coding standards

- Keep permission scope minimal.
- Do not add remote code execution or hidden telemetry.
- Keep parser-extension interface compatibility documented in `INTERFACE.md`.
- Update docs when behavior, settings, or data handling changes.
- Do not claim guaranteed policy compliance; use the disclaimer language in
  `ACGME_COMPLIANCE.md`.

## Pull request checklist

- [ ] Changes are scoped and explained
- [ ] `bun run check` passes
- [ ] `bun run build` passes
- [ ] Any UX/API changes are reflected in docs
- [ ] Compliance-related behavior/docs are updated when relevant
- [ ] `CHANGELOG.md` is updated when needed

## Reporting bugs

Open an issue with:

- Steps to reproduce
- Expected vs actual behavior
- Sample input shape (no patient-identifiable data)
- Browser version and extension version
