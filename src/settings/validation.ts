export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class SettingsValidator {
  static validateApiKey(provider: string, apiKey: string): ValidationResult {
    if (!apiKey || apiKey.trim().length === 0) {
      return { isValid: false, error: 'API key is required' };
    }

    switch (provider) {
      case 'openai':
        return this.validateOpenAIKey(apiKey);
      case 'anthropic':
        return this.validateAnthropicKey(apiKey);
      case 'google':
        return this.validateGoogleKey(apiKey);
      case 'ollama':
        return this.validateOllamaKey(apiKey);
      default:
        return { isValid: false, error: 'Unknown provider' };
    }
  }

  private static validateOpenAIKey(apiKey: string): ValidationResult {
    // OpenAI keys start with 'sk-' and are typically 51 characters
    if (!apiKey.startsWith('sk-')) {
      return { isValid: false, error: 'OpenAI API keys must start with "sk-"' };
    }
    
    if (apiKey.length < 40) {
      return { isValid: false, error: 'OpenAI API key appears to be too short' };
    }

    return { isValid: true };
  }

  private static validateAnthropicKey(apiKey: string): ValidationResult {
    // Anthropic keys start with 'sk-ant-'
    if (!apiKey.startsWith('sk-ant-')) {
      return { isValid: false, error: 'Anthropic API keys must start with "sk-ant-"' };
    }
    
    if (apiKey.length < 40) {
      return { isValid: false, error: 'Anthropic API key appears to be too short' };
    }

    return { isValid: true };
  }

  private static validateGoogleKey(apiKey: string): ValidationResult {
    // Google API keys are typically 39 characters and alphanumeric
    if (apiKey.length < 30) {
      return { isValid: false, error: 'Google API key appears to be too short' };
    }

    if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) {
      return { isValid: false, error: 'Google API key contains invalid characters' };
    }

    return { isValid: true };
  }

  private static validateOllamaKey(apiKey: string): ValidationResult {
    // Ollama typically doesn't require API keys for local usage
    return { isValid: true };
  }

  static validateUrl(url: string): ValidationResult {
    if (!url || url.trim().length === 0) {
      return { isValid: false, error: 'URL is required' };
    }

    try {
      const urlObj = new URL(url);
      
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  static validateTemperature(temperature: number): ValidationResult {
    if (typeof temperature !== 'number' || isNaN(temperature)) {
      return { isValid: false, error: 'Temperature must be a number' };
    }

    if (temperature < 0.1 || temperature > 2.0) {
      return { isValid: false, error: 'Temperature must be between 0.1 and 2.0' };
    }

    return { isValid: true };
  }

  static validateCacheSettings(maxEntries: number, expirationDays: number): ValidationResult {
    if (typeof maxEntries !== 'number' || maxEntries < 100 || maxEntries > 100000) {
      return { isValid: false, error: 'Cache entries must be between 100 and 100,000' };
    }

    if (typeof expirationDays !== 'number' || expirationDays < 1 || expirationDays > 365) {
      return { isValid: false, error: 'Cache expiration must be between 1 and 365 days' };
    }

    return { isValid: true };
  }

  static async testConnection(provider: string, apiKey: string, baseUrl: string, model: string): Promise<ValidationResult> {
    try {
      const response = await this.makeTestRequest(provider, apiKey, baseUrl, model);
      
      if (response.ok) {
        return { isValid: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          isValid: false, 
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private static async makeTestRequest(provider: string, apiKey: string, baseUrl: string, model: string): Promise<Response> {
    const testPrompt = "Hello";
    
    switch (provider) {
      case 'openai':
        return fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 5,
            temperature: 0.1
          })
        });

      case 'anthropic':
        return fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 5,
            messages: [{ role: 'user', content: testPrompt }],
            temperature: 0.1
          })
        });

      case 'google':
        return fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: testPrompt }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0.1 }
          })
        });

      case 'ollama':
        return fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 5,
            temperature: 0.1
          })
        });

      default:
        throw new Error('Unknown provider');
    }
  }
}