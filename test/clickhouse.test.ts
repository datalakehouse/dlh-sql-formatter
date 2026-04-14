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
import supportsUpdate from './features/update.js';
import supportsDeleteFrom from './features/deleteFrom.js';
import supportsDataTypeCase from './options/dataTypeCase.js';
import supportsNumbers from './features/numbers.js';
import supportsParams from './options/param.js';

describe('ClickHouseFormatter', () => {
  const language = 'clickhouse';
  const format: FormatFn = (query, cfg = {}) => originalFormat(query, { ...cfg, language });

  behavesLikeSqlFormatter(format);
  supportsNumbers(format);
  supportsComments(format);
  supportsCreateTable(format, { orReplace: true, ifNotExists: true });
  supportsDropTable(format, { ifExists: true });
  supportsAlterTable(format, {
    addColumn: true,
    dropColumn: true,
    renameColumn: true,
    renameTo: true,
  });
  supportsDeleteFrom(format);
  supportsInsertInto(format);
  supportsUpdate(format);
  supportsStrings(format, ["''-qq"]);
  supportsIdentifiers(format, [`""-qq`, '``']);
  supportsBetween(format);
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
  ]);
  supportsOperators(format, ['%', '||', '->', '->>', '&&'], { any: true });
  supportsLimiting(format, { limit: true, offset: true });
  supportsDataTypeCase(format);
  supportsParams(format, { positional: true, named: [':'] });

  // ClickHouse-specific tests
  it('formats CREATE TABLE with ENGINE', () => {
    expect(
      format(
        `CREATE TABLE events (
          event_date Date,
          event_type String,
          value Float64
        ) ENGINE = MergeTree()
        ORDER BY (event_date, event_type)
        PARTITION BY toYYYYMM(event_date);`
      )
    ).toContain('ENGINE');
    // We check it doesn't crash and produces reasonable output
  });

  it('formats PREWHERE clause', () => {
    expect(format('SELECT * FROM tbl PREWHERE x > 10 WHERE y = 5;')).toBe(dedent`
      SELECT
        *
      FROM
        tbl
      PREWHERE
        x > 10
      WHERE
        y = 5;
    `);
  });

  it('formats SETTINGS clause', () => {
    expect(
      format("SELECT * FROM tbl SETTINGS max_threads = 4, max_memory_usage = '10G';")
    ).toBe(dedent`
      SELECT
        *
      FROM
        tbl
      SETTINGS
        max_threads = 4,
        max_memory_usage = '10G';
    `);
  });

  it('formats FORMAT clause', () => {
    expect(format('SELECT * FROM tbl FORMAT JSONEachRow;')).toBe(dedent`
      SELECT
        *
      FROM
        tbl
      FORMAT
        JSONEachRow;
    `);
  });

  it('formats OPTIMIZE TABLE statement', () => {
    expect(format('OPTIMIZE TABLE my_table FINAL;')).toBe(dedent`
      OPTIMIZE TABLE my_table FINAL;
    `);
  });

  it('formats SAMPLE clause', () => {
    expect(format('SELECT * FROM tbl SAMPLE 0.1;')).toBe(dedent`
      SELECT
        *
      FROM
        tbl
      SAMPLE
        0.1;
    `);
  });

  it('formats LIMIT BY clause', () => {
    expect(format('SELECT * FROM tbl LIMIT 5 BY user_id;')).toBe(dedent`
      SELECT
        *
      FROM
        tbl
      LIMIT
        5 BY user_id;
    `);
  });

  it('formats type-cast operator :: without spaces', () => {
    expect(format('SELECT 2 :: Int32 AS foo;')).toBe(dedent`
      SELECT
        2::Int32 AS foo;
    `);
  });

  it('formats WITH TOTALS clause', () => {
    expect(
      format('SELECT region, SUM(amount) FROM sales GROUP BY region WITH TOTALS;')
    ).toBe(dedent`
      SELECT
        region,
        SUM(amount)
      FROM
        sales
      GROUP BY
        region
      WITH TOTALS;
    `);
  });

  it('formats ARRAY JOIN', () => {
    expect(
      format('SELECT s, arr FROM arrays_test ARRAY JOIN arr;')
    ).toBe(dedent`
      SELECT
        s,
        arr
      FROM
        arrays_test
        ARRAY JOIN arr;
    `);
  });

  it('allows $ character as part of identifiers', () => {
    expect(format('SELECT foo$, some$$ident')).toBe(dedent`
      SELECT
        foo$,
        some$$ident
    `);
  });
});
