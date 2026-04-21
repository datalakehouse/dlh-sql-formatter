/**
 * AI-powered features for DLH SQL Formatter.
 *
 * Supports multiple AI providers out of the box:
 *   - **anthropic** — Claude (default: claude-sonnet-4-20250514)
 *   - **openai**    — GPT-4o / ChatGPT / any OpenAI-compatible API
 *   - **gemini**    — Google Gemini
 *   - **rule-based** — Local heuristic rules, no API key needed
 *
 * Custom providers can be registered with `registerProvider()`.
 *
 * @example
 * ```ts
 * import { format } from '@dlh.io/dlh-sql-formatter';
 * import { suggest, withAI, registerProvider } from '@dlh.io/dlh-sql-formatter/ai';
 *
 * // Tier 1: Rule-based suggestions (no API key)
 * const result = suggest(format(sql), { dialect: 'snowflake' });
 *
 * // Tier 2: AI-powered rewrite — pick your provider
 * const r1 = await withAI(format(sql), {
 *   provider: 'anthropic',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   features: ['rewrite'],
 *   dialect: 'snowflake',
 * });
 *
 * const r2 = await withAI(format(sql), {
 *   provider: 'openai',
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4o-mini',          // override default model
 *   features: ['rewrite'],
 * });
 *
 * const r3 = await withAI(format(sql), {
 *   provider: 'gemini',
 *   apiKey: process.env.GEMINI_API_KEY,
 *   features: ['suggest'],
 * });
 *
 * // Custom provider (e.g. Ollama running locally)
 * import { OpenAIProvider } from '@dlh.io/dlh-sql-formatter/ai';
 * registerProvider('ollama', (apiKey, model, baseUrl) =>
 *   new OpenAIProvider(apiKey || 'ollama', model || 'llama3', baseUrl || 'http://localhost:11434')
 * );
 * const r4 = await withAI(format(sql), {
 *   provider: 'ollama',
 *   features: ['rewrite'],
 * });
 * ```
 */

// ---------------------------------------------------------------------------
// Type re-exports
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// High-level API
// ---------------------------------------------------------------------------
import { SuggestResult, RewriteResult, AIConfig } from './types.js';
import { analyzeSQL } from './rules/index.js';
import { createProvider } from './providers/registry.js';

export type {
  Suggestion,
  SuggestionSeverity,
  SuggestionType,
  SuggestResult,
  RewriteResult,
  Optimization,
  AIConfig,
  AIFeature,
  AIProvider,
  AIProviderFactory,
  AnalysisRule,
  ProviderName,
  BuiltinProviderName,
} from './types.js';

export { DEFAULT_MODELS, ENV_KEY_NAMES } from './types.js';

// ---------------------------------------------------------------------------
// Default prompt (so consumers can display / extend it)
// ---------------------------------------------------------------------------
export {
  DEFAULT_REWRITE_SYSTEM_PROMPT,
  buildDefaultRewriteSystemPrompt,
} from './defaultPrompts.js';

// ---------------------------------------------------------------------------
// Rule engine re-exports
// ---------------------------------------------------------------------------
export { analyzeSQL, getRulesForDialect, getAllRuleIds, registerRule } from './rules/index.js';

// ---------------------------------------------------------------------------
// Provider re-exports (so users can extend or instantiate directly)
// ---------------------------------------------------------------------------
export { BaseProvider } from './providers/BaseProvider.js';
export { RuleBasedProvider } from './providers/RuleBasedProvider.js';
export { AnthropicProvider } from './providers/AnthropicProvider.js';
export { OpenAIProvider } from './providers/OpenAIProvider.js';
export { GeminiProvider } from './providers/GeminiProvider.js';

// ---------------------------------------------------------------------------
// Registry re-exports
// ---------------------------------------------------------------------------
export {
  registerProvider,
  listProviders,
  createProvider,
  resolveApiKey,
  autoDetectProvider,
} from './providers/registry.js';

/**
 * Analyze SQL using built-in rules and return suggestions.
 * Does NOT require an API key — all analysis is local.
 */
export function suggest(formattedSql: string, options: { dialect?: string } = {}): SuggestResult {
  return {
    formatted: formattedSql,
    suggestions: analyzeSQL(formattedSql, options.dialect),
  };
}

/**
 * Enhance formatted SQL with AI-powered analysis and rewriting.
 * Supports multiple providers — see AIConfig.provider.
 */
export async function withAI(formattedSql: string, config: AIConfig): Promise<RewriteResult> {
  const provider = createProvider(config);

  if (config.features.includes('rewrite')) {
    const rewrite = await provider.rewrite(formattedSql, config.dialect);
    return {
      formatted: formattedSql,
      provider: provider.name,
      model: config.model,
      rewrite,
    };
  }

  if (config.features.includes('suggest')) {
    const suggestions = await provider.suggest(formattedSql, config.dialect);
    return {
      formatted: formattedSql,
      provider: provider.name,
      model: config.model,
      rewrite: {
        sql: formattedSql,
        explanation: 'Suggestions only (no rewrite requested).',
        optimizations: suggestions.map(s => ({
          type: s.type,
          description: s.message,
          originalLine: s.line,
          suggestedChange: s.fix ?? '',
        })),
      },
    };
  }

  return {
    formatted: formattedSql,
    provider: provider.name,
    rewrite: { sql: formattedSql, explanation: 'No AI features requested.', optimizations: [] },
  };
}
