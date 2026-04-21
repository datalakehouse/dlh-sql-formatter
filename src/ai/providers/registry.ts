import {
  AIProvider,
  AIProviderFactory,
  AIConfig,
  ProviderName,
  DEFAULT_MODELS,
  ENV_KEY_NAMES,
  BuiltinProviderName,
} from '../types.js';
import { RuleBasedProvider } from './RuleBasedProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { GeminiProvider } from './GeminiProvider.js';

// ---------------------------------------------------------------------------
// Custom provider registry
// ---------------------------------------------------------------------------

const customProviders = new Map<string, AIProviderFactory>();

/**
 * Register a custom AI provider factory.
 *
 * @example
 * ```ts
 * registerProvider('ollama', (apiKey, model, baseUrl) => {
 *   // Ollama is OpenAI-compatible, so reuse OpenAIProvider with a custom base URL
 *   return new OpenAIProvider(apiKey || 'ollama', model || 'llama3', baseUrl || 'http://localhost:11434');
 * });
 * ```
 */
export function registerProvider(name: string, factory: AIProviderFactory): void {
  customProviders.set(name, factory);
}

/**
 * List all available provider names (built-in + custom registered).
 */
export function listProviders(): string[] {
  return ['rule-based', 'anthropic', 'openai', 'gemini', ...customProviders.keys()];
}

// ---------------------------------------------------------------------------
// Resolve API key from config or environment
// ---------------------------------------------------------------------------

/**
 * Resolve the API key.
 * Priority: explicit config.apiKey > ~/.dlh-sql-formatter/config.json > environment variable.
 * Throws if provider requires a key and none is found.
 */
export function resolveApiKey(config: AIConfig): string {
  // 1. Explicit apiKey passed in config
  if (config.apiKey) {
    return config.apiKey;
  }

  // 2. Global config file: ~/.dlh-sql-formatter/config.json
  try {
    if (typeof process !== 'undefined') {
      // eslint-disable-next-line global-require
      const os = require('os');
      // eslint-disable-next-line global-require
      const fs = require('fs');
      // eslint-disable-next-line global-require
      const path = require('path');
      const cfgPath = path.join(os.homedir(), '.dlh-sql-formatter', 'config.json');
      const globalCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      const savedKey = globalCfg?.ai?.keys?.[config.provider];
      if (savedKey) {
        return savedKey;
      }
    }
  } catch {
    // No global config or not readable — fall through
  }

  // 3. Environment variables
  const envNames = ENV_KEY_NAMES[config.provider as BuiltinProviderName] ?? [];
  for (const envName of envNames) {
    const val = typeof process !== 'undefined' ? process.env[envName] : undefined;
    if (val) {
      return val;
    }
  }

  // 4. Error — no key found for a provider that needs one
  if (config.provider !== 'rule-based') {
    const envHint = envNames.length > 0 ? envNames.join(' or ') : `<PROVIDER>_API_KEY`;
    throw new Error(
      `No API key found for provider "${config.provider}".\n` +
        `Set it once:   dlh-sql-formatter config set-key ${config.provider} <your-key>\n` +
        `Or env var:    export ${envHint}=<your-key>\n` +
        `Or pass it:    withAI(sql, { provider: '${config.provider}', apiKey: '<key>', ... })`
    );
  }

  return '';
}

/**
 * Auto-detect which provider to use based on which env vars are set.
 * Returns the first provider whose API key env var is present.
 * Falls back to 'rule-based' if none found.
 */
export function autoDetectProvider(): ProviderName {
  if (typeof process === 'undefined') {
    return 'rule-based';
  }

  const order: ProviderName[] = ['anthropic', 'openai', 'gemini', 'deepseek'];
  for (const provider of order) {
    const envNames: string[] = ENV_KEY_NAMES[provider as BuiltinProviderName] ?? [];
    for (const envName of envNames) {
      if (process.env[envName]) {
        return provider;
      }
    }
  }
  return 'rule-based';
}

// ---------------------------------------------------------------------------
// Create provider instance from config
// ---------------------------------------------------------------------------

/**
 * Create an AIProvider instance from the given config.
 * Handles built-in providers and custom registered providers.
 */
export function createProvider(config: AIConfig): AIProvider {
  const apiKey = resolveApiKey(config);
  const model = config.model ?? DEFAULT_MODELS[config.provider as BuiltinProviderName] ?? '';
  const { baseUrl, rewritePrompt } = config;
  const opts = config.providerOptions ?? {};

  switch (config.provider) {
    case 'rule-based':
      return new RuleBasedProvider();
    case 'anthropic':
      return new AnthropicProvider(apiKey, model, baseUrl, opts, rewritePrompt);
    case 'openai':
      return new OpenAIProvider(apiKey, model, baseUrl, opts, rewritePrompt);
    case 'gemini':
      return new GeminiProvider(apiKey, model, baseUrl, opts, rewritePrompt);
    default: {
      const factory = customProviders.get(config.provider);
      if (factory) {
        return factory(apiKey, model, baseUrl, opts, rewritePrompt);
      }
      throw new Error(
        `Unknown AI provider: "${config.provider}". ` +
          `Available providers: ${listProviders().join(', ')}. ` +
          'Register a custom provider with registerProvider().'
      );
    }
  }
}
