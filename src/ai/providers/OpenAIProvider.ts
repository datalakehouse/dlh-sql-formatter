import { DEFAULT_MODELS, AIConfig } from '../types.js';
import { BaseProvider } from './BaseProvider.js';

const DEFAULT_BASE_URL = 'https://api.openai.com';

/**
 * OpenAI Chat Completions provider.
 * Also works with any OpenAI-compatible API (Azure OpenAI, Ollama, LM Studio, vLLM, etc.)
 * by setting baseUrl.
 */
export class OpenAIProvider extends BaseProvider {
  constructor(
    apiKey: string,
    model?: string,
    baseUrl?: string,
    providerOptions?: Record<string, unknown>,
    rewritePrompt?: AIConfig['rewritePrompt']
  ) {
    super(
      'openai',
      apiKey,
      model ?? DEFAULT_MODELS.openai,
      baseUrl ?? DEFAULT_BASE_URL,
      providerOptions,
      rewritePrompt
    );
  }

  protected async callAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: (this.providerOptions.max_tokens as number) ?? 4096,
        temperature: (this.providerOptions.temperature as number) ?? 0,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${body}`);
    }
    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    return content;
  }
}
