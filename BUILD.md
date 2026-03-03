# Build And Release

## Build System

The extension uses Vite with `@crxjs/vite-plugin` and Manifest V3.

Source of truth:

- `manifest.json`
- `src/`

Build output:

- `dist/`

## Commands

```bash
bun install

bun run dev
bun run build
bun run build:dev
bun run clean
bun run verify:dist
```

## Local Packaging

```bash
bun run package:zip
```

`package:zip` runs a clean production build, verifies `dist/` has no test
fixtures/markers, then creates the zip from runtime files only.

Output zip:

- `acgme-case-submitter-v<version>.zip`

## Chrome Web Store Checklist

1. Build from a clean tree: `bun run clean && bun run build`
2. Verify `dist/manifest.json` has the expected version and permissions
3. Zip the `dist/` contents (not the project root)
4. Upload zip in Chrome Web Store Developer Dashboard
5. Keep release notes aligned with `CHANGELOG.md`
