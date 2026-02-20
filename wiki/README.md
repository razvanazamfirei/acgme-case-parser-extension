# Wiki Source

This folder is the source-of-truth content for the GitHub Wiki.

## Publish Workflow

1. Create the first wiki page once in GitHub UI (required by GitHub to initialize wiki backend).
2. Run:

```bash
scripts/wiki/publish.sh
```

The script syncs `wiki/*.md` to the GitHub wiki git repository.
