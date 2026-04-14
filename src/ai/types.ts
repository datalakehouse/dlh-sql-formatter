/**
 * AI-powered suggestion and rewrite types for DLH SQL Formatter.
 * Supports multiple AI providers: Anthropic, OpenAI, Google Gemini, and custom.
 */

export type SuggestionSeverity = 'info' | 'warning' | 'error';

export type SuggestionType =
  | 'performance'
  | 'style'
  | 'security'
  | 'correctness'
  | 'best-practice'
  | 'dialect-specific';

export interface Suggestion {
  type: SuggestionType;
  severity: SuggestionSeverity;
  message: string;
  line?: number;
  column?: number;
  ruleId: string;
  fix?: string;
}

export interface SuggestResult {
  formatted: string;
  suggestions: Suggestion[];
}

export interface Optimization {
  type: SuggestionType;
  description: string;
  originalLine?: number;
  suggestedChange: string;
}

export interface RewriteResult {
  formatted: string;
  /** Which provider + model was used */
  provider?: string;
  model?: string;
  rewrite: {
    sql: string;
    explanation: string;
    optimizations: Optimization[];
  };
}

// ---------------------------------------------------------------------------
// Provider names
// ---------------------------------------------------------------------------

export type BuiltinProviderName = 'anthropic' | 'openai' | 'gemini' | 'rule-based';

/**
 * Any built-in name OR any arbitrary string for custom registered providers.
 * The (string & {}) trick gives autocomplete for known values while allowing any string.
 */
export type ProviderName = BuiltinProviderName | (string & {});

// ---------------------------------------------------------------------------
// Default models per provider
// ---------------------------------------------------------------------------

export const DEFAULT_MODELS: Record<BuiltinProviderName, string> = {
  'anthropic': 'claude-sonnet-4-20250514',
  'openai': 'gpt-4o',
  'gemini': 'gemini-2.0-flash',
  'rule-based': '',
};

/** Environment variable names checked per provider (in order) */
export const ENV_KEY_NAMES: Record<BuiltinProviderName, string[]> = {
  'anthropic': ['ANTHROPIC_API_KEY'],
  'openai': ['OPENAI_API_KEY'],
  'gemini': ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  'rule-based': [],
};

// ---------------------------------------------------------------------------
// AI configuration
// ---------------------------------------------------------------------------

export interface AIConfig {
  /**
   * AI provider to use.
   * Built-in: 'anthropic' | 'openai' | 'gemini' | 'deepseek' | 'rule-based'
   * Or any string matching a custom registered provider.
   */
  provider: ProviderName;

  /**
   * API key. Can also be set via environment variables per provider.
   */
  apiKey?: string;

  /**
   * Model override. Each provider has its own default — see DEFAULT_MODELS.
   */
  model?: string;

  /**
   * Base URL override for the API endpoint.
   * Useful for proxies, self-hosted models, or OpenAI-compatible APIs (e.g. Ollama).
   */
  baseUrl?: string;

  /** Features to enable */
  features: AIFeature[];

  /** SQL dialect for context-aware suggestions */
  dialect?: string;

  /** Additional provider-specific options (temperature, max_tokens, etc.) */
  providerOptions?: Record<string, unknown>;
}

export type AIFeature = 'suggest' | 'rewrite' | 'explain';

export interface AnalysisRule {
  id: string;
  name: string;
  dialects: string[];
  analyze: (sql: string, dialect?: string) => Suggestion[];
}

/** Interface that every AI provider must implement */
export interface AIProvider {
  readonly name: string;
  suggest(sql: string, dialect?: string): Promise<Suggestion[]>;
  rewrite(
    sql: string,
    dialect?: string
  ): Promise<{
    sql: string;
    explanation: string;
    optimizations: Optimization[];
  }>;
}

/** Factory function for creating provider instances */
export type AIProviderFactory = (
  apiKey: string,
  model?: string,
  baseUrl?: string,
  providerOptions?: Record<string, unknown>
) => AIProvider;
