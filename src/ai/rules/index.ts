import { AnalysisRule, Suggestion } from '../types.js';
import { commonRules } from './common.js';
import { snowflakeRules } from './snowflake.js';
import { bigqueryRules } from './bigquery.js';
import { redshiftRules } from './redshift.js';
import { postgresqlRules } from './postgresql.js';

/** All registered analysis rules */
const allRules: AnalysisRule[] = [
  ...commonRules,
  ...snowflakeRules,
  ...bigqueryRules,
  ...redshiftRules,
  ...postgresqlRules,
];

/**
 * Returns all rules applicable to the given dialect.
 * Rules with empty dialects array apply to all dialects.
 */
export function getRulesForDialect(dialect?: string): AnalysisRule[] {
  return allRules.filter(
    rule => rule.dialects.length === 0 || (dialect && rule.dialects.includes(dialect))
  );
}

/**
 * Runs all applicable rules against the given SQL.
 */
export function analyzeSQL(sql: string, dialect?: string): Suggestion[] {
  const rules = getRulesForDialect(dialect);
  const suggestions: Suggestion[] = [];

  for (const rule of rules) {
    try {
      const ruleSuggestions = rule.analyze(sql, dialect);
      suggestions.push(...ruleSuggestions);
    } catch {
      // Silently skip rules that fail — don't block formatting
    }
  }

  // Sort by severity (error > warning > info), then by line number
  const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
  suggestions.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) {
      return sevDiff;
    }
    return (a.line ?? Infinity) - (b.line ?? Infinity);
  });

  return suggestions;
}

/**
 * Returns all available rule IDs.
 */
export function getAllRuleIds(): string[] {
  return allRules.map(r => r.id);
}

/**
 * Registers a custom rule.
 */
export function registerRule(rule: AnalysisRule): void {
  allRules.push(rule);
}
