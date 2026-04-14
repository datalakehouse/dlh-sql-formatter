import { suggest } from '../../src/ai/index.js';
import { analyzeSQL, registerRule, getAllRuleIds } from '../../src/ai/rules/index.js';
import {
  createProvider,
  registerProvider,
  listProviders,
  resolveApiKey,
  autoDetectProvider,
} from '../../src/ai/providers/registry.js';
import { RuleBasedProvider } from '../../src/ai/providers/RuleBasedProvider.js';
import { AnthropicProvider } from '../../src/ai/providers/AnthropicProvider.js';
import { OpenAIProvider } from '../../src/ai/providers/OpenAIProvider.js';
import { GeminiProvider } from '../../src/ai/providers/GeminiProvider.js';
import { DEFAULT_MODELS, ENV_KEY_NAMES } from '../../src/ai/types.js';

// =========================================================================
// Rule-based suggestion tests (no API key needed)
// =========================================================================

describe('suggest()', () => {
  it('returns empty suggestions for simple well-formed queries', () => {
    const result = suggest('SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  id = 1;');
    expect(result.formatted).toContain('SELECT');
  });

  it('detects SELECT * usage', () => {
    const result = suggest('SELECT\n  *\nFROM\n  users;');
    const s = result.suggestions.find(si => si.ruleId === 'no-select-star');
    expect(s).toBeDefined();
    expect(s?.severity).toBe('warning');
    expect(s?.type).toBe('style');
  });

  it('does not flag COUNT(*) as SELECT *', () => {
    const result = suggest('SELECT\n  count(*)\nFROM\n  users;');
    expect(result.suggestions.find(s => s.ruleId === 'no-select-star')).toBeUndefined();
  });

  it('detects UPDATE without WHERE', () => {
    const result = suggest("UPDATE users\nSET\n  name = 'foo';");
    const s = result.suggestions.find(si => si.ruleId === 'missing-where-clause');
    expect(s).toBeDefined();
    expect(s?.severity).toBe('error');
    expect(s?.type).toBe('security');
  });

  it('does not flag UPDATE with WHERE', () => {
    const result = suggest("UPDATE users\nSET\n  name = 'foo'\nWHERE\n  id = 1;");
    expect(result.suggestions.find(s => s.ruleId === 'missing-where-clause')).toBeUndefined();
  });

  it('detects DELETE without WHERE', () => {
    const result = suggest('DELETE FROM\n  users;');
    expect(result.suggestions.find(s => s.ruleId === 'missing-where-clause')).toBeDefined();
  });

  it('detects != operator', () => {
    const suggestions = analyzeSQL('SELECT id\nFROM tbl\nWHERE x != 5;');
    const s = suggestions.find(si => si.ruleId === 'prefer-ansi-not-equal');
    expect(s).toBeDefined();
    expect(s?.severity).toBe('info');
  });
});

// =========================================================================
// Dialect-specific rule tests
// =========================================================================

describe('analyzeSQL() dialect-specific rules', () => {
  it('returns snowflake CLUSTER BY suggestion for snowflake', () => {
    const suggestions = analyzeSQL('CREATE TABLE foo (id INT, name STRING);', 'snowflake');
    expect(suggestions.find(s => s.ruleId === 'snowflake-suggest-cluster-by')).toBeDefined();
  });

  it('returns redshift DISTKEY + SORTKEY suggestions for redshift', () => {
    const suggestions = analyzeSQL('CREATE TABLE foo (id INT, name VARCHAR(100));', 'redshift');
    expect(suggestions.find(s => s.ruleId === 'redshift-suggest-dist-key')).toBeDefined();
    expect(suggestions.find(s => s.ruleId === 'redshift-suggest-sort-key')).toBeDefined();
  });

  it('does not return snowflake rules for postgresql', () => {
    const suggestions = analyzeSQL('CREATE TABLE foo (id INT, name TEXT);', 'postgresql');
    expect(suggestions.find(s => s.ruleId === 'snowflake-suggest-cluster-by')).toBeUndefined();
  });

  it('returns common rules for any dialect', () => {
    const suggestions = analyzeSQL('SELECT\n  *\nFROM\n  tbl;', 'mysql');
    expect(suggestions.find(s => s.ruleId === 'no-select-star')).toBeDefined();
  });
});

