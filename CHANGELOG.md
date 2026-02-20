# Chrome Extension Changelog

## Unreleased

### Added

- `ACGME_COMPLIANCE.md` with non-affiliation and policy-aware usage disclaimers
- `RELEASING.md` with a Bun-first release process
- `scripts/release/bump.mjs` for `major`/`minor`/`patch` version bumps
- `.github/workflows/release.yml` for tag-triggered GitHub Releases

### Changed

- Repository docs now use Bun commands consistently (`bun install`, `bun run ...`)
- Package metadata/license changed to Apache 2.0 (`Apache-2.0`)
- `package:zip` and release scripts now use Bun-based version/command flow

### Removed

- `CHROME_STORE_PUBLISHING_AND_USAGE_GUIDE.md`

## 1.1.0 - 2026-02-11

### Added

- Explicit `icons` block in manifest for Chrome Web Store packaging clarity
- `PRIVACY.md` for submission-ready privacy disclosure
- `package:zip` script for one-step distributable packaging

### Changed

- Manifest permissions are reduced to the least privilege:
  - removed unused `scripting`
  - removed broad `activeTab`
  - host scope narrowed to the Case Entry URL path only
- Popup fill flow now enables Submit only after a successful fill.
- Submit status is now validated before marking cases as submitted
- Release workflow now builds from `chrome-extension/` directly
- Documentation rewritten to match the actual Vite + CRX build and modular source layout.

### Removed

- Unused `manifest.config.ts`
- Unused `src/popup/confirmation.js` and related stale state flag
