<a href='https://github.com/datalakehouse/dlh-sql-formatter'>

# DLH SQL Formatter [![NPM version](https://img.shields.io/npm/v/@dlh.io/dlh-sql-formatter.svg)](https://npmjs.com/package/@dlh.io/dlh-sql-formatter)

**DLH SQL Formatter** is a JavaScript library for pretty-printing SQL queries, maintained by [DLH.io](https://dlh.io). It is a fork of [sql-formatter](https://github.com/sql-formatter-org/sql-formatter) with DLH-specific enhancements.

> **Looking for the VS Code extension?** Install [DLH SQL Optimizer](https://marketplace.visualstudio.com/items?itemName=DLH.dlh-sql-optimizer) for formatting directly in your editor.

## What's Different from Upstream?

DLH SQL Formatter builds on the excellent sql-formatter library with the following enhancements:

- **DLH-branded packaging** — published as `@dlh.io/dlh-sql-formatter` on npm for use across DLH products
- **DuckDB support** — first-class support for DuckDB dialect
- **Enhanced comma positioning** — improved `leadingWithSpace` comma handling with full comment support
- **VS Code integration** — paired with the [DLH SQL Optimizer](https://marketplace.visualstudio.com/items?itemName=DLH.dlh-sql-optimizer) extension
- **Ongoing upstream sync** — bug fixes and improvements from upstream are regularly merged

## Supported SQL Dialects

GCP BigQuery, IBM DB2, DuckDB, Apache Hive, MariaDB, MySQL, TiDB, Couchbase N1QL, Oracle PL/SQL, PostgreSQL, Amazon Redshift, SingleStoreDB, Snowflake, Spark, SQL Server Transact-SQL, Trino (and Presto).

See [language option docs](docs/language.md) for more details.

### Limitations

- Stored procedures are not supported.
- Delimiter type cannot be changed from `;`.

## Install

```sh
npm install @dlh.io/dlh-sql-formatter
```

Or with yarn:

```sh
yarn add @dlh.io/dlh-sql-formatter
```

## Quick Start

### As a Library

```js
import { format } from '@dlh.io/dlh-sql-formatter';

console.log(format('SELECT * FROM tbl', { language: 'mysql' }));
```

Output:

```sql
SELECT
  *
FROM
  tbl
```

With configuration options:

```js
format('SELECT * FROM tbl', {
  language: 'spark',
  tabWidth: 2,
  keywordCase: 'upper',
  linesBetweenQueries: 2,
});
```

### Disabling the Formatter

Wrap sections with disable/enable comments to skip formatting:

```sql
/* sql-formatter-disable */
SELECT * FROM tbl1;
/* sql-formatter-enable */
SELECT * FROM tbl2;
```

Output:

```sql
/* sql-formatter-disable */
SELECT * FROM tbl1;
/* sql-formatter-enable */
SELECT
  *
FROM
  tbl2;
```

### Placeholder Replacement

```js
format('SELECT * FROM tbl WHERE foo = ?', {
  params: ["'bar'"],
});
```

Output:

```sql
SELECT
  *
FROM
  tbl
WHERE
  foo = 'bar'
```

For more details see [docs of params option.](docs/params.md)

### Command Line Usage

The CLI tool is installed as `dlh-sql-formatter`:

```sh
npx @dlh.io/dlh-sql-formatter -h
```

```
usage: dlh-sql-formatter [-h] [-o OUTPUT] \
[-l {bigquery,db2,db2i,duckdb,hive,mariadb,mysql,n1ql,plsql,postgresql,redshift,singlestoredb,snowflake,spark,sql,sqlite,tidb,transactsql,trino,tsql}] [-c CONFIG] [--version] [FILE]

SQL Formatter

positional arguments:
  FILE            Input SQL file (defaults to stdin)

optional arguments:
  -h, --help      show this help message and exit
  -o, --output    OUTPUT
                    File to write SQL output (defaults to stdout)
  --fix           Update the file in-place
  -l, --language  SQL dialect (defaults to basic sql)
  -c, --config    CONFIG
                    Path to config JSON file or json string
  --version       show program's version number and exit
```

Example:

```sh
echo 'select * from tbl where id = 3' | npx @dlh.io/dlh-sql-formatter
```

### Configuration File

The tool accepts a JSON config file named `.sql-formatter.json` in the current or any parent directory, or via the `--config` option:

```json
{
  "$schema": "https://raw.githubusercontent.com/datalakehouse/dlh-sql-formatter/master/schema.json",
  "language": "spark",
  "tabWidth": 2,
  "keywordCase": "upper",
  "linesBetweenQueries": 2
}
```

> **Tip:** Add the `$schema` field to get autocomplete and validation in VS Code and other editors that support JSON Schema.

All fields are optional and unspecified fields use their default values.

### Configuration Options

- [**`language`**](docs/language.md) the SQL dialect to use (when using `format()`).
- [**`dialect`**](docs/dialect.md) the SQL dialect to use (when using `formatDialect()` since version 12).
- [**`tabWidth`**](docs/tabWidth.md) amount of indentation to use.
- [**`useTabs`**](docs/useTabs.md) to use tabs for indentation.
- [**`keywordCase`**](docs/keywordCase.md) uppercases or lowercases keywords.
- [**`dataTypeCase`**](docs/dataTypeCase.md) uppercases or lowercases data types.
- [**`functionCase`**](docs/functionCase.md) uppercases or lowercases function names.
- [**`identifierCase`**](docs/identifierCase.md) uppercases or lowercases identifiers. (**experimental!**)
- [**`indentStyle`**](docs/indentStyle.md) defines overall indentation style. (**deprecated!**)
- [**`logicalOperatorNewline`**](docs/logicalOperatorNewline.md) newline before or after boolean operator (AND, OR, XOR).
- [**`commaPosition`**](docs/commaPosition.md) decides comma position of commas between multiple columns/tables.
- [**`expressionWidth`**](docs/expressionWidth.md) maximum number of characters in parenthesized expressions to be kept on single line.
- [**`linesBetweenQueries`**](docs/linesBetweenQueries.md) how many newlines to insert between queries.
- [**`denseOperators`**](docs/denseOperators.md) packs operators densely without spaces.
- [**`newlineBeforeSemicolon`**](docs/newlineBeforeSemicolon.md) places semicolon on separate line.
- [**`params`**](docs/params.md) collection of values for placeholder replacement.
- [**`paramTypes`**](docs/paramTypes.md) specifies parameter placeholders types to support.

### Usage without NPM

If you don't use a module bundler, clone the repository, run `npm install` and grab a file from `/dist` directory to use inside a `<script>` tag.
This makes SQL Formatter available as a global variable `window.sqlFormatter`.

## Editor Integration

### VS Code

Install the [DLH SQL Optimizer](https://marketplace.visualstudio.com/items?itemName=DLH.dlh-sql-optimizer) extension for VS Code to format SQL files directly in your editor.

### JSON Schema for Config

Add the `$schema` property to your `.sql-formatter.json` for editor autocomplete:

```json
{
  "$schema": "https://raw.githubusercontent.com/datalakehouse/dlh-sql-formatter/master/schema.json"
}
```

## Frequently Asked Questions

### Parse error: Unexpected ... at line ...

The most common cause is that you haven't specified an SQL dialect.
Instead of calling the library simply:

```js
format('select [col] from tbl');
// Throws: Parse error: Unexpected "[col] from" at line 1 column 8
```

Pick the proper dialect:

```js
format('select [col] from tbl', { language: 'transactsql' });
```

Or when using the VS Code extension: Settings → DLH SQL Optimizer → Dialect.

The error message includes line and column information to help you locate the issue. Common causes include unsupported syntax for the selected dialect, unclosed strings or brackets, and template syntax that needs `paramTypes` configuration.

### My SQL contains templating syntax which SQL Formatter fails to parse

Use the [paramTypes](docs/paramTypes.md) config option to treat templating constructs as parameter placeholders:

```js
format('SELECT {col1}, {col2} FROM {tablename};', {
  paramTypes: { custom: [{ regex: String.raw`\{\w+\}` }] },
});
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md)

## Upstream Sync

This project regularly syncs with [sql-formatter-org/sql-formatter](https://github.com/sql-formatter-org/sql-formatter) to incorporate upstream bug fixes. See [CHANGELOG.md](CHANGELOG.md) for details on what has been merged.

## License

[MIT](LICENSE)
