import { BaseLLMProvider, LLMRequest } from './base-provider';

export class GoogleProvider extends BaseLLMProvider {
  getName(): string {
    return 'Google';
  }

  getAvailableModels(): string[] {
    return ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        `${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Hello'
                  }
                ]
              }
            ],
            generationConfig: {
              maxOutputTokens: 5
            }
          }),
        }
      );

      const data = await response.json();
      return data.candidates && Array.isArray(data.candidates);
    } catch (error) {
      console.error('Google connection test failed:', error);
      return false;
    }
  }

  async generateContent(request: LLMRequest): Promise<string> {
    const prompt = this.buildPrompt(request.fieldInfo, request.creativityLevel, request.context);
    
    const response = await this.makeRequest(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a helpful assistant that generates realistic form field content. Always respond with just the requested content, no additional text or formatting.\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 150,
            temperature: Math.min(Math.max(request.creativityLevel, 0.1), 2.0),
            topP: 1,
            topK: 1
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        }),
      }
    );

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const candidate = data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Empty response generated');
    }

    const content = candidate.content.parts[0].text?.trim();
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