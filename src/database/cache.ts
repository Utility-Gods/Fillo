import { IndexedDBManager, CacheEntry } from './indexeddb';

export class CacheManager {
  private static instance: CacheManager;
  private db: IndexedDBManager;

  private constructor() {
    this.db = IndexedDBManager.getInstance();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  async get(signature: string, creativityLevel: number): Promise<CacheEntry | null> {
    const tolerance = 0.1; // Allow some tolerance in creativity level matching
    
    const result = await this.db.getBySignature(signature, creativityLevel, tolerance);

    if (result) {
      await this.incrementStats('hits');
      return result;
    }

    await this.incrementStats('misses');
    return null;
  }

  async set(
    signature: string,
    fieldType: string,
    creativityLevel: number,
    content: string,
    provider: string,
    model: string,
    expirationDays: number = 7
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const entry = {
      fieldSignature: signature,
      fieldType,
      creativityLevel,
      generatedContent: content,
      provider,
      model,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await this.db.add(entry);
  }

  async getSimilar(signature: string, creativityLevel: number, limit: number = 3): Promise<CacheEntry[]> {
    return await this.db.getSimilar(signature, creativityLevel, limit);
  }

  async getByType(fieldType: string, creativityLevel: number, limit: number = 5): Promise<CacheEntry[]> {
    const tolerance = 0.2;
    return await this.db.getByType(fieldType, creativityLevel, limit, tolerance);
  }

  async cleanup(): Promise<void> {
    await this.db.cleanup();
  }

  async clear(): Promise<void> {
    await this.db.clear();
    await chrome.storage.local.remove(['fillo_stats']);
  }

  async getStats(): Promise<{
    totalEntries: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    storageSize: number;
    entriesByType: Record<string, number>;
    entriesByCreativity: Record<string, number>;
  }> {
    const dbStats = await this.db.getStats();
    
    // Get cache hit/miss statistics from Chrome storage
    const result = await chrome.storage.local.get(['fillo_stats']);
    const storageStats = result.fillo_stats || { hits: 0, misses: 0 };
    
    const totalRequests = storageStats.hits + storageStats.misses;
    const hitRate = totalRequests > 0 ? (storageStats.hits / totalRequests) * 100 : 0;

    return {
      totalEntries: dbStats.totalEntries,
      cacheHits: storageStats.hits,
      cacheMisses: storageStats.misses,
      hitRate,
      storageSize: dbStats.storageSize,
      entriesByType: dbStats.entriesByType,
      entriesByCreativity: dbStats.entriesByCreativity
    };
  }

  private async incrementStats(type: 'hits' | 'misses'): Promise<void> {
    const result = await chrome.storage.local.get(['fillo_stats']);
    const stats = result.fillo_stats || { hits: 0, misses: 0 };
    
    stats[type]++;
    
    await chrome.storage.local.set({ fillo_stats: stats });
  }
}