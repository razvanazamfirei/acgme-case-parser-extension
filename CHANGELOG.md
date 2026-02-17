# Chrome Extension Changelog

## Unreleased

### Added

- `INTERFACE.md` with strict parser input schema and popup/content message API
- Required-vs-optional column validation in popup import flow
- `PRIVACY.md` committed in this standalone repository

### Changed

- Repository docs updated for standalone usage (no `chrome-extension/` prefix)
- Packaging script now uses `npm run` command chaining for manager-agnostic usage

## 1.1.0 - 2026-02-11

### Added

- Explicit `icons` block in manifest for Chrome Web Store packaging clarity
- `PRIVACY.md` for submission-ready privacy disclosure
- `package:zip` script for one-step distributable packaging

### Changed

- Manifest permissions reduced to least privilege:
  - removed unused `scripting`
  - removed broad `activeTab`
  - host scope narrowed to Case Entry URL path only
- Popup fill flow now enables Submit only after successful fill
- Submit status is now validated before marking cases as submitted
- Release workflow now builds from `chrome-extension/` directly
- Documentation rewritten to match actual Vite + CRX build and modular source layout

### Removed

- Unused `manifest.config.ts`
- Unused `src/popup/confirmation.js` and related stale state flag
