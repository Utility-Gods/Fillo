import { BaseImageGenerator, ImageGenerationRequest, ImageGenerationResponse } from './image-generator';

export class OpenAIImageGenerator extends BaseImageGenerator {
  constructor(apiKey: string, model: string = 'gpt-image-1') {
    super(apiKey, 'https://api.openai.com/v1', model);
  }

  getName(): string {
    return 'OpenAI Image Generation';
  }

  getAvailableModels(): string[] {
    return ['gpt-image-1'];
  }

  getSupportedSizes(): string[] {
    return [
      'auto',
      '1024x1024',
      '1536x1024',
      '1024x1536'
    ];
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
      console.error('OpenAI image generation connection test failed:', error);
      return false;
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const size = request.size || 'auto';
    const quality = request.quality || 'auto';
    
    // Log the image generation prompt
    console.log('=== IMAGE GENERATION PROMPT ===');
    console.log(`Provider: OpenAI (DALL-E)`);
    console.log(`Model: ${this.model}`);
    console.log(`Size: ${size}`);
    console.log(`Quality: ${quality}`);
    console.log(`Creativity: ${request.creativity || 'default'}`);
    console.log('Full Prompt:');
    console.log(request.prompt);
    console.log('=== END IMAGE PROMPT ===');
    
    const requestBody: any = {
      model: this.model, // gpt-image-1
      prompt: request.prompt,
      n: 1,
      size: size
    };

    // Add quality parameter for gpt-image-1
    if (quality && quality !== 'standard') {
      requestBody.quality = quality;
    }
    
    const response = await this.makeRequest(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No image generated');
    }

    const imageData = data.data[0];
    
    // gpt-image-1 always returns base64, no URL
    const base64Data = imageData.b64_json;
    const imageUrl = `data:image/png;base64,${base64Data}`;
    
    return {
      url: imageUrl,
      data: base64Data,
      prompt: request.prompt,
      size: size,
      revised_prompt: imageData.revised_prompt
    };
  }

  async generateImageForField(fieldInfo: any, creativity: number = 0.7): Promise<File> {
    const prompt = this.buildPrompt(fieldInfo, creativity);
    
    const imageResponse = await this.generateImage({
      prompt,
      size: '1024x1024',
      quality: 'standard',
      creativity
    });

    const filename = `${fieldInfo.type}-${Date.now()}.png`;
    return await this.downloadImageAsFile(imageResponse.url, filename);
  }

  async fillImageField(fieldInfo: any, creativity: number = 0.7): Promise<void> {
    if (fieldInfo.type !== 'image' && fieldInfo.type !== 'file') {
      throw new Error('Field is not an image upload field');
    }

    const file = await this.generateImageForField(fieldInfo, creativity);
    const input = fieldInfo.element as HTMLInputElement;
    await this.setFileToInput(file, input);
  }

  protected buildPrompt(fieldInfo: any, creativity: number, previousPrompts?: string[]): string {
    const label = fieldInfo.label || '';
    const context = fieldInfo.context || '';
    const pageContext = fieldInfo.pageContext;
    
    // Build comprehensive context
    let contextInfo = '\nCONTEXT FOR IMAGE GENERATION:\n';
    
    if (pageContext) {
      contextInfo += `- Page: ${pageContext.title}\n`;
      contextInfo += `- URL: ${pageContext.url}\n`;
      
      if (pageContext.description) {
        contextInfo += `- Description: ${pageContext.description}\n`;
      }
      
      if (pageContext.formPurpose) {
        contextInfo += `- Form Purpose: ${pageContext.formPurpose}\n`;
      }
      
      // Include current form field values for better context
      if (pageContext.formFields && pageContext.formFields.length > 0) {
        const filledFields = pageContext.formFields
          .filter((f: any) => f.value && f.label)
          .slice(0, 5);
          
        if (filledFields.length > 0) {
          contextInfo += `\nOther filled form fields (for context):\n`;
          filledFields.forEach((field: any) => {
            contextInfo += `- ${field.label}: ${field.value}\n`;
          });
        }
      }
    }
    
    // Determine what type of image based on all context
    let imageType = this.determineImageType(label, context, pageContext);
    let specificRequirements = this.getSpecificRequirements(imageType, pageContext);
    
    const creativityDescription = this.getCreativityDescription(creativity);
    
    // Build the main prompt
    let prompt = `You need to generate an image for a form field.

Field Details:
- Field Type: ${fieldInfo.type}
- Field Label: ${label}
- Form Context: ${context}
${contextInfo}

Based on this context, generate: ${imageType}
${specificRequirements}

Creativity Level: ${creativityDescription}

IMPORTANT RULES:
1. NO TEXT, WORDS, LETTERS, OR NUMBERS in the image
2. Focus on visual elements only
3. Image should be contextually appropriate for the form and page
4. Professional quality suitable for web use
5. Good contrast and clarity`;

    // Add previous prompts if any to avoid repetition
    if (previousPrompts && previousPrompts.length > 0) {
      prompt += `\n\nPreviously generated (create something DIFFERENT):\n${previousPrompts.map((p, i) => `${i + 1}. ${p.substring(0, 100)}...`).join('\n')}`;
    }
    
    return prompt;
  }
  
