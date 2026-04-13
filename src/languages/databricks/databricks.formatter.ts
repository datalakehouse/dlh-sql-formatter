import { DialectOptions } from '../../dialect.js';
import { expandPhrases } from '../../expandPhrases.js';
import { EOF_TOKEN, isToken, Token, TokenType } from '../../lexer/token.js';
import { dataTypes, keywords } from './databricks.keywords.js';
import { functions } from './databricks.functions.js';

const reservedSelect = expandPhrases(['SELECT [ALL | DISTINCT]']);

const reservedClauses = expandPhrases([
  // queries
  'WITH [RECURSIVE]',
  'FROM',
  'WHERE',
  'GROUP BY [ALL]',
  'HAVING',
  'WINDOW',
  'PARTITION BY',
  'ORDER BY',
  'SORT BY',
  'CLUSTER BY',
  'DISTRIBUTE BY',
  'LIMIT',
  // Data manipulation
  // - insert:
  'INSERT [INTO | OVERWRITE] [TABLE]',
  'VALUES',
  // - insert overwrite directory:
  'INSERT OVERWRITE [LOCAL] DIRECTORY',
  // - load:
  'LOAD DATA [LOCAL] INPATH',
  '[OVERWRITE] INTO TABLE',
  // other
  'RETURNING',
]);

const standardOnelineClauses = expandPhrases([
  'CREATE [EXTERNAL] TABLE [IF NOT EXISTS]',
  'CREATE [OR REPLACE] [TEMPORARY | TEMP] TABLE [IF NOT EXISTS]',
]);

const tabularOnelineClauses = expandPhrases([
  // - create:
  'CREATE [OR REPLACE] [GLOBAL TEMPORARY | TEMPORARY | TEMP] VIEW [IF NOT EXISTS]',
  'CREATE [OR REPLACE] [STREAMING] [LIVE] TABLE',
  'CREATE MATERIALIZED VIEW [IF NOT EXISTS]',
  // - update:
  'UPDATE',
  // - delete:
  'DELETE FROM',
  // - drop table:
  'DROP TABLE [IF EXISTS]',
  // - alter table:
  'ALTER TABLE',
  'ADD COLUMNS',
  'DROP {COLUMN | COLUMNS}',
  'RENAME TO',
  'RENAME COLUMN',
  'ALTER COLUMN',
  // - truncate:
  'TRUNCATE TABLE',
  // Delta Lake operations
  'OPTIMIZE',
  'VACUUM',
  'DESCRIBE HISTORY',
  'DESCRIBE DETAIL',
  'RESTORE [TABLE]',
  // Unity Catalog
  'CREATE CATALOG [IF NOT EXISTS]',
  'DROP CATALOG [IF EXISTS]',
  'ALTER CATALOG',
  'CREATE SCHEMA [IF NOT EXISTS]',
  'DROP SCHEMA [IF EXISTS]',
  'ALTER SCHEMA',
  'USE CATALOG',
  'USE [SCHEMA | DATABASE]',
  // Copy
  'COPY INTO',
  // Other Spark-inherited
  'LATERAL VIEW',
  'ALTER DATABASE',
  'ALTER VIEW',
  'CREATE DATABASE [IF NOT EXISTS]',
  'CREATE FUNCTION [IF NOT EXISTS]',
  'DROP DATABASE [IF EXISTS]',
  'DROP FUNCTION [IF EXISTS]',
  'DROP VIEW [IF EXISTS]',
  'REPAIR TABLE',
  // Data retrieval
  'TABLESAMPLE',
  'PIVOT',
  'UNPIVOT',
  'TRANSFORM',
  'EXPLAIN',
  // Auxiliary
  'ADD FILE',
  'ADD JAR',
  'ANALYZE TABLE',
  'CACHE TABLE',
  'CLEAR CACHE',
  'DESCRIBE DATABASE',
  'DESCRIBE FUNCTION',
  'DESCRIBE QUERY',
  'DESCRIBE TABLE',
  'LIST FILE',
  'LIST JAR',
  'REFRESH',
  'REFRESH TABLE',
  'REFRESH FUNCTION',
  'RESET',
  'SHOW CATALOGS',
  'SHOW COLUMNS',
  'SHOW CREATE TABLE',
  'SHOW DATABASES',
  'SHOW FUNCTIONS',
  'SHOW GRANTS',
  'SHOW PARTITIONS',
  'SHOW SCHEMAS',
  'SHOW TABLE EXTENDED',
  'SHOW TABLES',
  'SHOW TBLPROPERTIES',
  'SHOW VIEWS',
  'SHOW VOLUMES',
  'UNCACHE TABLE',
  // Security
  'GRANT',
  'REVOKE',
  'DENY',
  // Share
  'CREATE SHARE [IF NOT EXISTS]',
  'DROP SHARE [IF EXISTS]',
  'ALTER SHARE',
  'SHOW SHARES',
  // Volumes
  'CREATE [EXTERNAL] VOLUME [IF NOT EXISTS]',
  'DROP VOLUME [IF EXISTS]',
  'ALTER VOLUME',
]);

