import {
  AIProvider,
  AIConfig,
  Suggestion,
  Optimization,
  ENV_KEY_NAMES,
  BuiltinProviderName,
} from '../types.js';
import { analyzeSQL } from '../rules/index.js';
import { buildDefaultRewriteSystemPrompt } from '../defaultPrompts.js';

/**
 * Abstract base class for all LLM-backed providers.
 * Handles prompt construction, response parsing, and rule-based fallback.
 * Subclasses only need to implement callAPI().
 */
export abstract class BaseProvider implements AIProvider {
  readonly name: string;

  protected apiKey: string;
  protected model: string;
  protected baseUrl: string;
  protected providerOptions: Record<string, unknown>;
  protected rewritePrompt?: AIConfig['rewritePrompt'];

  constructor(
    name: string,
    apiKey: string,
    model: string,
    baseUrl: string,
    providerOptions: Record<string, unknown> = {},
    rewritePrompt?: AIConfig['rewritePrompt']
  ) {
    this.name = name;
    if (!apiKey) {
      const envNames = ENV_KEY_NAMES[name as BuiltinProviderName] ?? [];
      const envHint = envNames.length
        ? `environment variable ${envNames.map(n => `"${n}"`).join(' or ')}`
        : 'the appropriate environment variable';
      throw new Error(
        `API key is required for the "${name}" provider. ` +
          `Pass it via apiKey config, --ai-key flag, or set ${envHint}.`
      );
    }
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
    this.providerOptions = providerOptions;
    this.rewritePrompt = rewritePrompt;
  }

  async suggest(sql: string, dialect?: string): Promise<Suggestion[]> {
    const ruleSuggestions = analyzeSQL(sql, dialect);
    try {
      const aiSuggestions = await this.getAISuggestions(sql, dialect);
      return [...ruleSuggestions, ...aiSuggestions];
    } catch {
      return ruleSuggestions;
    }
  }

  async rewrite(
    sql: string,
    dialect?: string
  ): Promise<{ sql: string; explanation: string; optimizations: Optimization[] }> {
    const systemPrompt = this.buildRewriteSystemPrompt(dialect);
    const userPrompt = `Rewrite this ${
      dialect ?? 'SQL'
    } query for better performance and clarity:\n\n${sql}`;
    const response = await this.callAPI(systemPrompt, userPrompt);
    return this.parseRewriteResponse(response, sql);
  }

  // -----------------------------------------------------------------------
  // Subclasses implement this
  // -----------------------------------------------------------------------

  /**
   * Send a system + user prompt to the LLM and return the text response.
   */
  protected abstract callAPI(systemPrompt: string, userPrompt: string): Promise<string>;

  // -----------------------------------------------------------------------
  // Shared prompt builders
  // -----------------------------------------------------------------------

  private async getAISuggestions(sql: string, dialect?: string): Promise<Suggestion[]> {
    const systemPrompt = `You are an expert SQL analyst specializing in ${dialect ?? 'SQL'}.
Analyze the given SQL query and return a JSON array of suggestions.
Each suggestion should have: type (performance|style|security|correctness|best-practice|dialect-specific), severity (info|warning|error), message, ruleId (use "ai-" prefix), and optionally line (1-based).
Return ONLY the JSON array, no other text. No markdown fences.
Focus on actionable, specific suggestions. Don't repeat obvious things.`;
    const response = await this.callAPI(
      systemPrompt,
      `Analyze this SQL and return suggestions as a JSON array:\n\n${sql}`
    );
    return this.parseSuggestResponse(response);
  }

  protected buildRewriteSystemPrompt(dialect?: string): string {
    const def = buildDefaultRewriteSystemPrompt(dialect);
    const ov = this.rewritePrompt;
    const customText = ov?.text?.trim() ?? '';
    if (!ov || ov.mode === 'default' || !customText) {
      return def;
    }
    if (ov.mode === 'replace') {
      return customText;
    }
    return `${def}\n\nAdditional guidance:\n${customText}`;
  }

  // -----------------------------------------------------------------------
  // Shared response parsers
  // -----------------------------------------------------------------------

  protected parseSuggestResponse(response: string): Suggestion[] {
    try {
      const cleaned = response
        .replace(/```json\n?/gu, '')
        .replace(/```\n?/gu, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map((s: Record<string, unknown>) => ({
          type: (s.type as string) ?? 'best-practice',
          severity: (s.severity as string) ?? 'info',
          message: (s.message as string) ?? '',
          line: s.line as number | undefined,
          ruleId: (s.ruleId as string) ?? 'ai-suggestion',
        })) as Suggestion[];
      }
      return [];
    } catch {
      return [];
    }
  }

  protected parseRewriteResponse(
    response: string,
    originalSql: string
  ): { sql: string; explanation: string; optimizations: Optimization[] } {
    try {
      const cleaned = response
        .replace(/```json\n?/gu, '')
        .replace(/```\n?/gu, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return {
        sql: parsed.sql ?? originalSql,
        explanation: parsed.explanation ?? 'No explanation provided.',
        optimizations: Array.isArray(parsed.optimizations)
          ? parsed.optimizations.map((o: Record<string, unknown>) => ({
              type: (o.type as string) ?? 'performance',
              description: (o.description as string) ?? '',
              originalLine: o.originalLine as number | undefined,
              suggestedChange: (o.suggestedChange as string) ?? '',
            }))
          : [],
      };
    } catch {
      return { sql: originalSql, explanation: 'Failed to parse AI response.', optimizations: [] };
    }
  }
}
