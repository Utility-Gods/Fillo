import initSqlJs from 'sql.js';

export class SQLiteManager {
  private static instance: SQLiteManager;
  private db: any = null;
  private SQL: any = null;

  private constructor() {}

  static getInstance(): SQLiteManager {
    if (!SQLiteManager.instance) {
      SQLiteManager.instance = new SQLiteManager();
    }
    return SQLiteManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.SQL = await initSqlJs({
        locateFile: (file: string) => chrome.runtime.getURL(file)
      });

      // Try to load existing database from storage
      const result = await chrome.storage.local.get(['fillo_db']);
      
      if (result.fillo_db) {
        const uint8Array = new Uint8Array(result.fillo_db);
        this.db = new this.SQL.Database(uint8Array);
      } else {
        this.db = new this.SQL.Database();
        await this.createTables();
      }

      console.log('SQLite database initialized');
    } catch (error) {
      console.error('Failed to initialize SQLite:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS field_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_signature TEXT UNIQUE NOT NULL,
        field_type TEXT NOT NULL,
        creativity_level REAL NOT NULL,
        generated_content TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_field_signature ON field_cache(field_signature);
      CREATE INDEX IF NOT EXISTS idx_expires_at ON field_cache(expires_at);
      CREATE INDEX IF NOT EXISTS idx_creativity_level ON field_cache(creativity_level);
    `;

    this.db.exec(createTableSQL);
    await this.saveDatabase();
  }

  async saveDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      const data = this.db.export();
      await chrome.storage.local.set({ fillo_db: Array.from(data) });
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const stmt = this.db.prepare(sql);
      const results: any[] = [];
      
      stmt.bind(params);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
      }
      
      stmt.free();
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const stmt = this.db.prepare(sql);
      stmt.run(params);
      stmt.free();
      await this.saveDatabase();
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    totalEntries: number;
    cacheHits: number;
    cacheMisses: number;
    storageSize: number;
  }> {
    const [totalResult] = await this.query('SELECT COUNT(*) as count FROM field_cache');
    const storageData = await chrome.storage.local.get(['fillo_db', 'fillo_stats']);
    
    const stats = storageData.fillo_stats || { hits: 0, misses: 0 };
    
    return {
      totalEntries: totalResult.count,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      storageSize: storageData.fillo_db ? storageData.fillo_db.length : 0
    };
  }

  async cleanup(): Promise<void> {
    await this.execute('DELETE FROM field_cache WHERE expires_at < datetime("now")');
    
    // Keep only the most recent 10,000 entries
    await this.execute(`
      DELETE FROM field_cache 
      WHERE id NOT IN (
        SELECT id FROM field_cache 
        ORDER BY created_at DESC 
        LIMIT 10000
      )
    `);
  }

  async clearCache(): Promise<void> {
    await this.execute('DELETE FROM field_cache');
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}