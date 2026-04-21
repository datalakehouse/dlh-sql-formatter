# Changelog

All notable DLH-specific changes to this project are documented in this file.

This project is a fork of [sql-formatter](https://github.com/sql-formatter-org/sql-formatter).
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-04-20

### Added — DLH default rewrite prompt + override API

- **DLH-opinionated default rewrite prompt** baked into the library.
  Encodes DLH's optimization philosophy: predicate pushdown, avoid `SELECT *`,
  prefer CTEs over correlated subqueries, explicit `JOIN` syntax,
  partition/cluster-key awareness for Snowflake / BigQuery / Databricks /
  Redshift, semantics-preserving rewrites only. Replaces the previous generic
  "expert SQL optimizer" prompt. Exported as
  `DEFAULT_REWRITE_SYSTEM_PROMPT` + `buildDefaultRewriteSystemPrompt(dialect?)`
  from `@dlh.io/dlh-sql-formatter/ai` so consumers (e.g. the VS Code
  extension's Settings tab) can display it verbatim.
- **`AIConfig.rewritePrompt`** — new optional field to override the default
  rewrite prompt on a per-call basis:
  ```ts
  rewritePrompt?: { mode: 'default' | 'extend' | 'replace'; text?: string };
  ```
  - `mode: 'default'` (or omitted): use the built-in DLH prompt
  - `mode: 'extend'`: DLH default + `"Additional guidance:\n" + text`
  - `mode: 'replace'`: use `text` verbatim (caller must preserve the JSON
    response contract)

  Empty / whitespace-only `text` falls back to the default regardless of mode.
- All four built-in providers (`AnthropicProvider`, `OpenAIProvider`,
  `GeminiProvider`, custom registered factories) forward the override
  through the constructor's new 5th argument.
- New test suite `test/ai/promptOverride.test.ts` covering all three modes +
  edge cases.

### Added — Release automation

- **`.github/workflows/release.yaml`** — tag-triggered (`v*.*.*`) and
  `workflow_dispatch` (with optional `tag` input) npm publish workflow.
  Runs `yarn check && yarn build`, verifies the tag matches
  `package.json` version, publishes with **npm provenance** (SLSA
  attestation), and auto-generates a GitHub Release. Pre-release tags
  (e.g. `v1.4.0-rc.1`) publish under the `rc` dist-tag instead of `latest`.
- **`.github/workflows/version-bump.yaml`** — manual `workflow_dispatch`
  that runs `npm version {patch|minor|major}`, optionally with a pre-release
  id, pushes the resulting tag, and explicitly dispatches Release via
  `gh workflow run` (avoiding GitHub's GITHUB_TOKEN tag-trigger restriction
  without requiring a PAT).
- Releasing section added to [CONTRIBUTING.md](CONTRIBUTING.md).

### Changed

- Minimum Node version raised to **>=18** (enforced via `engines`).
  Node 16 is EOL and several upgraded dev-dependencies require 18+.
- CI matrix: `[16.x, 18.x, 20.x]` → `[18.x, 20.x, 22.x]`.

## [1.2.0] - 2025-XX-XX

### Added — New Dialect Support

- **Databricks SQL** dialect (`language: 'databricks'`)
- **ClickHouse** dialect (`language: 'clickhouse'`)

### Added — Multi-Provider AI Features

- **4 built-in AI providers**: Anthropic Claude, OpenAI GPT, Google Gemini, DeepSeek
- **Custom provider registration** via `registerProvider()` for Ollama, Azure, vLLM, etc.
- **Auto-detection**: CLI auto-detects provider from whichever API key env var is set
- **`--ai-provider`** CLI flag to explicitly choose provider
- **`--ai-model`** CLI flag to override the default model per provider
- **`--ai-base-url`** CLI flag for proxies, self-hosted, or OpenAI-compatible endpoints
- **`--suggest`** CLI flag for rule-based analysis (no API key needed)
- **`--rewrite`** CLI flag for AI-powered SQL rewrite
- **`BaseProvider`** abstract class — shared prompt/parse logic, providers only implement `callAPI()`
- **Provider registry** — `registerProvider()`, `listProviders()`, `createProvider()`, `autoDetectProvider()`
- **15 built-in analysis rules** across common, Snowflake, BigQuery, Redshift, PostgreSQL
- **Environment variable auto-resolution** per provider:
  - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`/`GOOGLE_API_KEY`, `DEEPSEEK_API_KEY`

### Default models per provider

| Provider  | Default Model            |
| --------- | ------------------------ |
| anthropic | claude-sonnet-4-20250514 |
| openai    | gpt-4o                   |
| gemini    | gemini-2.0-flash         |

## [1.1.4] - 2025-XX-XX

### Changed

- Updated README with DLH branding and differentiation from upstream
- Fixed demo page link to point to DLH resources
- Added JSON Schema `$schema` support documentation for editor autocomplete
- Improved error messages with line/column information and dialect suggestions
- Added CHANGELOG.md for tracking DLH-specific changes

### Added

- CHANGELOG.md for tracking DLH-specific divergences from upstream
- GitHub Actions CI workflow for automated testing on pull requests
- GitHub Actions workflow for automated upstream sync checks
- VS Code extension reference (DLH SQL Optimizer)
- `commaPosition: 'leadingWithSpace'` enhanced comment handling

## [1.1.3] - Initial DLH Fork

### Changed

- Rebranded package as `@dlh.io/dlh-sql-formatter`
- Updated package.json with DLH metadata
- CLI binary renamed to `dlh-sql-formatter`

### Inherited from upstream

- All features from sql-formatter up to the fork point
- Support for 19 SQL dialects including DuckDB
- Full formatting configuration options
- Prepared statement parameter handling
