import { FieldInfo, ProviderResponse } from '../types';
import { CacheManager } from '../database/cache';
import { ProviderManager } from './provider-manager';
import { StorageManager } from '../storage/storage';
import { ContextExtractor, PageContext } from '../utils/context-extractor';
import { GenerationHistory } from '../utils/generation-history';

export class ContentGenerator {
  private static instance: ContentGenerator;
  private cacheManager: CacheManager;
  private providerManager: ProviderManager;
  private generationHistory: GenerationHistory;
  private initialized = false;

  private constructor() {
    this.cacheManager = CacheManager.getInstance();
    this.providerManager = ProviderManager.getInstance();
    this.generationHistory = GenerationHistory.getInstance();
  }

  static getInstance(): ContentGenerator {
    if (!ContentGenerator.instance) {
      ContentGenerator.instance = new ContentGenerator();
    }
    return ContentGenerator.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.cacheManager.initialize();
    await this.providerManager.initialize();
    this.initialized = true;
  }

  async generateForField(fieldInfo: FieldInfo, options?: {
    useCache?: boolean;
    context?: string;
    forceRegenerate?: boolean;
    pageContext?: PageContext;
    returnMultiple?: boolean;
    varyCreativity?: boolean;
  }): Promise<ProviderResponse> {
    await this.initialize();

    const { useCache = true, context, forceRegenerate = false, pageContext, returnMultiple = false, varyCreativity = false } = options || {};

    // Check cache first if enabled and not forcing regeneration
    if (useCache && !forceRegenerate) {
      const settings = await this.getSettings();
      if (settings?.cache.enabled) {
        const creativityLevel = await this.getCreativityLevel(fieldInfo.type);
        
        if (returnMultiple) {
          // Get multiple cached entries and return a random one
          const cachedEntries = await this.cacheManager.getMultiple(fieldInfo.signature, creativityLevel, 5);
          
          if (cachedEntries.length > 0) {
            // Pick a random cached entry
            const randomIndex = Math.floor(Math.random() * cachedEntries.length);
            const cached = cachedEntries[randomIndex];
            
            console.log(`Cache hit for field: ${fieldInfo.signature} (${cachedEntries.length} entries available)`);
            
            // Still add cached content to history so we can avoid regenerating it
            this.generationHistory.addEntry(
              fieldInfo.signature, 
              cached.generatedContent, 
              cached.provider || 'unknown'
            );
            
            return {
              content: cached.generatedContent,
              cached: true,
              provider: cached.provider || 'unknown',
              model: cached.model || 'unknown',
              creativityLevel: cached.creativityLevel
            };
          }
        } else {
          // Original behavior - get single entry
          const cached = await this.cacheManager.get(fieldInfo.signature, creativityLevel);
          
          if (cached) {
            console.log('Cache hit for field:', fieldInfo.signature);
            
            // Still add cached content to history so we can avoid regenerating it
            this.generationHistory.addEntry(
              fieldInfo.signature, 
              cached.generatedContent, 
              cached.provider || 'unknown'
            );
            
            return {
              content: cached.generatedContent,
              cached: true,
              provider: cached.provider || 'unknown',
              model: cached.model || 'unknown',
              creativityLevel: cached.creativityLevel
            };
          }
        }
      }
    }

    // Generate new content
    console.log('Generating new content for field:', fieldInfo.signature);
    console.log('Content Generator: Page context provided:', JSON.stringify(pageContext, null, 2));
    
    try {
      // Get previous generations for this field
      const previousGenerations = this.generationHistory.getRecentContents(fieldInfo.signature);
      
      const response = await this.providerManager.generateContent(fieldInfo, context, pageContext, previousGenerations);
      
      if (!response) {
        throw new Error('No response from provider');
      }

      // Cache the response if caching is enabled
      const settings = await this.getSettings();
      if (settings?.cache.enabled && useCache) {
        await this.cacheManager.set(
          fieldInfo.signature,
          fieldInfo.type,
          response.creativityLevel,
          response.content,
          response.provider,
          response.model,
          settings.cache.expirationDays
        );
      }

      // Add to generation history
      this.generationHistory.addEntry(fieldInfo.signature, response.content, response.provider);
      
      return {
        content: response.content,
        cached: false,
        provider: response.provider,
        model: response.model,
        creativityLevel: response.creativityLevel
      };
    } catch (error) {
      console.error('Failed to generate content:', error);
      
      // Try to fall back to cached content if available
      if (useCache) {
        const creativityLevel = await this.getCreativityLevel(fieldInfo.type);
        const similar = await this.cacheManager.getSimilar(fieldInfo.signature, creativityLevel, 1);
        
        if (similar.length > 0) {
          console.log('Using similar cached content as fallback');
          return {
            content: similar[0].generatedContent,
            cached: true,
            provider: similar[0].provider || 'unknown',
            model: similar[0].model || 'unknown',
            creativityLevel: similar[0].creativityLevel
          };
        }
      }

      throw error;
    }
  }

  async getSuggestions(fieldInfo: FieldInfo, limit: number = 3): Promise<ProviderResponse[]> {
    await this.initialize();

    const creativityLevel = await this.getCreativityLevel(fieldInfo.type);
    const cached = await this.cacheManager.getSimilar(fieldInfo.signature, creativityLevel, limit);

    return cached.map(entry => ({
      content: entry.generatedContent,
      cached: true,
      provider: entry.provider || 'unknown',
      model: entry.model || 'unknown',
      creativityLevel: entry.creativityLevel
    }));
  }

  async generateMultiple(fieldInfo: FieldInfo, count: number = 3, options?: {
    context?: string;
    varyCreativity?: boolean;
  }): Promise<ProviderResponse[]> {
    const results: ProviderResponse[] = [];
    const { context, varyCreativity = true } = options || {};

    for (let i = 0; i < count; i++) {
      try {
        // Vary creativity slightly for each generation if requested
        const baseCreativity = await this.getCreativityLevel(fieldInfo.type);
        const creativity = varyCreativity 
          ? Math.min(2.0, Math.max(0.1, baseCreativity + (i * 0.2)))
          : baseCreativity;

        // Create a modified field info with adjusted creativity
        const modifiedFieldInfo = { ...fieldInfo };
        
        const response = await this.generateForField(modifiedFieldInfo, {
          useCache: false,
          context,
          forceRegenerate: true
        });

        results.push(response);
      } catch (error) {
        console.error(`Failed to generate suggestion ${i + 1}:`, error);
      }
    }

    return results;
  }

  private async getSettings() {
    const storage = StorageManager.getInstance();
    return storage.getSettings();
  }

  private async getCreativityLevel(fieldType: string): Promise<number> {
    const settings = await this.getSettings();
    if (!settings) return 0.7; // default

    const fieldSpecific = settings.creativity.fieldSpecific[fieldType];
    return fieldSpecific !== undefined ? fieldSpecific : settings.creativity.level;
  }

  async clearCache(): Promise<void> {
    await this.cacheManager.clear();
  }

  async getCacheStats() {
    return this.cacheManager.getStats();
  }

  hasProvider(): boolean {
    return this.providerManager.hasConfiguredProvider();
  }
}