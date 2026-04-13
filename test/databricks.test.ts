import dedent from 'dedent-js';

import { format as originalFormat, FormatFn } from '../src/sqlFormatter.js';
import behavesLikeSqlFormatter from './behavesLikeSqlFormatter.js';

import supportsCreateTable from './features/createTable.js';
import supportsDropTable from './features/dropTable.js';
import supportsAlterTable from './features/alterTable.js';
import supportsStrings from './features/strings.js';
import supportsBetween from './features/between.js';
import supportsJoin from './features/join.js';
import supportsOperators from './features/operators.js';
import supportsComments from './features/comments.js';
import supportsIdentifiers from './features/identifiers.js';
import supportsSetOperations from './features/setOperations.js';
import supportsLimiting from './features/limiting.js';
import supportsInsertInto from './features/insertInto.js';
import supportsTruncateTable from './features/truncateTable.js';
import supportsCreateView from './features/createView.js';
import supportsArrayAndMapAccessors from './features/arrayAndMapAccessors.js';
import supportsDataTypeCase from './options/dataTypeCase.js';
import supportsNumbers from './features/numbers.js';

describe('DatabricksFormatter', () => {
  const language = 'databricks';
  const format: FormatFn = (query, cfg = {}) => originalFormat(query, { ...cfg, language });

  behavesLikeSqlFormatter(format);
  supportsNumbers(format);
  supportsComments(format);
  supportsCreateView(format, { orReplace: true, ifNotExists: true });
  supportsCreateTable(format, { ifNotExists: true, orReplace: true });
  supportsDropTable(format, { ifExists: true });
  supportsAlterTable(format, {
    dropColumn: true,
    renameTo: true,
    renameColumn: true,
  });
  supportsInsertInto(format, { withoutInto: true });
  supportsTruncateTable(format);
  supportsStrings(format, ["''-bs", '""-bs', "X''", 'X""', "R''", 'R""']);
  supportsIdentifiers(format, ['``']);
  supportsBetween(format);
  supportsOperators(format, ['%', '~', '^', '|', '&', '<=>', '==', '!', '||', '->'], {
    logicalOperators: ['AND', 'OR', 'XOR'],
    any: true,
  });
  supportsArrayAndMapAccessors(format);
  supportsJoin(format, {
    additionally: [
      'ANTI JOIN',
      'LEFT ANTI JOIN',
      'SEMI JOIN',
      'LEFT SEMI JOIN',
      'NATURAL ANTI JOIN',
      'NATURAL LEFT ANTI JOIN',
      'NATURAL SEMI JOIN',
      'NATURAL LEFT SEMI JOIN',
    ],
  });
  supportsSetOperations(format, [
    'UNION',
    'UNION ALL',
    'UNION DISTINCT',
    'EXCEPT',
    'EXCEPT ALL',
    'EXCEPT DISTINCT',
    'INTERSECT',
    'INTERSECT ALL',
    'INTERSECT DISTINCT',
    'MINUS',
    'MINUS ALL',
    'MINUS DISTINCT',
  ]);
  supportsLimiting(format, { limit: true });
  supportsDataTypeCase(format);

  // Databricks-specific tests
  it('formats OPTIMIZE statement', () => {
    expect(format('OPTIMIZE my_table ZORDER BY col1, col2;')).toBe(dedent`
      OPTIMIZE my_table ZORDER BY col1, col2;
    `);
  });

  it('formats VACUUM statement', () => {
    expect(format('VACUUM my_schema.my_table RETAIN 168 HOURS;')).toBe(dedent`
      VACUUM my_schema.my_table RETAIN 168 HOURS;
    `);
  });

  it('formats DESCRIBE HISTORY statement', () => {
    expect(format('DESCRIBE HISTORY my_table;')).toBe(dedent`
      DESCRIBE HISTORY my_table;
    `);
  });

  it('formats CREATE CATALOG statement', () => {
    expect(format('CREATE CATALOG IF NOT EXISTS my_catalog;')).toBe(dedent`
      CREATE CATALOG IF NOT EXISTS my_catalog;
    `);
  });

  it('formats USE CATALOG statement', () => {
    expect(format('USE CATALOG my_catalog;')).toBe(dedent`
      USE CATALOG my_catalog;
    `);
  });

  it('formats COPY INTO statement', () => {
    expect(
      format(`COPY INTO my_table FROM '/path/to/files' FILEFORMAT = CSV;`)
    ).toBe(dedent`
      COPY INTO my_table
      FROM
        '/path/to/files' FILEFORMAT = CSV;
    `);
  });

  it('formats type-cast operator :: without spaces', () => {
    expect(format('SELECT 2 :: INT AS foo;')).toBe(dedent`
      SELECT
        2::INT AS foo;
    `);
  });

  // eslint-disable-next-line no-template-curly-in-string
  it('recognizes ${name} substitution variables', () => {
    const result = format(
      // eslint-disable-next-line no-template-curly-in-string
      "SELECT ${var1}, ${ var 2 } FROM ${table_name} WHERE name = '${name}';"
    );
    expect(result).toBe(dedent`
      SELECT
        \${var1},
        \${ var 2 }
      FROM
        \${table_name}
      WHERE
        name = '\${name}';
    `);
  });

  it('supports identifiers that start with numbers', () => {
    expect(format('SELECT 4four, 12345e FROM 5tbl')).toBe(
      dedent`
        SELECT
          4four,
          12345e
        FROM
          5tbl
      `
    );
  });

  it('formats MERGE INTO with extended syntax', () => {
    const result = format(`
      MERGE INTO target_table t
      USING source_table s
      ON t.id = s.id
      WHEN MATCHED AND s.deleted = true THEN DELETE
      WHEN MATCHED THEN UPDATE SET t.value = s.value
      WHEN NOT MATCHED THEN INSERT (id, value) VALUES (s.id, s.value);
    `);
    expect(result).toContain('MERGE INTO');
    expect(result).toContain('WHEN MATCHED');
    expect(result).toContain('WHEN NOT MATCHED');
  });
});
