import { StorageManager } from '../storage/storage';
import { ProviderManager } from '../llm/provider-manager';
import { ContentGenerator } from '../llm/content-generator';

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

  return false;
});

async function handleGenerateContent(request: any, sendResponse: Function) {
  try {
    const contentGenerator = ContentGenerator.getInstance();
    const response = await contentGenerator.generateForField(
      request.fieldInfo,
      request.options
    );
    sendResponse({ success: true, response });
  } catch (error) {
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