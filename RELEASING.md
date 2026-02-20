# Releasing

This repository uses Bun and GitHub tags to publish releases.

## One-time setup

- Ensure you can push tags to `origin`.
- Ensure GitHub Actions are enabled for this repository.

## Release flow

1. Update the local branch and changelog.

```bash
git checkout main
git pull --ff-only
```

2. Bump version (`patch`, `minor`, or `major`).

```bash
bun run bump:patch
```

This updates:

- `package.json`
- `manifest.json`
- `src/popup/index.html` footer version
- `USER_GUIDE.md` version line

3. Run release checks and package build.

```bash
bun run release:prepare
```

4. Commit and push the version bump.

```bash
git add package.json manifest.json src/popup/index.html USER_GUIDE.md CHANGELOG.md bun.lock
git commit -m "release: vX.Y.Z"
git push origin main
```

5. Create and push release tag.

```bash
bun run release:tag
```

## What happens after a tag push

GitHub Action `.github/workflows/release.yml` will:

1. Validate tag version equals `package.json` and `manifest.json` version.
2. Run `bun run check`.
3. Build zip package.
4. Publish a GitHub Release with generated notes and zip asset.

## Notes

- Tag format must be `vX.Y.Z`.
- If a release tag already exists, delete/recreate the tag manually or bump to a new version.
