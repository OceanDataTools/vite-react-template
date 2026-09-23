# Releasing

How to cut a release of this template's `main` branch. This is a manual, checklist-driven procedure — no release tooling/automation is involved.

## When to release

Once a batch of base-improvement PRs has merged into `dev` and is ready to ship to `main`.

## Choosing the version number

This repo follows [SemVer](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- **MAJOR** — breaking changes to the template's public surface: required env vars, exported hooks/components, build tooling requirements
- **MINOR** — new features or additions that stay backwards-compatible
- **PATCH** — bug fixes, dependency/security updates, docs-only changes

## Steps

1. Open an issue for the version bump and cut an `issue_NNN` branch from `dev`. On that branch, bump the version (this updates both `package.json` and `package-lock.json` without creating a commit or tag):

   ```bash
   npm version X.Y.Z --no-git-tag-version
   ```

   Commit, PR into `dev`, and merge via the GitHub UI. (The bump can't go in the release PR itself — that PR's source branch is `dev`, and nothing is pushed directly to `dev`.)
2. Confirm CI is green on `dev`.
3. Open a PR from `dev` into `main` via the GitHub UI, titled `Release vX.Y.Z`.
4. Get the PR reviewed and merge it into `main` via the GitHub UI.
5. On the resulting `main` commit, create and push an annotated tag:

   ```bash
   git checkout main
   git pull
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

6. Create a GitHub Release from that tag, reviewing/editing the generated notes for clarity:

   ```bash
   gh release create vX.Y.Z --generate-notes
   ```

7. Once the release is published, open a tracking issue (or one per project) to rebase each `<project>` branch (e.g. `openrvdas`) and its `<project>_dev` branch (e.g. `openrvdas_dev`) against the newly released `main`, per the branching workflow in `CLAUDE.md`.

## Notes

- The tags `v0.0.1`/`v0.0.2` predate this procedure and the current `1.0.0` version field — they're left as-is. The first tag created under this procedure is the next real release, whatever version that turns out to be.
- This procedure covers `main` only. `<project>` branches (e.g. `openrvdas`) aren't independently tagged/released under this scheme — they track `main` via the rebase step above instead. Per-project releases, if ever needed, would be a separate addition to this doc.
