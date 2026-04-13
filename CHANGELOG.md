# Changelog

All notable DLH-specific changes to this project are documented in this file.

This project is a fork of [sql-formatter](https://github.com/sql-formatter-org/sql-formatter).
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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