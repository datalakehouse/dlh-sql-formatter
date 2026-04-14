import { AnalysisRule, Suggestion } from '../types.js';

/**
 * Suggests CLUSTER BY for tables that appear in frequently filtered queries.
 */
const suggestClusterBy: AnalysisRule = {
  id: 'snowflake-suggest-cluster-by',
  name: 'Consider CLUSTER BY for large tables',
  dialects: ['snowflake'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const upper = sql.toUpperCase();

    // If CREATE TABLE without CLUSTER BY, and has ORDER BY or WHERE with specific patterns
    if (/CREATE\s+(?:OR\s+REPLACE\s+)?TABLE/u.test(upper) && !/CLUSTER\s+BY/u.test(upper)) {
      suggestions.push({
        type: 'dialect-specific',
        severity: 'info',
        message:
          'Consider adding CLUSTER BY for large tables in Snowflake. ' +
          'Clustering improves query performance by co-locating related rows in micro-partitions.',
        ruleId: 'snowflake-suggest-cluster-by',
      });
    }
    return suggestions;
  },
};

/**
 * Warns about using COPY INTO without file format specification.
 */
const copyIntoFormat: AnalysisRule = {
  id: 'snowflake-copy-into-format',
  name: 'Specify file format for COPY INTO',
  dialects: ['snowflake'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const upper = sql.toUpperCase();
    const lines = sql.split('\n');

    if (/COPY\s+INTO/u.test(upper) && !/FILE_FORMAT|FORMAT_NAME/u.test(upper)) {
      const copyLine = lines.findIndex(l => /COPY\s+INTO/iu.test(l));
      suggestions.push({
        type: 'best-practice',
        severity: 'warning',
        message:
          'Always specify FILE_FORMAT in COPY INTO statements. ' +
          'Relying on defaults can lead to data loading errors when defaults change.',
        line: copyLine >= 0 ? copyLine + 1 : undefined,
        ruleId: 'snowflake-copy-into-format',
      });
    }
    return suggestions;
  },
};

/**
 * Suggests using QUALIFY instead of subquery for window function filtering.
 */
const suggestQualify: AnalysisRule = {
  id: 'snowflake-suggest-qualify',
  name: 'Use QUALIFY instead of subquery for window function filtering',
  dialects: ['snowflake', 'databricks', 'bigquery'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const upper = sql.toUpperCase();

    // Detect pattern: SELECT ... FROM (SELECT ... ROW_NUMBER() ... ) WHERE rn = 1
    if (
      /ROW_NUMBER\s*\(\s*\)\s*OVER/u.test(upper) &&
      !/QUALIFY/u.test(upper) &&
      /WHERE\s+\w+\s*=\s*1/u.test(upper)
    ) {
      suggestions.push({
        type: 'performance',
        severity: 'info',
        message:
          'Consider using QUALIFY clause instead of a subquery to filter window function results. ' +
          'QUALIFY is cleaner and can be more efficient: QUALIFY ROW_NUMBER() OVER (...) = 1',
        ruleId: 'snowflake-suggest-qualify',
      });
    }
    return suggestions;
  },
};

export const snowflakeRules: AnalysisRule[] = [suggestClusterBy, copyIntoFormat, suggestQualify];
