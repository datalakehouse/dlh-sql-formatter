# Development

## Setup

Run `yarn` after checkout to install all dependencies.

## Tests

Tests can be run with `yarn test`.

Please add new tests for any new features and bug fixes.
Language-specific tests should be included in their respective `sqldialect.test.ts` files.
Tests that apply to all languages should be in `behavesLikeSqlFormatter.ts`.

## CI

Pull requests are automatically tested via GitHub Actions. The CI pipeline runs:

- Tests across Node.js 16, 18, and 20
- TypeScript type checking
- ESLint linting
- Prettier formatting checks
- Full build (CJS, ESM, and webpack)

## Upstream Sync

This project is a fork of [sql-formatter-org/sql-formatter](https://github.com/sql-formatter-org/sql-formatter). To sync with upstream:

```bash
# Add upstream remote (one-time)
git remote add upstream https://github.com/sql-formatter-org/sql-formatter.git

# Fetch upstream changes
git fetch upstream master

# View new upstream commits
git log HEAD..upstream/master --oneline

# Create a branch for the sync
git checkout -b sync-upstream

# Cherry-pick or merge relevant changes
git merge upstream/master
# Or selectively: git cherry-pick <commit-hash>

# Resolve conflicts, test, and create PR
yarn test
```

A GitHub Actions workflow runs weekly to check for new upstream commits and opens an issue if updates are available.

## Publish Flow

For those who have admin access on the repo, the new release publish flow is as such:

1. Update the version in `package.json`
2. Update `CHANGELOG.md` with the new version's changes
3. `npm run release` (bumps version, git tag, git release, npm release) (does not work with `yarn`)
4. `git subtree push --prefix static origin gh-pages` (pushes demo page to GH pages)

## Releasing (automated)

As of v1.3.0 releases are published to npm automatically by the `Release` workflow (`.github/workflows/release.yaml`) whenever a `v*.*.*` tag is pushed. Tag + package version must match, or the workflow fails.

**One-time setup** (maintainer):

- Create a granular npm automation token scoped to `@dlh.io/dlh-sql-formatter` (npmjs.com → Access Tokens → Granular).
- Add it to GitHub → Settings → Secrets and variables → Actions as `NPM_TOKEN`.

**Cutting a release**:

Option A — from the Actions UI (recommended):

1. Actions → `Version Bump` → Run workflow.
2. Pick `patch` | `minor` | `major`. Optionally enter a pre-release id (e.g. `rc`) for a pre-release.
3. The workflow bumps `package.json`, creates the `v<version>` tag, and pushes it.
4. The tag push triggers `Release`, which runs `yarn check && yarn build`, then `npm publish --provenance` and creates a GitHub Release with auto-generated notes.

Option B — from your shell:

```bash
npm version minor -m "chore: release v%s"
git push --follow-tags
```

**Pre-releases**: tags that include a pre-release identifier (e.g. `v1.4.0-rc.1`) publish under the `rc` npm dist-tag instead of `latest`, so `npm install @dlh.io/dlh-sql-formatter` still resolves to the stable release.

**Dry runs**: Actions → `Release` → Run workflow → check `dry_run` to exercise the pipeline through `npm pack --dry-run` without publishing.

**Provenance**: published versions carry an SLSA provenance attestation visible on the package page at npmjs.com.
