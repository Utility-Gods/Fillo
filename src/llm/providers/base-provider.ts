import { FieldInfo } from '../../types';
import { PageContext } from '../../utils/context-extractor';

export interface LLMRequest {
  fieldInfo: FieldInfo;
  creativityLevel: number;
  context?: string;
  pageContext?: PageContext;
  previousGenerations?: string[];
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

  protected buildPrompt(fieldInfo: FieldInfo, creativityLevel: number, context?: string, pageContext?: PageContext, previousGenerations?: string[]): string {
    const creativityDescription = this.getCreativityDescription(creativityLevel);
    
    let contextualInfo = '';
    
    if (pageContext) {
      contextualInfo += `\nPage Context:`;
      contextualInfo += `\n- Page Title: ${pageContext.title}`;
      contextualInfo += `\n- URL: ${pageContext.url}`;
      
      if (pageContext.description) {
        contextualInfo += `\n- Description: ${pageContext.description}`;
      }
      
      if (pageContext.formPurpose) {
        contextualInfo += `\n- Form Purpose: ${pageContext.formPurpose}`;
      }
      
      if (pageContext.parentElements.length > 0) {
        contextualInfo += `\n- Form Structure: ${pageContext.parentElements.slice(0, 3).join(', ')}`;
      }
      
      if (pageContext.nearbyText) {
        contextualInfo += `\n- Nearby Text: ${pageContext.nearbyText.substring(0, 200)}`;
      }
      
      // Add form field context to understand relationships
      if (pageContext.formFields && pageContext.formFields.length > 0) {
        const relevantFields = pageContext.formFields
          .filter(f => f.value) // Only include filled fields
          .slice(0, 5); // Limit to 5 most relevant fields
        
        if (relevantFields.length > 0) {
          contextualInfo += `\n\nOther Form Fields (for context):`;
          relevantFields.forEach(field => {
            contextualInfo += `\n- ${field.label || field.name}: ${field.value}`;
          });
        }
      }
      
      // Add form HTML structure for better understanding
      if (pageContext.formHTML) {
        contextualInfo += `\n\nForm Structure Preview:\n${pageContext.formHTML.substring(0, 500)}...`;
      }
    }
    
    const basePrompt = `You are filling out a form field. Generate appropriate content that a USER would type into this field.

Field Details:
- Type: ${fieldInfo.type}
- Label: ${fieldInfo.label}
- Field Context: ${fieldInfo.context || 'general form'}
${context ? `- Additional Context: ${context}` : ''}

IMPORTANT CONTEXT (for understanding only - DO NOT include this information in your response):
${contextualInfo}

Based on the context above, this appears to be a form where users would enter ${this.inferUserIntent(fieldInfo, pageContext)}.

Creativity Level: ${creativityDescription}

RULES:
1. Generate ONLY what a user would actually type in this field
2. Do NOT include the website/app name, company name, or platform description
3. Do NOT describe the website or its features
4. Generate realistic ${this.getFieldTypeContext(fieldInfo.type)} that fits the form's purpose
5. ${creativityLevel < 0.5 ? 'Use common, typical examples' : creativityLevel < 1.0 ? 'Use realistic examples with some variety' : 'Use creative but realistic examples'}
6. Return ONLY the field content, no quotes or explanations${previousGenerations && previousGenerations.length > 0 ? `

Already generated (create something DIFFERENT):
${previousGenerations.map((gen, i) => `${i + 1}. "${gen}"`).join('\n')}` : ''}

Generate the field content:`;

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
      'name': 'a name (could be person, product, service, etc. based on context)',
      'email': 'email address',
      'phone': 'phone number',
      'address': 'street address',
      'city': 'city name',
      'zip': 'postal/zip code',
      'country': 'country name',
      'company': 'company or business name',
      'title': 'title or heading',
      'description': 'descriptive text',
      'bio': 'biography or about text',
      'url': 'website URL',
      'date': 'date',
      'age': 'age number',
      'textarea': 'detailed text content',
      'text': 'text content'
    };

    return contexts[fieldType] || 'appropriate content';
  }
  
  protected inferUserIntent(fieldInfo: FieldInfo, pageContext?: PageContext): string {
    const fieldLabel = fieldInfo.label.toLowerCase();
    const fieldType = fieldInfo.type.toLowerCase();
    
    // Infer based on field label
    if (fieldLabel.includes('product') && fieldLabel.includes('name')) {
      return 'actual product names they want to sell or showcase';
    } else if (fieldLabel.includes('catalog') && fieldLabel.includes('name')) {
      return 'names for their product catalogs';
    } else if (fieldLabel.includes('company') || fieldLabel.includes('business')) {
      return 'their company or business name';
    } else if (fieldLabel.includes('email')) {
      return 'their email address';
    } else if (fieldLabel.includes('phone')) {
      return 'their phone number';
    } else if (fieldLabel.includes('name') && fieldType === 'name') {
      // Check context to determine if it's a person name or other
      if (pageContext?.formPurpose === 'registration' || pageContext?.formPurpose === 'profile') {
        return 'their personal name';
      }
      return 'relevant names based on the form context';
    } else if (fieldLabel.includes('description')) {
      return 'descriptions or details';
    } else if (fieldLabel.includes('address')) {
      return 'their address';
    }
    
    // Default based on field type
    switch (fieldType) {
      case 'email':
        return 'their email address';
      case 'phone':
        return 'their phone number';
      case 'name':
        return 'appropriate names';
      case 'description':
      case 'textarea':
        return 'detailed information';
      default:
        return 'relevant information';
    }
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Log the prompt before sending to LLM
      const prompt = this.buildPrompt(
        request.fieldInfo,
        request.creativityLevel,
        request.context,
        request.pageContext,
        request.previousGenerations
      );
      
      console.log('=== LLM PROMPT ===');
      console.log(`Provider: ${this.getName()}`);
      console.log(`Model: ${this.model}`);
      console.log(`Field Type: ${request.fieldInfo.type}`);
      console.log(`Field Label: ${request.fieldInfo.label}`);
      console.log(`Creativity Level: ${request.creativityLevel}`);
      console.log('Full Prompt:');
      console.log(prompt);
      console.log('=== END PROMPT ===');
      
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