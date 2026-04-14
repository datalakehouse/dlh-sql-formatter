import { AnalysisRule, Suggestion } from '../types.js';

/**
 * Warns about using NOT IN with subqueries (can have NULL issues).
 */
const notInSubquery: AnalysisRule = {
  id: 'postgresql-not-in-subquery',
  name: 'Avoid NOT IN with subqueries',
  dialects: ['postgresql', 'cockroachdb', 'timescaledb'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const lines = sql.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (/NOT\s+IN\s*\(\s*SELECT/iu.test(lines[i])) {
        suggestions.push({
          type: 'correctness',
          severity: 'warning',
          message:
            'NOT IN with a subquery can return unexpected results if the subquery contains NULL values. ' +
            'Consider using NOT EXISTS or LEFT JOIN ... WHERE ... IS NULL instead.',
          line: i + 1,
          ruleId: 'postgresql-not-in-subquery',
        });
      }
    }
    return suggestions;
  },
};

/**
 * Suggests using EXPLAIN ANALYZE for query tuning.
 */
const suggestExplainAnalyze: AnalysisRule = {
  id: 'postgresql-suggest-explain',
  name: 'Suggest EXPLAIN ANALYZE for complex queries',
  dialects: ['postgresql', 'cockroachdb', 'timescaledb'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const upper = sql.toUpperCase();

    // Heuristic: if query has multiple JOINs or subqueries, suggest EXPLAIN
    const joinCount = (upper.match(/\bJOIN\b/gu) || []).length;
    const subqueryCount = (upper.match(/\(\s*SELECT\b/gu) || []).length;

    if (joinCount >= 3 || subqueryCount >= 2) {
      suggestions.push({
        type: 'performance',
        severity: 'info',
        message:
          `This query has ${joinCount} JOINs and ${subqueryCount} subqueries. ` +
          'Consider running EXPLAIN (ANALYZE, BUFFERS) to identify bottlenecks.',
        ruleId: 'postgresql-suggest-explain',
      });
    }
    return suggestions;
  },
};

export const postgresqlRules: AnalysisRule[] = [notInSubquery, suggestExplainAnalyze];