const reservedSetOperations = expandPhrases([
  'UNION [ALL | DISTINCT]',
  'EXCEPT [ALL | DISTINCT]',
  'INTERSECT [ALL | DISTINCT]',
  'MINUS [ALL | DISTINCT]',
]);

const reservedJoins = expandPhrases([
  'JOIN',
  '{LEFT | RIGHT | FULL} [OUTER] JOIN',
  '{INNER | CROSS} JOIN',
  'NATURAL [INNER] JOIN',
  'NATURAL {LEFT | RIGHT | FULL} [OUTER] JOIN',
  // non-standard joins
  '[LEFT] {ANTI | SEMI} JOIN',
  'NATURAL [LEFT] {ANTI | SEMI} JOIN',
]);

const reservedKeywordPhrases = expandPhrases([
  'ON DELETE',
  'ON UPDATE',
  'CURRENT ROW',
  '{ROWS | RANGE} BETWEEN',
  'ZORDER BY',
]);

const reservedDataTypePhrases = expandPhrases([]);

// https://docs.databricks.com/en/sql/language-manual/index.html
export const databricks: DialectOptions = {
  name: 'databricks',
  tokenizerOptions: {
    reservedSelect,
    reservedClauses: [...reservedClauses, ...standardOnelineClauses, ...tabularOnelineClauses],
    reservedSetOperations,
    reservedJoins,
    reservedKeywordPhrases,
    reservedDataTypePhrases,
    supportsXor: true,
    reservedKeywords: keywords,
    reservedDataTypes: dataTypes,
    reservedFunctionNames: functions,
    extraParens: ['[]'],
    stringTypes: [
      "''-bs",
      '""-bs',
      { quote: "''-raw", prefixes: ['R', 'X'], requirePrefix: true },
      { quote: '""-raw', prefixes: ['R', 'X'], requirePrefix: true },
    ],
    identTypes: ['``'],
    identChars: { allowFirstCharNumber: true },
    variableTypes: [{ quote: '{}', prefixes: ['$'], requirePrefix: true }],
    operators: ['%', '~', '^', '|', '&', '<=>', '==', '!', '||', '->', '::'],
    postProcess,
  },
  formatOptions: {
    alwaysDenseOperators: ['::'],
    onelineClauses: [...standardOnelineClauses, ...tabularOnelineClauses],
    tabularOnelineClauses,
  },
};

function postProcess(tokens: Token[]) {
  return tokens.map((token, i) => {
    const nextToken = tokens[i + 1] || EOF_TOKEN;

    // WINDOW(...) function call
    if (isToken.WINDOW(token) && nextToken.type === TokenType.OPEN_PAREN) {
      return { ...token, type: TokenType.RESERVED_FUNCTION_NAME };
    }

    return token;
  });
}
