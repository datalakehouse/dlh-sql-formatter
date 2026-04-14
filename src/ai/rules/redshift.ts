import { AnalysisRule, Suggestion } from '../types.js';

/**
 * Suggests distribution key for tables used in JOINs.
 */
const suggestDistKey: AnalysisRule = {
  id: 'redshift-suggest-dist-key',
  name: 'Consider DISTKEY for joined columns',
  dialects: ['redshift'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const upper = sql.toUpperCase();

    if (/CREATE\s+TABLE/u.test(upper) && !/DISTKEY|DISTSTYLE/u.test(upper)) {
      suggestions.push({
        type: 'dialect-specific',
        severity: 'info',
        message:
          'Consider specifying DISTKEY or DISTSTYLE for this table. ' +
          'Choose a distribution key that matches commonly JOINed columns to minimize data movement.',
        ruleId: 'redshift-suggest-dist-key',
      });
    }
    return suggestions;
  },
};

/**
 * Suggests sort key for tables with common filter patterns.
 */
const suggestSortKey: AnalysisRule = {
  id: 'redshift-suggest-sort-key',
  name: 'Consider SORTKEY for filtered columns',
  dialects: ['redshift'],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const upper = sql.toUpperCase();

    if (
      /CREATE\s+TABLE/u.test(upper) &&
      !/SORTKEY|COMPOUND\s+SORTKEY|INTERLEAVED\s+SORTKEY/u.test(upper)
    ) {
      suggestions.push({
        type: 'dialect-specific',
        severity: 'info',
        message:
          'Consider adding SORTKEY for this table. ' +
          'A sort key on frequently filtered or joined columns enables zone map filtering and improves query speed.',
        ruleId: 'redshift-suggest-sort-key',
      });
    }
    return suggestions;
  },
};

export const redshiftRules: AnalysisRule[] = [suggestDistKey, suggestSortKey];
