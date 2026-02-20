# Releases and Versioning

This project uses SemVer and Bun-based release automation.

## Version Sources of Truth

- `package.json`
- `manifest.json`

Both must match release tag `vX.Y.Z`.

## Standard Release Steps

1. Update local branch:

```bash
git checkout main
git pull --ff-only
```

2. Bump version:

```bash
bun run bump:patch
```

3. Run checks and package:

```bash
bun run release:prepare
```

4. Commit and push bump:

```bash
git add package.json manifest.json src/popup/index.html USER_GUIDE.md CHANGELOG.md bun.lock
git commit -m "release: vX.Y.Z"
git push origin main
```

5. Tag and push release:

```bash
bun run release:tag
```

## Automated GitHub Release

Workflow: `.github/workflows/release.yml`

On tag push (`v*.*.*`), GitHub Actions:

1. Validates tag/package/manifest version alignment
2. Runs `bun run check`
3. Builds zip package
4. Publishes GitHub Release with generated notes and artifact

## Bump Utility

Script: `scripts/release/bump.mjs`

It updates:

- `package.json`
- `manifest.json`
- `src/popup/index.html` footer version
- `USER_GUIDE.md` version line
