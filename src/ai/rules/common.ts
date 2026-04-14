import { AnalysisRule, Suggestion } from '../types.js';

/**
 * Detects SELECT * usage in queries.
 */
const selectStarRule: AnalysisRule = {
  id: 'no-select-star',
  name: 'Avoid SELECT *',
  dialects: [],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const lines = sql.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match "SELECT" followed by "*" (possibly with whitespace)
      // but not inside comments or strings
      if (/^\*$/u.test(line) || /^SELECT\s+\*/iu.test(line)) {
        // Check context: is this inside a COUNT(*) or similar?
        const fullContext = lines.slice(Math.max(0, i - 1), i + 1).join(' ');
        if (/\w+\s*\(\s*\*\s*\)/u.test(fullContext)) {
          continue; // skip COUNT(*), SUM(*), etc.
        }
        suggestions.push({
          type: 'style',
          severity: 'warning',
          message:
            'Avoid SELECT * in production queries. Enumerate columns explicitly for clarity and performance.',
          line: i + 1,
          ruleId: 'no-select-star',
        });
      }
    }
    return suggestions;
  },
};

/**
 * Detects implicit comma joins (FROM a, b WHERE a.id = b.id)
 */
const implicitJoinRule: AnalysisRule = {
  id: 'no-implicit-join',
  name: 'Prefer explicit JOIN over comma join',
  dialects: [],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const lines = sql.split('\n');

    let inFromClause = false;
    let commaAfterFrom = false;
    let fromLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim().toUpperCase();

      if (/^FROM\b/u.test(trimmed)) {
        inFromClause = true;
        fromLine = i;
        commaAfterFrom = false;
        continue;
      }

      // End of FROM clause
      if (
        inFromClause &&
        /^(WHERE|GROUP|HAVING|ORDER|LIMIT|UNION|EXCEPT|INTERSECT|;)\b/u.test(trimmed)
      ) {
        inFromClause = false;
        continue;
      }

      if (inFromClause && lines[i].includes(',')) {
        commaAfterFrom = true;
      }

      if (!inFromClause && commaAfterFrom) {
        // Check if there is a WHERE clause with join condition
        if (/^WHERE\b/u.test(trimmed)) {
          suggestions.push({
            type: 'style',
            severity: 'warning',
            message:
              'Use explicit JOIN syntax instead of comma-separated tables in FROM clause. ' +
              'Explicit JOINs make the query intent clearer and help prevent accidental cross joins.',
            line: fromLine + 1,
            ruleId: 'no-implicit-join',
          });
        }
        commaAfterFrom = false;
      }
    }
    return suggestions;
  },
};

/**
 * Detects UPDATE/DELETE without WHERE clause
 */
const missingWhereRule: AnalysisRule = {
  id: 'missing-where-clause',
  name: 'UPDATE/DELETE without WHERE',
  dialects: [],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const lines = sql.split('\n');

    let inUpdateOrDelete = false;
    let hasWhere = false;
    let statementLine = -1;
    let statementType = '';

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim().toUpperCase();

      if (/^(UPDATE|DELETE\s+FROM|DELETE)\b/u.test(trimmed)) {
        // Finish previous statement check
        if (inUpdateOrDelete && !hasWhere) {
          suggestions.push({
            type: 'security',
            severity: 'error',
            message: `${statementType} statement without WHERE clause will affect all rows. Add a WHERE clause to limit the scope.`,
            line: statementLine + 1,
            ruleId: 'missing-where-clause',
          });
        }
        inUpdateOrDelete = true;
        hasWhere = false;
        statementLine = i;
        statementType = trimmed.startsWith('DELETE') ? 'DELETE' : 'UPDATE';
        continue;
      }

      if (inUpdateOrDelete && /^WHERE\b/u.test(trimmed)) {
        hasWhere = true;
      }

      // End of statement
      if (inUpdateOrDelete && (trimmed.endsWith(';') || i === lines.length - 1)) {
        if (!hasWhere) {
          suggestions.push({
            type: 'security',
            severity: 'error',
            message: `${statementType} statement without WHERE clause will affect all rows. Add a WHERE clause to limit the scope.`,
            line: statementLine + 1,
            ruleId: 'missing-where-clause',
          });
        }
        inUpdateOrDelete = false;
        hasWhere = false;
      }
    }
    return suggestions;
  },
};

/**
 * Detects ORDER BY with numbers instead of column names
 */
const orderByNumberRule: AnalysisRule = {
  id: 'no-order-by-number',
  name: 'Avoid ORDER BY column number',
  dialects: [],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const lines = sql.split('\n');

    let inOrderBy = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim().toUpperCase();

      if (/^ORDER\s+BY\b/u.test(trimmed)) {
        inOrderBy = true;
        continue;
      }

      if (inOrderBy && /^(LIMIT|OFFSET|FETCH|UNION|EXCEPT|INTERSECT|;|\))/u.test(trimmed)) {
        inOrderBy = false;
        continue;
      }

      if (inOrderBy) {
        // Check for bare numbers (not in expressions like col + 1)
        const stripped = lines[i].replace(/'[^']*'/gu, '').replace(/"[^"]*"/gu, '');
        if (/^\s*\d+\s*[,;]?\s*(ASC|DESC)?\s*[,;]?\s*$/iu.test(stripped)) {
          suggestions.push({
            type: 'style',
            severity: 'info',
            message:
              'Use column names instead of numbers in ORDER BY. Column numbers are fragile and break when SELECT columns change.',
            line: i + 1,
            ruleId: 'no-order-by-number',
          });
        }
      }
    }
    return suggestions;
  },
};

/**
 * Detects != instead of <> (ANSI standard)
 */
const ansiNotEqualRule: AnalysisRule = {
  id: 'prefer-ansi-not-equal',
  name: 'Prefer <> over !=',
  dialects: [],
  analyze: (sql: string): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const lines = sql.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Strip strings and comments
      const stripped = line
        .replace(/'[^']*'/gu, '')
        .replace(/--.*$/u, '')
        .replace(/\/\*.*?\*\//gu, '');
      if (/!=/u.test(stripped)) {
        suggestions.push({
          type: 'style',
          severity: 'info',
          message: 'Consider using <> instead of != for ANSI SQL compliance.',
          line: i + 1,
          ruleId: 'prefer-ansi-not-equal',
        });
      }
    }
    return suggestions;
  },
};

/** All common (cross-dialect) rules */
export const commonRules: AnalysisRule[] = [
  selectStarRule,
  implicitJoinRule,
  missingWhereRule,
  orderByNumberRule,
  ansiNotEqualRule,
];
