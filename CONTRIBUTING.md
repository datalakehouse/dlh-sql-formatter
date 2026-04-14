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
