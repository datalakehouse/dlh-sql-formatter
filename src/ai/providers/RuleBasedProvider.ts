import { AIProvider, Suggestion, Optimization } from '../types.js';
import { analyzeSQL } from '../rules/index.js';

export class RuleBasedProvider implements AIProvider {
  readonly name = 'rule-based';

  async suggest(sql: string, dialect?: string): Promise<Suggestion[]> {
    return analyzeSQL(sql, dialect);
  }

  async rewrite(
    sql: string,
    dialect?: string
  ): Promise<{ sql: string; explanation: string; optimizations: Optimization[] }> {
    const suggestions = analyzeSQL(sql, dialect);
    return {
      sql,
      explanation:
        'Rule-based analysis cannot rewrite SQL. Use an LLM provider (anthropic, openai, gemini, deepseek) for AI-powered rewrites.',
      optimizations: suggestions.map((s: { type: any; message: any; line?: any; fix?: any }) => ({
        type: s.type,
        description: s.message,
        originalLine: s.line ?? undefined,
        suggestedChange: s.fix ?? '',
      })),
    };
  }
}