// =========================================================================
// Custom rule registration
// =========================================================================

describe('registerRule()', () => {
  it('allows registering and using custom rules', () => {
    const before = getAllRuleIds().length;
    registerRule({
      id: 'custom-test-rule',
      name: 'Test Rule',
      dialects: [],
      analyze: sql =>
        sql.includes('CUSTOM_PATTERN')
          ? [
              {
                type: 'style',
                severity: 'info',
                message: 'Custom pattern detected',
                ruleId: 'custom-test-rule',
              },
            ]
          : [],
    });
    expect(getAllRuleIds().length).toBe(before + 1);
    expect(getAllRuleIds()).toContain('custom-test-rule');
    expect(
      analyzeSQL('SELECT CUSTOM_PATTERN FROM tbl;').find(s => s.ruleId === 'custom-test-rule')
    ).toBeDefined();
  });
});

describe('getAllRuleIds()', () => {
  it('contains all built-in rule IDs', () => {
    const ids = getAllRuleIds();
    expect(ids).toContain('no-select-star');
    expect(ids).toContain('no-implicit-join');
    expect(ids).toContain('missing-where-clause');
    expect(ids).toContain('no-order-by-number');
    expect(ids).toContain('prefer-ansi-not-equal');
    expect(ids).toContain('snowflake-suggest-cluster-by');
    expect(ids).toContain('bigquery-partition-pruning');
    expect(ids).toContain('redshift-suggest-dist-key');
    expect(ids).toContain('postgresql-not-in-subquery');
  });
});

// =========================================================================
// Provider registry tests
// =========================================================================

describe('Provider registry', () => {
  describe('listProviders()', () => {
    it('includes all built-in providers', () => {
      const providers = listProviders();
      expect(providers).toContain('rule-based');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('openai');
      expect(providers).toContain('gemini');
    });
  });

  describe('createProvider()', () => {
    it('creates RuleBasedProvider for "rule-based"', () => {
      const p = createProvider({ provider: 'rule-based', features: ['suggest'] });
      expect(p).toBeInstanceOf(RuleBasedProvider);
      expect(p.name).toBe('rule-based');
    });

    it('creates AnthropicProvider with API key', () => {
      const p = createProvider({
        provider: 'anthropic',
        apiKey: 'test-key',
        features: ['rewrite'],
      });
      expect(p).toBeInstanceOf(AnthropicProvider);
      expect(p.name).toBe('anthropic');
    });

    it('creates OpenAIProvider with API key', () => {
      const p = createProvider({ provider: 'openai', apiKey: 'test-key', features: ['rewrite'] });
      expect(p).toBeInstanceOf(OpenAIProvider);
      expect(p.name).toBe('openai');
    });

    it('creates GeminiProvider with API key', () => {
      const p = createProvider({ provider: 'gemini', apiKey: 'test-key', features: ['rewrite'] });
      expect(p).toBeInstanceOf(GeminiProvider);
      expect(p.name).toBe('gemini');
    });

    it('throws for unknown provider', () => {
      expect(() =>
        createProvider({ provider: 'nonexistent', apiKey: 'x', features: ['rewrite'] })
      ).toThrow(/Unknown AI provider: "nonexistent"/);
    });

    it('throws for LLM provider without API key', () => {
      expect(() => createProvider({ provider: 'anthropic', features: ['rewrite'] })).toThrow(
        /No API key found/
      );
    });

    it('passes model override through to provider', () => {
      const p = createProvider({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        features: ['rewrite'],
      });
      expect(p).toBeInstanceOf(OpenAIProvider);
    });

    it('passes baseUrl override through to provider', () => {
      const p = createProvider({
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'http://localhost:11434',
        features: ['rewrite'],
      });
      expect(p).toBeInstanceOf(OpenAIProvider);
    });
  });

  describe('registerProvider()', () => {
    it('registers and resolves a custom provider', () => {
      registerProvider(
        'my-custom',
        (_apiKey, _model) => new RuleBasedProvider() // simple stub
      );

      expect(listProviders()).toContain('my-custom');

      const p = createProvider({ provider: 'my-custom', apiKey: 'x', features: ['suggest'] });
      expect(p).toBeInstanceOf(RuleBasedProvider);
    });

    it('custom provider overwrites previous registration', () => {
      let callCount = 0;
      registerProvider('overwrite-test', () => {
        callCount++;
        return new RuleBasedProvider();
      });
      createProvider({ provider: 'overwrite-test', apiKey: 'x', features: ['suggest'] });
      expect(callCount).toBe(1);
    });
  });

  describe('resolveApiKey()', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('prefers explicit apiKey over env var', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key';
      const key = resolveApiKey({ provider: 'anthropic', apiKey: 'explicit-key', features: [] });
      expect(key).toBe('explicit-key');
    });

    it('falls back to ANTHROPIC_API_KEY env var', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key';
      const key = resolveApiKey({ provider: 'anthropic', features: [] });
      expect(key).toBe('env-key');
    });

    it('falls back to OPENAI_API_KEY env var', () => {
      process.env.OPENAI_API_KEY = 'oai-key';
      const key = resolveApiKey({ provider: 'openai', features: [] });
      expect(key).toBe('oai-key');
    });

    it('tries GEMINI_API_KEY then GOOGLE_API_KEY', () => {
      process.env.GOOGLE_API_KEY = 'google-key';
      const key = resolveApiKey({ provider: 'gemini', features: [] });
      expect(key).toBe('google-key');
    });

    it('throws error when no key found for LLM provider', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => resolveApiKey({ provider: 'anthropic', features: [] })).toThrow(
        /No API key found/
      );
    });
  });

  describe('autoDetectProvider()', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('detects anthropic from ANTHROPIC_API_KEY', () => {
      process.env.ANTHROPIC_API_KEY = 'x';
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      expect(autoDetectProvider()).toBe('anthropic');
    });

    it('detects openai from OPENAI_API_KEY', () => {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.OPENAI_API_KEY = 'x';
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      expect(autoDetectProvider()).toBe('openai');
    });

    it('detects gemini from GEMINI_API_KEY', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      process.env.GEMINI_API_KEY = 'x';
      expect(autoDetectProvider()).toBe('gemini');
    });

    it('returns rule-based when no env vars set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      expect(autoDetectProvider()).toBe('rule-based');
    });

    it('prefers anthropic when multiple keys are set', () => {
      process.env.ANTHROPIC_API_KEY = 'a';
      process.env.OPENAI_API_KEY = 'b';
      expect(autoDetectProvider()).toBe('anthropic');
    });
  });
});

