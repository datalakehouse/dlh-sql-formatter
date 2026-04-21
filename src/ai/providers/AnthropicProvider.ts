import { DEFAULT_MODELS, AIConfig } from '../types.js';
import { BaseProvider } from './BaseProvider.js';

const DEFAULT_BASE_URL = 'https://api.anthropic.com';

export class AnthropicProvider extends BaseProvider {
  constructor(
    apiKey: string,
    model?: string,
    baseUrl?: string,
    providerOptions?: Record<string, unknown>,
    rewritePrompt?: AIConfig['rewritePrompt']
  ) {
    super(
      'anthropic',
      apiKey,
      model ?? DEFAULT_MODELS.anthropic,
      baseUrl ?? DEFAULT_BASE_URL,
      providerOptions,
      rewritePrompt
    );
  }

  protected async callAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: (this.providerOptions.max_tokens as number) ?? 4096,
        temperature: (this.providerOptions.temperature as number) ?? 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${body}`);
    }
    const data = (await response.json()) as { content: Array<{ type: string; text?: string }> };
    const text = data.content.find(b => b.type === 'text');
    if (!text?.text) {
      throw new Error('No text content in Anthropic response');
    }
    return text.text;
  }
}
