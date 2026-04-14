import { DEFAULT_MODELS } from '../types.js';
import { BaseProvider } from './BaseProvider.js';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

/**
 * Google Gemini provider via the generateContent REST API.
 */
export class GeminiProvider extends BaseProvider {
  constructor(
    apiKey: string,
    model?: string,
    baseUrl?: string,
    providerOptions?: Record<string, unknown>
  ) {
    super(
      'gemini',
      apiKey,
      model ?? DEFAULT_MODELS.gemini,
      baseUrl ?? DEFAULT_BASE_URL,
      providerOptions
    );
  }

  protected async callAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: (this.providerOptions.temperature as number) ?? 0,
          maxOutputTokens: (this.providerOptions.max_tokens as number) ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No text content in Gemini response');
    }
    return text;
  }
}