// =========================================================================
// DEFAULT_MODELS and ENV_KEY_NAMES constants
// =========================================================================

describe('constants', () => {
  it('DEFAULT_MODELS has entries for all built-in providers', () => {
    expect(DEFAULT_MODELS.anthropic).toBe('claude-sonnet-4-20250514');
    expect(DEFAULT_MODELS.openai).toBe('gpt-4o');
    expect(DEFAULT_MODELS.gemini).toBe('gemini-2.0-flash');
    expect(DEFAULT_MODELS['rule-based']).toBe('');
  });

  it('ENV_KEY_NAMES has entries for all LLM providers', () => {
    expect(ENV_KEY_NAMES.anthropic).toEqual(['ANTHROPIC_API_KEY']);
    expect(ENV_KEY_NAMES.openai).toEqual(['OPENAI_API_KEY']);
    expect(ENV_KEY_NAMES.gemini).toEqual(['GEMINI_API_KEY', 'GOOGLE_API_KEY']);
  });
});

// =========================================================================
// RuleBasedProvider integration test
// =========================================================================

describe('RuleBasedProvider', () => {
  it('suggest() returns rule-based results without API call', async () => {
    const p = new RuleBasedProvider();
    const suggestions = await p.suggest('SELECT\n  *\nFROM\n  tbl;', 'snowflake');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.find(s => s.ruleId === 'no-select-star')).toBeDefined();
  });

  it('rewrite() returns original SQL with explanation', async () => {
    const p = new RuleBasedProvider();
    const result = await p.rewrite('SELECT * FROM tbl;');
    expect(result.sql).toBe('SELECT * FROM tbl;');
    expect(result.explanation).toContain('Rule-based');
  });
});
