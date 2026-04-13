import { DialectOptions } from '../../dialect.js';
import { expandPhrases } from '../../expandPhrases.js';
import { dataTypes, keywords } from './clickhouse.keywords.js';
import { functions } from './clickhouse.functions.js';

const reservedSelect = expandPhrases(['SELECT [ALL | DISTINCT]']);

const reservedClauses = expandPhrases([
  // queries
  'WITH',
  'FROM',
  'PREWHERE',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'WINDOW',
  'PARTITION BY',
  'ORDER BY',
  'LIMIT',
  'LIMIT BY',
  'OFFSET',
  'SAMPLE',
  'SETTINGS',
  'FORMAT',
  // Data manipulation
  'INSERT INTO',
  'VALUES',
  'SET',
  // other
  'WITH TOTALS',
]);

const standardOnelineClauses = expandPhrases([
  'CREATE [TEMPORARY] TABLE [IF NOT EXISTS]',
  'CREATE [OR REPLACE] TABLE',
]);

const tabularOnelineClauses = expandPhrases([
  // Views
  'CREATE [OR REPLACE] [MATERIALIZED] VIEW [IF NOT EXISTS]',
  'CREATE LIVE VIEW [IF NOT EXISTS]',
  // Update/Delete
  'UPDATE',
  'ALTER TABLE',
  'DELETE FROM',
  'DROP TABLE [IF EXISTS]',
  'DROP VIEW [IF EXISTS]',
  'DROP DATABASE [IF EXISTS]',
  // ALTER
  'ADD COLUMN [IF NOT EXISTS]',
  'DROP COLUMN [IF EXISTS]',
  'RENAME COLUMN',
  'MODIFY COLUMN',
  'CLEAR COLUMN',
  'COMMENT COLUMN',
  'ALTER COLUMN',
  'RENAME TO',
  'MODIFY ORDER BY',
  'ADD INDEX [IF NOT EXISTS]',
  'DROP INDEX [IF EXISTS]',
  'MATERIALIZE INDEX',
  'CLEAR INDEX',
  'ADD PROJECTION [IF NOT EXISTS]',
  'DROP PROJECTION [IF EXISTS]',
  'MATERIALIZE PROJECTION',
  'CLEAR PROJECTION',
  'MODIFY TTL',
  'REMOVE TTL',
  'MODIFY SETTING',
  'RESET SETTING',
  'MOVE PARTITION',
  'CLEAR COLUMN IN PARTITION',
  'FREEZE [PARTITION]',
  'UNFREEZE [PARTITION]',
  'FETCH PARTITION',
  'ATTACH [PARTITION | PART]',
  'DETACH [PARTITION | PART]',
  'DROP [PARTITION | PART]',
  'REPLACE PARTITION',
  // Truncate
  'TRUNCATE [TABLE] [IF EXISTS]',
  // Database
  'CREATE DATABASE [IF NOT EXISTS]',
  'ALTER DATABASE',
  // Dictionary
  'CREATE DICTIONARY [IF NOT EXISTS]',
  'DROP DICTIONARY [IF EXISTS]',
  // Function
  'CREATE FUNCTION [IF NOT EXISTS]',
  'DROP FUNCTION [IF EXISTS]',
  // Other
  'OPTIMIZE TABLE',
  'RENAME TABLE',
  'EXCHANGE TABLES',
  'SHOW DATABASES',
  'SHOW TABLES',
  'SHOW DICTIONARIES',
  'SHOW CREATE TABLE',
  'SHOW CREATE DATABASE',
  'SHOW PROCESSLIST',
  'DESCRIBE [TABLE]',
  'DESC [TABLE]',
  'EXISTS [TABLE]',
  'USE',
  'EXPLAIN',
  'SYSTEM',
  'KILL QUERY',
  'KILL MUTATION',
  // Grant/Revoke
  'GRANT',
  'REVOKE',
  'CREATE ROLE',
  'DROP ROLE',
  'CREATE USER',
  'DROP USER',
  'ALTER USER',
  'CREATE ROW POLICY',
  'DROP ROW POLICY',
  'CREATE QUOTA',
  'DROP QUOTA',
  'CREATE SETTINGS PROFILE',
  'DROP SETTINGS PROFILE',
]);

const reservedSetOperations = expandPhrases([
  'UNION [ALL | DISTINCT]',
  'EXCEPT [ALL | DISTINCT]',
  'INTERSECT [ALL | DISTINCT]',
]);

const reservedJoins = expandPhrases([
  'JOIN',
  '{LEFT | RIGHT | FULL} [OUTER] JOIN',
  '{LEFT | RIGHT | FULL} [ALL | ANY | ANTI | SEMI | ASOF] [OUTER] JOIN',
  '{INNER | CROSS} JOIN',
  '[ALL | ANY | ANTI | SEMI | ASOF] [INNER] JOIN',
  '[GLOBAL] [ANY | ALL] [INNER | LEFT | RIGHT | FULL] [OUTER] JOIN',
  'ARRAY JOIN',
  'LEFT ARRAY JOIN',
  'PASTE JOIN',
]);

const reservedKeywordPhrases = expandPhrases(['{ROWS | RANGE} BETWEEN', 'ENGINE', 'SAMPLE BY']);

const reservedDataTypePhrases = expandPhrases([]);

// https://clickhouse.com/docs/en/sql-reference
export const clickhouse: DialectOptions = {
  name: 'clickhouse',
  tokenizerOptions: {
    reservedSelect,
    reservedClauses: [...reservedClauses, ...standardOnelineClauses, ...tabularOnelineClauses],
    reservedSetOperations,
    reservedJoins,
    reservedKeywordPhrases,
    reservedDataTypePhrases,
    reservedKeywords: keywords,
    reservedDataTypes: dataTypes,
    reservedFunctionNames: functions,
    stringTypes: ["''-qq"],
    identTypes: [`""-qq`, '``'],
    identChars: { rest: '$' },
    paramTypes: { positional: true, named: [':'] },
    lineCommentTypes: ['--'],
    operators: [
      '%',
      '||',
      '->',
      '->>',
      '::',
      '&&',
      '??',
      // Lambda
      '->',
    ],
  },
  formatOptions: {
    alwaysDenseOperators: ['::'],
    onelineClauses: [...standardOnelineClauses, ...tabularOnelineClauses],
    tabularOnelineClauses,
  },
};
