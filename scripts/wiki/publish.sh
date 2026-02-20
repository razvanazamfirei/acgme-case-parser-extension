#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

REPO_URL="$(git remote get-url origin)"
if [[ "$REPO_URL" =~ github.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
else
  echo "Could not parse GitHub owner/repo from origin: $REPO_URL" >&2
  exit 1
fi

WIKI_REMOTE="https://github.com/${OWNER}/${REPO}.wiki.git"

if ! git ls-remote "$WIKI_REMOTE" >/dev/null 2>&1; then
  echo "Wiki remote is not initialized yet: $WIKI_REMOTE" >&2
  echo "One-time step: open https://github.com/${OWNER}/${REPO}/wiki and create the first page (Home)." >&2
  echo "Then re-run scripts/wiki/publish.sh" >&2
  exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone "$WIKI_REMOTE" "$TMP_DIR/wiki" >/dev/null 2>&1

rm -f "$TMP_DIR/wiki"/*.md
cp "$ROOT_DIR/wiki"/*.md "$TMP_DIR/wiki/"

cd "$TMP_DIR/wiki"

if [[ -z "$(git status --porcelain)" ]]; then
  echo "Wiki already up to date."
  exit 0
fi

git add .
if ! git config user.email >/dev/null 2>&1; then
  git config user.email "wiki-sync@local"
fi
if ! git config user.name >/dev/null 2>&1; then
  git config user.name "wiki-sync"
fi
PREK_ALLOW_NO_CONFIG=1 git commit -m "docs(wiki): sync from repository wiki sources" >/dev/null 2>&1

git push origin master >/dev/null 2>&1
echo "Wiki published successfully to https://github.com/${OWNER}/${REPO}/wiki"
