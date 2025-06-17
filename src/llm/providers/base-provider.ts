import { FieldInfo } from '../../types';

export interface LLMRequest {
  fieldInfo: FieldInfo;
  creativityLevel: number;
  context?: string;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  creativityLevel: number;
  cached: boolean;
}

export abstract class BaseLLMProvider {
  protected apiKey: string;
  protected baseUrl: string;
  protected model: string;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  abstract getName(): string;
  abstract getAvailableModels(): string[];
  abstract testConnection(): Promise<boolean>;
  abstract generateContent(request: LLMRequest): Promise<string>;

  protected buildPrompt(fieldInfo: FieldInfo, creativityLevel: number, context?: string): string {
    const creativityDescription = this.getCreativityDescription(creativityLevel);
    
    const basePrompt = `Generate appropriate content for a form field with the following details:

Field Type: ${fieldInfo.type}
Field Label: ${fieldInfo.label}
Context: ${fieldInfo.context || 'general form'}
${context ? `Additional Context: ${context}` : ''}

Creativity Level: ${creativityDescription}

Requirements:
- Generate realistic, appropriate content for this field
- Content should match the field type and context
- ${creativityLevel < 0.5 ? 'Be conservative and predictable' : creativityLevel < 1.0 ? 'Balance realism with some variation' : 'Be creative while maintaining appropriateness'}
- Return ONLY the content for the field, no explanations or quotes
- Keep it concise and relevant

Content:`;

    return basePrompt;
  }

  protected getCreativityDescription(level: number): string {
    if (level <= 0.3) return 'Very Predictable - Use common, standard responses';
    if (level <= 0.5) return 'Predictable - Use typical responses with minimal variation';
    if (level <= 0.8) return 'Balanced - Mix standard responses with some variation';
    if (level <= 1.2) return 'Creative - Use varied, interesting responses';
    if (level <= 1.5) return 'Very Creative - Use unique, diverse responses';
    return 'Experimental - Use highly creative, unexpected responses';
  }

  protected getFieldTypeContext(fieldType: string): string {
    const contexts: Record<string, string> = {
      'name': 'person name (first and last)',
      'email': 'valid email address',
      'phone': 'phone number in appropriate format',
      'address': 'street address',
      'city': 'city name',
      'zip': 'postal/zip code',
      'country': 'country name',
      'company': 'company or organization name',
      'title': 'job title or position',
      'description': 'descriptive text paragraph',
      'bio': 'personal or professional biography',
      'url': 'website URL',
      'date': 'date in appropriate format',
      'age': 'age number',
      'textarea': 'longer form text content',
      'text': 'general text input'
    };

    return contexts[fieldType] || 'appropriate text content';
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      const content = await this.generateContent(request);
      
      return {
        content: content.trim(),
        provider: this.getName(),
        model: this.model,
        creativityLevel: request.creativityLevel,
        cached: false
      };
    } catch (error) {
      throw new Error(`${this.getName()} generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setModel(model: string): void {
    this.model = model;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }
}