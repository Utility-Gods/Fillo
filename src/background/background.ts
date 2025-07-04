// Polyfill browser APIs for service worker context
if (typeof window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}
if (typeof document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({
      rel: '',
      as: '',
      crossOrigin: '',
      href: '',
      setAttribute: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    head: { 
      appendChild: () => {} 
    }
  };
}

import { StorageManager } from '../storage/storage';
import { ProviderManager } from '../llm/provider-manager';
import { ContentGenerator } from '../llm/content-generator';
import { OpenAIImageGenerator } from '../llm/providers/openai-image';
import { ImageGenerationHistory } from '../utils/image-generation-history';

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Fillo extension installed');
  initializeExtension();
});

// Initialize on browser startup
chrome.runtime.onStartup.addListener(() => {
  initializeExtension();
});

async function initializeExtension() {
  try {
    console.log('Fillo: Initializing extension...');
    console.log('Fillo: Environment check - typeof window:', typeof window);
    console.log('Fillo: Environment check - typeof document:', typeof document);
    
    // Initialize storage
    const storage = StorageManager.getInstance();
    const settings = await storage.getSettings();
    console.log('Fillo: Settings loaded', settings);

    // Initialize provider manager
    const providerManager = ProviderManager.getInstance();
    await providerManager.initialize();
    console.log('Fillo: Provider manager initialized');

    // Initialize content generator
    const contentGenerator = ContentGenerator.getInstance();
    await contentGenerator.initialize();
    console.log('Fillo: Content generator initialized');
  } catch (error) {
    console.error('Fillo: Failed to initialize', error);
    console.error('Fillo: Initialization error stack:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.url && isLocalhost(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ['src/content/content.js']
    });
  }
});

function isLocalhost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' ||
           hostname.endsWith('.localhost');
  } catch {
    return false;
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkHostname') {
    const isValid = isLocalhost(request.url);
    sendResponse({ isValid });
    return true;
  }

  if (request.action === 'generateContent') {
    handleGenerateContent(request, sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.action === 'generateImage') {
    handleGenerateImage(request, sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.action === 'getSettings') {
    handleGetSettings(sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.action === 'testConnection') {
    handleTestConnection(request, sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.action === 'openOptionsPage') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getCacheStats') {
    handleGetCacheStats(sendResponse);
    return true; // Will respond asynchronously
  }

  return false;
});

async function handleGenerateContent(request: any, sendResponse: Function) {
  try {
    console.log('Background: Starting content generation for field:', request.fieldInfo);
    console.log('Background: Environment check - typeof window:', typeof window);
    
    // Test if the issue occurs during class instantiation
    console.log('Background: About to get ContentGenerator instance...');
    const contentGenerator = ContentGenerator.getInstance();
    console.log('Background: ContentGenerator instance obtained');
    
    // Test if the issue occurs during initialization
    console.log('Background: About to initialize ContentGenerator...');
    await contentGenerator.initialize();
    console.log('Background: ContentGenerator initialized');
    
    // Test if the issue occurs during content generation
    console.log('Background: About to generate content...');
    
    // Update options to enable multiple cache retrieval for initial suggestions
    const updatedOptions = {
      ...request.options,
      returnMultiple: !request.options?.forceRegenerate // Use multiple cache entries unless forcing regeneration
    };
    
    const response = await contentGenerator.generateForField(
      request.fieldInfo,
      updatedOptions
    );
    
    console.log('Background: Content generated successfully:', response);
    sendResponse({ success: true, response });
  } catch (error) {
    console.error('Background: Content generation failed at step:', error);
    console.error('Background: Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate content' 
    });
  }
}

async function handleGetSettings(sendResponse: Function) {
  try {
    const storage = StorageManager.getInstance();
    const settings = await storage.getSettings();
    sendResponse({ success: true, settings });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get settings' 
    });
  }
}

async function handleTestConnection(request: any, sendResponse: Function) {
  try {
    const providerManager = ProviderManager.getInstance();
    const result = await providerManager.testConnection(request.provider);
    sendResponse({ success: true, result });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to test connection' 
    });
  }
}

async function handleGetCacheStats(sendResponse: Function) {
  try {
    const contentGenerator = ContentGenerator.getInstance();
    const stats = await contentGenerator.getCacheStats();
    sendResponse({ success: true, stats });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get cache stats' 
    });
  }
}

async function handleGenerateImage(request: any, sendResponse: Function) {
  try {
    console.log('Background: Starting image generation for field:', request.fieldInfo);
    console.log('Background: Page context:', request.options?.pageContext);
    
    // Get the current provider settings
    const storage = StorageManager.getInstance();
    const settings = await storage.getSettings();
    
    // Check if we have OpenAI configured
    const openaiKey = await storage.getApiKey('openai');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured. Please add it in settings.');
    }

    // Use the statically imported OpenAI image generator
    const imageGenerator = new OpenAIImageGenerator(openaiKey);
    
    // Get image generation history
    const imageHistory = ImageGenerationHistory.getInstance();
    const previousPrompts = imageHistory.getRecentPrompts(request.fieldInfo.signature);
    
    // Enhance field info with page context
    const enhancedFieldInfo = {
      ...request.fieldInfo,
      pageContext: request.options?.pageContext
    };
    
    // Build prompt based on enhanced field info with previous prompts
    const prompt = imageGenerator['buildPrompt'](enhancedFieldInfo, settings.creativityLevel, previousPrompts);
    
    console.log('Background: Enhanced field info for image generation:', JSON.stringify(enhancedFieldInfo, null, 2));
    console.log('Background: Previous image prompts:', previousPrompts);
    
    // Generate the image
    const imageResponse = await imageGenerator.generateImage({
      prompt,
      size: request.options?.size || '1024x1024',
      quality: request.options?.quality || 'standard',
      creativity: settings.creativityLevel
    });
    
    console.log('Background: Image generated successfully:', imageResponse);
    
    // Add to image generation history
    imageHistory.addEntry(
      request.fieldInfo.signature,
      prompt,
      imageResponse.url,
      imageResponse.size || '1024x1024'
    );
    
    sendResponse({ 
      success: true, 
      imageUrl: imageResponse.url,
      prompt: imageResponse.prompt,
      revisedPrompt: imageResponse.revised_prompt,
      filename: `generated-${Date.now()}.png`
    });
  } catch (error) {
    console.error('Background: Image generation failed:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate image' 
    });
  }
}

// Clean up periodically
setInterval(async () => {
  try {
    const contentGenerator = ContentGenerator.getInstance();
    const stats = await contentGenerator.getCacheStats();
    
    // Clean up cache if it's getting too large
    if (stats.totalEntries > 10000) {
      const storage = StorageManager.getInstance();
      const settings = await storage.getSettings();
      
      if (settings.cache.enabled) {
        const cacheManager = (await import('../database/cache')).CacheManager.getInstance();
        await cacheManager.cleanup();
        console.log('Fillo: Cache cleaned up');
      }
    }
  } catch (error) {
    console.error('Fillo: Cleanup failed', error);
  }
}, 3600000); // Every hour