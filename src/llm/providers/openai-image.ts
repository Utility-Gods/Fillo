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

  protected buildPrompt(fieldInfo: any, creativity: number): string {
    const label = fieldInfo.label || '';
    const context = fieldInfo.context || '';
    
    let basePrompt = 'Generate a high-quality image';
    
    // Determine the type of image based on field context
    if (label.toLowerCase().includes('profile') || label.toLowerCase().includes('avatar')) {
      basePrompt = 'Generate a professional profile picture or avatar';
    } else if (label.toLowerCase().includes('logo') || label.toLowerCase().includes('brand')) {
      basePrompt = 'Generate a clean, professional logo';
    } else if (label.toLowerCase().includes('banner') || label.toLowerCase().includes('header')) {
      basePrompt = 'Generate a banner or header image';
    } else if (label.toLowerCase().includes('product')) {
      basePrompt = 'Generate a product image';
    } else if (label.toLowerCase().includes('background')) {
      basePrompt = 'Generate a background image';
    } else if (context.includes('contact') || context.includes('about')) {
      basePrompt = 'Generate a professional image suitable for a contact or about page';
    } else if (context.includes('portfolio') || context.includes('gallery')) {
      basePrompt = 'Generate an artistic or creative image for a portfolio';
    }

    // Add creativity modifiers
    let styleModifier = '';
    if (creativity < 0.3) {
      styleModifier = ', simple and clean style, minimal design';
    } else if (creativity < 0.7) {
      styleModifier = ', professional and polished style';
    } else if (creativity < 1.2) {
      styleModifier = ', creative and artistic style';
    } else {
      styleModifier = ', highly creative and experimental style, unique artistic approach';
    }

    return `${basePrompt}${styleModifier}. ${label ? `For: ${label}` : ''}${context ? ` Context: ${context}` : ''}`;
  }
}