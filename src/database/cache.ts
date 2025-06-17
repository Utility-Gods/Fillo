import { SQLiteManager } from './sqlite';
import { CacheEntry } from '../types';

export class CacheManager {
  private static instance: CacheManager;
  private db: SQLiteManager;

  private constructor() {
    this.db = SQLiteManager.getInstance();
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
    
    const results = await this.db.query(`
      SELECT * FROM field_cache 
      WHERE field_signature = ? 
      AND ABS(creativity_level - ?) <= ?
      AND expires_at > datetime('now')
      ORDER BY ABS(creativity_level - ?) ASC
      LIMIT 1
    `, [signature, creativityLevel, tolerance, creativityLevel]);

    if (results.length > 0) {
      await this.incrementStats('hits');
      return results[0] as CacheEntry;
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

    await this.db.execute(`
      INSERT OR REPLACE INTO field_cache 
      (field_signature, field_type, creativity_level, generated_content, provider, model, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [signature, fieldType, creativityLevel, content, provider, model, expiresAt.toISOString()]);
  }

  async getSimilar(signature: string, creativityLevel: number, limit: number = 3): Promise<CacheEntry[]> {
    // Extract base signature (remove trailing identifiers)
    const baseSignature = signature.split('-').slice(0, -1).join('-');
    
    const results = await this.db.query(`
      SELECT * FROM field_cache 
      WHERE (field_signature LIKE ? OR field_signature = ?)
      AND expires_at > datetime('now')
      ORDER BY 
        CASE WHEN field_signature = ? THEN 0 ELSE 1 END,
        ABS(creativity_level - ?) ASC,
        created_at DESC
      LIMIT ?
    `, [`${baseSignature}%`, signature, signature, creativityLevel, limit]);

    return results as CacheEntry[];
  }

  async getByType(fieldType: string, creativityLevel: number, limit: number = 5): Promise<CacheEntry[]> {
    const tolerance = 0.2;
    
    const results = await this.db.query(`
      SELECT * FROM field_cache 
      WHERE field_type = ?
      AND ABS(creativity_level - ?) <= ?
      AND expires_at > datetime('now')
      ORDER BY ABS(creativity_level - ?) ASC, created_at DESC
      LIMIT ?
    `, [fieldType, creativityLevel, tolerance, creativityLevel, limit]);

    return results as CacheEntry[];
  }

  async cleanup(): Promise<void> {
    await this.db.cleanup();
  }

  async clear(): Promise<void> {
    await this.db.clearCache();
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
    const baseStats = await this.db.getStats();
    
    // Get entries by type
    const typeResults = await this.db.query(`
      SELECT field_type, COUNT(*) as count 
      FROM field_cache 
      WHERE expires_at > datetime('now')
      GROUP BY field_type
    `);
    
    const entriesByType: Record<string, number> = {};
    typeResults.forEach(row => {
      entriesByType[row.field_type] = row.count;
    });

    // Get entries by creativity level (grouped)
    const creativityResults = await this.db.query(`
      SELECT 
        CASE 
          WHEN creativity_level <= 0.3 THEN 'Predictable'
          WHEN creativity_level <= 0.7 THEN 'Balanced'
          WHEN creativity_level <= 1.2 THEN 'Creative'
          ELSE 'Experimental'
        END as creativity_group,
        COUNT(*) as count
      FROM field_cache 
      WHERE expires_at > datetime('now')
      GROUP BY creativity_group
    `);

    const entriesByCreativity: Record<string, number> = {};
    creativityResults.forEach(row => {
      entriesByCreativity[row.creativity_group] = row.count;
    });

    const totalRequests = baseStats.cacheHits + baseStats.cacheMisses;
    const hitRate = totalRequests > 0 ? (baseStats.cacheHits / totalRequests) * 100 : 0;

    return {
      ...baseStats,
      hitRate,
      entriesByType,
      entriesByCreativity
    };
  }

  private async incrementStats(type: 'hits' | 'misses'): Promise<void> {
    const result = await chrome.storage.local.get(['fillo_stats']);
    const stats = result.fillo_stats || { hits: 0, misses: 0 };
    
    stats[type]++;
    
    await chrome.storage.local.set({ fillo_stats: stats });
  }
}