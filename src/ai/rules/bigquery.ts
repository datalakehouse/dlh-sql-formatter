import { AnalysisRule, Suggestion } from '../types.js';

/**
 * Warns when querying partitioned tables without a partition filter.
 */
const partitionPruning: AnalysisRule = {
  id: 'bigquery-partition-pruning',
  name: 'Add partition filter for partitioned tables',
  dialects: ['bigquery'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const upper = sql.toUpperCase();

    // Heuristic: if query has common partition column names but no filter on them
    const partitionColumns = [
      '_PARTITIONTIME',
      '_PARTITIONDATE',
      'PARTITION_DATE',
      'EVENT_DATE',
      'DT',
      'DATE_PARTITION',
    ];
    const hasPartitionInSelect = partitionColumns.some(col => upper.includes(col));

    if (hasPartitionInSelect && /\bFROM\b/u.test(upper) && /\bWHERE\b/u.test(upper) === false) {
      suggestions.push({
        type: 'performance',
        severity: 'warning',
        message:
          'Query references partition columns but has no WHERE clause. ' +
          'Add a filter on the partition column to avoid scanning the entire table and reduce costs.',
        ruleId: 'bigquery-partition-pruning',
      });
    }
    return suggestions;
  },
};

/**
 * Suggests using APPROX_COUNT_DISTINCT instead of COUNT(DISTINCT ...) for large datasets.
 */
const approxCountDistinct: AnalysisRule = {
  id: 'bigquery-approx-count-distinct',
  name: 'Consider APPROX_COUNT_DISTINCT for large datasets',
  dialects: ['bigquery', 'snowflake', 'databricks'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const lines = sql.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (/COUNT\s*\(\s*DISTINCT\b/iu.test(lines[i])) {
        suggestions.push({
          type: 'performance',
          severity: 'info',
          message:
            'For large datasets, consider APPROX_COUNT_DISTINCT() instead of COUNT(DISTINCT ...). ' +
            'It uses HyperLogLog++ and is significantly faster with ~1% error margin.',
          line: i + 1,
          ruleId: 'bigquery-approx-count-distinct',
        });
      }
    }
    return suggestions;
  },
};

/**
 * Warns about using CURRENT_TIMESTAMP() without timezone awareness in BigQuery.
 */
const timezoneAwareness: AnalysisRule = {
  id: 'bigquery-timezone-awareness',
  name: 'Be explicit about timezones',
  dialects: ['bigquery'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const lines = sql.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (
        /CURRENT_TIMESTAMP\s*\(\s*\)/iu.test(lines[i]) &&
        !/TIMESTAMP_TRUNC|AT\s+TIME\s+ZONE/iu.test(lines[i])
      ) {
        suggestions.push({
          type: 'best-practice',
          severity: 'info',
          message:
            'CURRENT_TIMESTAMP() returns UTC in BigQuery. If your pipeline expects a specific timezone, ' +
            'use CURRENT_TIMESTAMP() AT TIME ZONE or TIMESTAMP_TRUNC with explicit timezone.',
          line: i + 1,
          ruleId: 'bigquery-timezone-awareness',
        });
      }
    }
    return suggestions;
  },
};

export const bigqueryRules: AnalysisRule[] = [
  partitionPruning,
  approxCountDistinct,
  timezoneAwareness,
];
