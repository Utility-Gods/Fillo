import { BaseLLMProvider, LLMRequest } from './base-provider';

export class AnthropicProvider extends BaseLLMProvider {
  getName(): string {
    return 'Anthropic';
  }

  getAvailableModels(): string[] {
    return [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229', 
      'claude-3-opus-20240229',
      'claude-3-5-sonnet-20241022'
    ];
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 5,
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ]
        }),
      });

      const data = await response.json();
      return data.content && Array.isArray(data.content);
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }

  async generateContent(request: LLMRequest): Promise<string> {
    const prompt = this.buildPrompt(request.fieldInfo, request.creativityLevel, request.context, request.pageContext, request.previousGenerations);
    
    const response = await this.makeRequest(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 150,
        temperature: Math.min(Math.max(request.creativityLevel, 0.1), 1.0), // Anthropic max temp is 1.0
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: 'You are a helpful assistant that generates realistic form field content. Always respond with just the requested content, no additional text or formatting.'
      }),
    });

    const data = await response.json();
    
    if (!data.content || data.content.length === 0) {
      throw new Error('No response generated');
    }

    const content = data.content[0]?.text?.trim();
    if (!content) {
      throw new Error('Empty response generated');
    }

    return this.cleanResponse(content);
  }

  private cleanResponse(content: string): string {
    // Remove quotes if the entire response is wrapped in them
    if ((content.startsWith('"') && content.endsWith('"')) || 
        (content.startsWith("'") && content.endsWith("'"))) {
      content = content.slice(1, -1);
    }

    // Remove common prefixes that might be added despite instructions
    const prefixes = [
      'Content: ',
      'Field content: ',
      'Response: ',
      'Answer: ',
      'Generated content: '
    ];

    for (const prefix of prefixes) {
      if (content.toLowerCase().startsWith(prefix.toLowerCase())) {
        content = content.substring(prefix.length);
        break;
      }
    }

    return content.trim();
  }
}