  private determineImageType(label: string, context: string, pageContext: any): string {
    const labelLower = label.toLowerCase();
    const contextLower = context.toLowerCase();
    
    // First check the specific field label
    if (labelLower.includes('profile') || labelLower.includes('avatar')) {
      return 'a professional profile photo or avatar';
    } else if (labelLower.includes('logo')) {
      return 'a logo design (abstract shapes/symbols only, no text)';
    } else if (labelLower.includes('banner') || labelLower.includes('header')) {
      return 'a banner/header image';
    } else if (labelLower.includes('cover') || labelLower.includes('hero')) {
      // Check form fields for more specific context
      if (pageContext?.formFields) {
        const productName = pageContext.formFields.find((f: any) => 
          f.label?.toLowerCase().includes('product') && f.value
        );
        if (productName) {
          return `a cover image suitable for a ${productName.value} product`;
        }
      }
      return 'a cover/hero image';
    } else if (labelLower.includes('product')) {
      return 'a product showcase image';
    } else if (labelLower.includes('thumbnail')) {
      return 'a thumbnail image';
    } else if (labelLower.includes('background')) {
      return 'a background pattern or texture';
    }
    
    // Default based on form purpose
    if (pageContext?.formPurpose) {
      switch (pageContext.formPurpose) {
        case 'registration':
        case 'profile':
          return 'a user/profile related image';
        case 'checkout':
        case 'purchase':
          return 'an e-commerce/shopping related image';
        default:
          return 'a contextually appropriate image';
      }
    }
    
    return 'an appropriate image for this context';
  }
  
  private getSpecificRequirements(imageType: string, pageContext: any): string {
    let requirements = [];
    
    // Add specific requirements based on image type
    if (imageType.includes('product')) {
      requirements.push('Show products in an elegant, professional setting');
      requirements.push('Use clean backgrounds and good lighting');
    } else if (imageType.includes('profile') || imageType.includes('avatar')) {
      requirements.push('Professional appearance');
      requirements.push('Friendly and approachable');
    } else if (imageType.includes('cover') || imageType.includes('hero')) {
      requirements.push('Eye-catching and inspiring');
      requirements.push('High visual impact');
    }
    
    // Add requirements based on form context
    if (pageContext?.formFields) {
      const hasProducts = pageContext.formFields.some((f: any) => 
        f.label?.toLowerCase().includes('product') && f.value
      );
      if (hasProducts) {
        requirements.push('Suitable for product marketing');
      }
    }
    
    return requirements.length > 0 ? `\nSpecific requirements:\n${requirements.map(r => `- ${r}`).join('\n')}` : '';
  }
  
  private getCreativityDescription(level: number): string {
    if (level <= 0.3) return 'Very Conservative - Simple, minimal, clean';
    if (level <= 0.7) return 'Balanced - Professional and polished';
    if (level <= 1.2) return 'Creative - Artistic and vibrant';
    return 'Highly Creative - Experimental and bold';
  }
}