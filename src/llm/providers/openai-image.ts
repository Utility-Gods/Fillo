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
    
    let basePrompt = 'Generate a professional, high-quality image without any text or words';
    let contextType = '';
    let visualStyle = '';
    
    // Extract relevant context from page to determine image type, not content
    if (pageContext) {
      // Determine the general purpose without using specific text
      if (pageContext.formPurpose) {
        switch (pageContext.formPurpose) {
          case 'registration':
          case 'login':
            contextType = 'suitable for user authentication';
            break;
          case 'contact':
            contextType = 'suitable for business communication';
            break;
          case 'checkout':
          case 'purchase':
            contextType = 'suitable for e-commerce';
            break;
          case 'profile':
            contextType = 'suitable for user profiles';
            break;
          default:
            contextType = `suitable for ${pageContext.formPurpose}`;
        }
      }
      
      // Look at form fields to infer theme, not to add text
      if (pageContext.formFields && pageContext.formFields.length > 0) {
        const hasProductFields = pageContext.formFields.some((f: any) => 
          f.label?.toLowerCase().includes('product') || 
          f.label?.toLowerCase().includes('catalog')
        );
        const hasUserFields = pageContext.formFields.some((f: any) => 
          f.label?.toLowerCase().includes('name') || 
          f.label?.toLowerCase().includes('email')
        );
        
        if (hasProductFields) {
          visualStyle = 'modern, clean, professional product imagery';
        } else if (hasUserFields) {
          visualStyle = 'friendly, professional, people-oriented';
        }
      }
    }
    
    // Determine the type of image based on field context and label
    const labelLower = label.toLowerCase();
    const contextLower = context.toLowerCase();
    
    if (labelLower.includes('profile') || labelLower.includes('avatar')) {
      basePrompt = 'Generate a professional headshot or avatar photo, no text, just the person';
    } else if (labelLower.includes('logo')) {
      basePrompt = 'Generate an abstract logo design with geometric shapes or symbols, no text or letters';
    } else if (labelLower.includes('banner') || labelLower.includes('header')) {
      basePrompt = 'Generate a visually appealing banner image with abstract patterns or nature scenes, no text';
    } else if (labelLower.includes('cover') || labelLower.includes('hero')) {
      basePrompt = 'Generate an inspiring cover image with beautiful scenery or abstract art, no text';
    } else if (labelLower.includes('product') || labelLower.includes('catalog') || labelLower.includes('catalogue')) {
      basePrompt = 'Generate a product photography style image showing elegant items or objects, no text';
    } else if (labelLower.includes('thumbnail')) {
      basePrompt = 'Generate a compelling thumbnail image with vibrant visuals, no text';
    } else if (labelLower.includes('background')) {
      basePrompt = 'Generate a subtle background pattern or texture, no text';
    } else if (contextType.includes('authentication')) {
      basePrompt = 'Generate a secure, professional image with abstract security concepts, no text';
    } else if (contextType.includes('e-commerce')) {
      basePrompt = 'Generate a shopping or retail themed image with products or shopping concepts, no text';
    } else if (contextType.includes('communication')) {
      basePrompt = 'Generate a professional business communication themed image, no text';
    }

    // Add creativity modifiers
    let styleModifier = '';
    if (creativity < 0.3) {
      styleModifier = ', simple and clean style, minimal design, subtle colors';
    } else if (creativity < 0.7) {
      styleModifier = ', professional and polished style, modern design';
    } else if (creativity < 1.2) {
      styleModifier = ', creative and artistic style, vibrant colors';
    } else {
      styleModifier = ', highly creative and experimental style, unique artistic approach, bold and dynamic';
    }

    // Build the final prompt
    let finalPrompt = `${basePrompt}${styleModifier}`;
    
    // Add visual style if determined
    if (visualStyle) {
      finalPrompt += `. Visual style: ${visualStyle}`;
    }
    
    // Add context type if available
    if (contextType) {
      finalPrompt += `, ${contextType}`;
    }
    
    // Make it appropriate for web use
    finalPrompt += '. The image should be suitable for web use, with good contrast and clarity. IMPORTANT: Do not include any text, words, letters, or numbers in the image. Focus on visual elements only.';
    
    // Add previous prompts if any to avoid repetition
    if (previousPrompts && previousPrompts.length > 0) {
      finalPrompt += `\n\nIMPORTANT: The following image descriptions have already been generated. Create something DIFFERENT:\n${previousPrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nGenerate a completely different style and composition.`;
    }
    
    return finalPrompt;
  }
}