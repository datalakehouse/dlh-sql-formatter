import { BaseProvider } from '../../src/ai/providers/BaseProvider.js';
import { DEFAULT_REWRITE_SYSTEM_PROMPT } from '../../src/ai/defaultPrompts.js';
import { AIConfig } from '../../src/ai/types.js';

/**
 * Test subclass that captures the system prompt passed to callAPI.
 * Returns a canned JSON response so parseRewriteResponse is happy.
 */
class CapturingProvider extends BaseProvider {
  public captured: { system: string; user: string } | null = null;

  constructor(rewritePrompt?: AIConfig['rewritePrompt']) {
    super('capturing', 'test-key', 'test-model', 'http://localhost', {}, rewritePrompt);
  }

  protected async callAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    this.captured = { system: systemPrompt, user: userPrompt };
    return JSON.stringify({
      sql: 'SELECT 1;',
      explanation: 'stub',
      optimizations: [],
    });
  }

  // Expose the protected builder for direct assertion where rewrite() isn't needed.
  public buildPrompt(dialect?: string): string {
    return this.buildRewriteSystemPrompt(dialect);
  }
}

describe('buildRewriteSystemPrompt — rewritePrompt override modes', () => {
  it('uses the DLH default when no override is supplied', () => {
    const p = new CapturingProvider();
    expect(p.buildPrompt()).toBe(DEFAULT_REWRITE_SYSTEM_PROMPT);
  });

  it('appends the dialect line when a dialect is supplied', () => {
    const p = new CapturingProvider();
    const out = p.buildPrompt('snowflake');
    expect(out.startsWith(DEFAULT_REWRITE_SYSTEM_PROMPT)).toBe(true);
    expect(out).toContain('Target SQL dialect: snowflake');
  });

  it('mode "default" is equivalent to no override', () => {
    const p = new CapturingProvider({ mode: 'default', text: 'ignored' });
    expect(p.buildPrompt()).toBe(DEFAULT_REWRITE_SYSTEM_PROMPT);
  });

  it('mode "extend" appends the user text under an "Additional guidance" heading', () => {
    const p = new CapturingProvider({ mode: 'extend', text: 'Always prefer CTEs.' });
    const out = p.buildPrompt();
    expect(out.startsWith(DEFAULT_REWRITE_SYSTEM_PROMPT)).toBe(true);
    expect(out).toContain('Additional guidance:\nAlways prefer CTEs.');
  });

  it('mode "replace" uses the user text verbatim', () => {
    const replacement =
      'You are a terse SQL bot. Return {"sql":"","explanation":"","optimizations":[]}.';
    const p = new CapturingProvider({ mode: 'replace', text: replacement });
    expect(p.buildPrompt()).toBe(replacement);
  });

  it('mode "extend" with empty text falls back to the default', () => {
    const p = new CapturingProvider({ mode: 'extend', text: '   \n\t  ' });
    expect(p.buildPrompt()).toBe(DEFAULT_REWRITE_SYSTEM_PROMPT);
  });

  it('mode "replace" with empty text falls back to the default', () => {
    const p = new CapturingProvider({ mode: 'replace', text: '' });
    expect(p.buildPrompt()).toBe(DEFAULT_REWRITE_SYSTEM_PROMPT);
  });

  it('rewrite() sends the overridden system prompt to callAPI', async () => {
    const p = new CapturingProvider({ mode: 'extend', text: 'Bias toward window functions.' });
    await p.rewrite('SELECT 1', 'bigquery');
    const { captured } = p;
    if (!captured) {
      throw new Error('expected callAPI to have been invoked');
    }
    expect(captured.system).toContain('Target SQL dialect: bigquery');
    expect(captured.system).toContain('Additional guidance:\nBias toward window functions.');
  });
});
