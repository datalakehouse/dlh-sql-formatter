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

  // --- Delta Lake Operations ---

  it('formats OPTIMIZE statement', () => {
    expect(format('OPTIMIZE my_table ZORDER BY col1, col2;')).toBe(dedent`
      OPTIMIZE my_table
      ZORDER BY
        col1,
        col2;
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

  it('formats DESCRIBE DETAIL statement', () => {
    expect(format('DESCRIBE DETAIL my_table;')).toBe(dedent`
      DESCRIBE DETAIL my_table;
    `);
  });

  // --- Unity Catalog ---

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

  it('formats CREATE SCHEMA statement', () => {
    expect(format('CREATE SCHEMA IF NOT EXISTS my_schema;')).toBe(dedent`
      CREATE SCHEMA IF NOT EXISTS my_schema;
    `);
  });

  it('formats USE SCHEMA statement', () => {
    expect(format('USE SCHEMA my_schema;')).toBe(dedent`
      USE SCHEMA my_schema;
    `);
  });

  // --- COPY INTO ---

  it('formats COPY INTO statement', () => {
    expect(format(`COPY INTO my_table FROM '/path/to/files' FILEFORMAT = CSV;`)).toBe(dedent`
      COPY INTO my_table
      FROM
        '/path/to/files' FILEFORMAT = CSV;
    `);
  });

  // --- Type cast operator ---

  it('formats type-cast operator :: without spaces', () => {
    expect(format('SELECT 2 :: INT AS foo;')).toBe(dedent`
      SELECT
        2::INT AS foo;
    `);
  });

  // --- Substitution variables ---

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

  // --- Identifiers starting with numbers ---

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

  // --- UPDATE ---

  it('formats simple UPDATE statement', () => {
    const result = format(
      "UPDATE Customers SET ContactName='Alfred Schmidt', City='Hamburg' WHERE CustomerName='Alfreds Futterkiste';"
    );
    expect(result).toBe(dedent`
      UPDATE Customers
      SET
        ContactName = 'Alfred Schmidt',
        City = 'Hamburg'
      WHERE
        CustomerName = 'Alfreds Futterkiste';
    `);
  });

  // --- DELETE ---

  it('formats DELETE FROM statement', () => {
    const result = format("DELETE FROM Customers WHERE CustomerName='Alfred';");
    expect(result).toBe(dedent`
      DELETE FROM Customers
      WHERE
        CustomerName = 'Alfred';
    `);
  });

  // --- MERGE INTO ---

  it('formats MERGE INTO with extended syntax', () => {
    const result = format(`
      MERGE INTO target_table t
      USING source_table s
      ON t.id = s.id
      WHEN MATCHED AND s.deleted = true THEN DELETE
      WHEN MATCHED THEN UPDATE SET t.value = s.value
      WHEN NOT MATCHED THEN INSERT (id, value) VALUES (s.id, s.value);
    `);
    expect(result).toBe(dedent`
      MERGE INTO
        target_table t
      USING
        source_table s ON t.id = s.id
      WHEN MATCHED AND
        s.deleted = true THEN DELETE
      WHEN MATCHED THEN
      UPDATE SET
        t.value = s.value
      WHEN NOT MATCHED THEN
      INSERT
        (id, value)
      VALUES
        (s.id, s.value);
    `);
  });

  it('formats simple MERGE INTO', () => {
    const result = format(`
      MERGE INTO target AS t
      USING source AS s
      ON t.key = s.key
      WHEN MATCHED THEN UPDATE SET t.val = s.val
      WHEN NOT MATCHED THEN INSERT (key, val) VALUES (s.key, s.val);
    `);
    expect(result).toBe(dedent`
      MERGE INTO
        target AS t
      USING
        source AS s ON t.key = s.key
      WHEN MATCHED THEN
      UPDATE SET
        t.val = s.val
      WHEN NOT MATCHED THEN
      INSERT
        (key, val)
      VALUES
        (s.key, s.val);
    `);
  });

  // --- SORT BY, CLUSTER BY, DISTRIBUTE BY ---

  it('supports SORT BY, CLUSTER BY, DISTRIBUTE BY', () => {
    const result = format(
      'SELECT value, count DISTRIBUTE BY count CLUSTER BY value SORT BY value, count;'
    );
    expect(result).toBe(dedent`
      SELECT
        value,
        count
      DISTRIBUTE BY
        count
      CLUSTER BY
        value
      SORT BY
        value,
        count;
    `);
  });

  // --- Streaming and Live Tables (Delta Live Tables) ---

  it('formats CREATE STREAMING LIVE TABLE statement', () => {
    expect(format('CREATE STREAMING LIVE TABLE my_table AS SELECT * FROM stream;')).toBe(dedent`
      CREATE STREAMING LIVE TABLE my_table AS
      SELECT
        *
      FROM
        stream;
    `);
  });

  it('formats CREATE LIVE TABLE statement', () => {
    expect(format('CREATE LIVE TABLE my_table AS SELECT * FROM source;')).toBe(dedent`
      CREATE LIVE TABLE my_table AS
      SELECT
        *
      FROM
        source;
    `);
  });

  // --- Window Functions ---

  it('formats window functions with PARTITION BY and ORDER BY', () => {
    const result = format(
      'SELECT col1, ROW_NUMBER() OVER (PARTITION BY col2 ORDER BY col3 DESC) AS rn FROM tbl;'
    );
    expect(result).toBe(dedent`
      SELECT
        col1,
        ROW_NUMBER() OVER (
          PARTITION BY
            col2
          ORDER BY
            col3 DESC
        ) AS rn
      FROM
        tbl;
    `);
  });

  // --- LATERAL VIEW ---

  it('formats LATERAL VIEW', () => {
    expect(format('SELECT id, val FROM tbl LATERAL VIEW EXPLODE(arr) t AS val;')).toBe(dedent`
      SELECT
        id,
        val
      FROM
        tbl
      LATERAL VIEW
        EXPLODE(arr) t AS val;
    `);
  });

  // --- PIVOT and UNPIVOT ---

  it('formats PIVOT', () => {
    expect(
      format("SELECT * FROM sales PIVOT (SUM(amount) FOR quarter IN ('Q1', 'Q2', 'Q3', 'Q4'));")
    ).toBe(dedent`
      SELECT
        *
      FROM
        sales
      PIVOT (
        SUM(amount) FOR quarter IN ('Q1', 'Q2', 'Q3', 'Q4')
      );
    `);
  });

  // --- SHOW commands ---

  it('formats SHOW TABLES', () => {
    expect(format('SHOW TABLES IN my_schema;')).toBe(dedent`
      SHOW TABLES IN my_schema;
    `);
  });

  it('formats SHOW VOLUMES', () => {
    expect(format('SHOW VOLUMES IN my_schema;')).toBe(dedent`
      SHOW VOLUMES IN my_schema;
    `);
  });

  // --- Volumes ---

  it('formats CREATE VOLUME statement', () => {
    expect(format('CREATE VOLUME IF NOT EXISTS my_catalog.my_schema.my_volume;')).toBe(dedent`
      CREATE VOLUME IF NOT EXISTS my_catalog.my_schema.my_volume;
    `);
  });

  it('formats DROP VOLUME statement', () => {
    expect(format('DROP VOLUME IF EXISTS my_catalog.my_schema.my_volume;')).toBe(dedent`
      DROP VOLUME IF EXISTS my_catalog.my_schema.my_volume;
    `);
  });

  // --- INSERT OVERWRITE ---

  it('formats INSERT OVERWRITE TABLE', () => {
    const result = format("INSERT OVERWRITE TABLE Customers VALUES (12, -123.4, 'Skagen 2111');");
    expect(result).toBe(dedent`
      INSERT OVERWRITE TABLE
        Customers
      VALUES
        (12, -123.4, 'Skagen 2111');
    `);
  });

  // --- GRANT / REVOKE ---

  it('formats GRANT statement', () => {
    expect(format('GRANT SELECT ON TABLE my_table TO user1;')).toBe(dedent`
      GRANT SELECT ON TABLE my_table TO user1;
    `);
  });

  it('formats REVOKE statement', () => {
    expect(format('REVOKE SELECT ON TABLE my_table FROM user1;')).toBe(dedent`
      REVOKE SELECT ON TABLE my_table FROM user1;
    `);
  });

  // --- CREATE MATERIALIZED VIEW ---

  it('formats CREATE MATERIALIZED VIEW', () => {
    expect(format('CREATE MATERIALIZED VIEW IF NOT EXISTS my_view AS SELECT * FROM tbl;'))
      .toBe(dedent`
      CREATE MATERIALIZED VIEW IF NOT EXISTS my_view AS
      SELECT
        *
      FROM
        tbl;
    `);
  });

  // --- RESTORE TABLE ---

  it('formats RESTORE TABLE statement', () => {
    expect(format('RESTORE TABLE my_table VERSION AS OF 5;')).toBe(dedent`
      RESTORE TABLE my_table VERSION AS OF 5;
    `);
  });

  // --- Complex query combining multiple Databricks features ---

  it('formats complex Databricks query with CTE and window function', () => {
    const result = format(`
      WITH ranked AS (
        SELECT id, name, score,
        ROW_NUMBER() OVER (PARTITION BY name ORDER BY score DESC) AS rn
        FROM my_catalog.my_schema.my_table
        WHERE score > 0
      )
      SELECT id, name, score
      FROM ranked
      WHERE rn = 1
      ORDER BY score DESC
      LIMIT 10;
    `);
    expect(result).toBe(dedent`
      WITH
        ranked AS (
          SELECT
            id,
            name,
            score,
            ROW_NUMBER() OVER (
              PARTITION BY
                name
              ORDER BY
                score DESC
            ) AS rn
          FROM
            my_catalog.my_schema.my_table
          WHERE
            score > 0
        )
      SELECT
        id,
        name,
        score
      FROM
        ranked
      WHERE
        rn = 1
      ORDER BY
        score DESC
      LIMIT
        10;
    `);
  });
});
