export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  quality?: string;
  style?: string;
  creativity?: number;
}

export interface ImageGenerationResponse {
  url: string;
  data?: string; // base64 data
  prompt: string;
  size?: string;
  revised_prompt?: string;
}

export abstract class BaseImageGenerator {
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
  abstract getSupportedSizes(): string[];
  abstract testConnection(): Promise<boolean>;
  abstract generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;

  protected async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response;
  }

  protected buildPrompt(fieldInfo: any, creativity: number): string {
    const contextualPrompts = {
      image: 'Generate a realistic image that would be appropriate for this field',
      photo: 'Create a professional photo suitable for this context',
      avatar: 'Generate a profile picture or avatar image',
      logo: 'Create a logo or brand image',
      banner: 'Generate a banner or header image',
      thumbnail: 'Create a thumbnail image',
      profile: 'Generate a profile image or headshot'
    };

    const fieldType = fieldInfo.type.toLowerCase();
    const basePrompt = contextualPrompts[fieldType] || contextualPrompts.image;
    
    const creativityModifier = creativity > 1.0 
      ? ', creative and artistic style' 
      : creativity < 0.5 
        ? ', simple and clean style'
        : ', balanced realistic style';

    return `${basePrompt}${creativityModifier}. Context: ${fieldInfo.label || 'image field'}`;
  }

  protected async downloadImageAsFile(imageUrl: string, filename: string = 'generated-image.png'): Promise<File> {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  }

  protected async setFileToInput(file: File, input: HTMLInputElement): Promise<void> {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    
    // Trigger change event
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}