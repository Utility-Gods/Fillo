import { BaseLLMProvider, LLMRequest } from './base-provider';

export class OpenAIProvider extends BaseLLMProvider {
  getName(): string {
    return 'OpenAI';
  }

  getAvailableModels(): string[] {
    return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return Array.isArray(data.data) && data.data.length > 0;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  async generateContent(request: LLMRequest): Promise<string> {
    const prompt = this.buildPrompt(request.fieldInfo, request.creativityLevel, request.context, request.pageContext);
    
    const response = await this.makeRequest(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates realistic form field content. Always respond with just the requested content, no additional text or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: Math.min(Math.max(request.creativityLevel, 0.1), 2.0),
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response generated');
    }

    const content = data.choices[0].message?.content?.trim();
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