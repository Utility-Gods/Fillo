import { BaseLLMProvider, LLMRequest } from './base-provider';

export class OllamaProvider extends BaseLLMProvider {
  getName(): string {
    return 'Ollama';
  }

  getAvailableModels(): string[] {
    return ['llama2', 'llama2:13b', 'codellama', 'mistral', 'mixtral', 'neural-chat', 'starling-lm'];
  }

  async testConnection(): Promise<boolean> {
    try {
      // First try to get available models
      const modelsResponse = await this.makeRequest(`${this.baseUrl.replace('/v1', '')}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const modelsData = await modelsResponse.json();
      
      // If we can get models, try a simple generation
      if (modelsData.models && Array.isArray(modelsData.models)) {
        const response = await this.makeRequest(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'user',
                content: 'Hello'
              }
            ],
            max_tokens: 5,
            temperature: 0.1
          }),
        });

        const data = await response.json();
        return data.choices && Array.isArray(data.choices);
      }
      
      return false;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  async generateContent(request: LLMRequest): Promise<string> {
    const prompt = this.buildPrompt(request.fieldInfo, request.creativityLevel, request.context);
    
    const response = await this.makeRequest(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
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
        stream: false
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

  async getAvailableModelsFromServer(): Promise<string[]> {
    try {
      const response = await this.makeRequest(`${this.baseUrl.replace('/v1', '')}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.models && Array.isArray(data.models)) {
        return data.models.map((model: any) => model.name);
      }
      
      return this.getAvailableModels(); // fallback to default list
    } catch (error) {
      console.error('Failed to get Ollama models:', error);
      return this.getAvailableModels(); // fallback to default list
    }
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