export interface CacheEntry {
  id?: number;
  fieldSignature: string;
  fieldType: string;
  creativityLevel: number;
  generatedContent: string;
  provider: string;
  model: string;
  createdAt: string;
  expiresAt: string;
}

export class IndexedDBManager {
  private static instance: IndexedDBManager;
  private db: IDBDatabase | null = null;
  private readonly dbName = 'fillo_cache';
  private readonly version = 1;
  private readonly storeName = 'responses';

  private constructor() {}

  static getInstance(): IndexedDBManager {
    if (!IndexedDBManager.instance) {
      IndexedDBManager.instance = new IndexedDBManager();
    }
    return IndexedDBManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store
        const store = db.createObjectStore(this.storeName, { 
          keyPath: 'id', 
          autoIncrement: true 
        });

        // Create indexes for efficient querying
        store.createIndex('signature', 'fieldSignature', { unique: false });
        store.createIndex('expires', 'expiresAt', { unique: false });
        store.createIndex('creativity', 'creativityLevel', { unique: false });
        store.createIndex('type', 'fieldType', { unique: false });
        store.createIndex('created', 'createdAt', { unique: false });
        
        console.log('IndexedDB schema created');
      };
    });
  }

  async add(entry: Omit<CacheEntry, 'id'>): Promise<number> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(entry);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getBySignature(signature: string, creativityLevel: number, tolerance: number = 0.1): Promise<CacheEntry | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('signature');
      const request = index.getAll(signature);

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        
        // Filter by creativity level tolerance and expiration
        const now = new Date().toISOString();
        const validEntries = entries.filter(entry => 
          Math.abs(entry.creativityLevel - creativityLevel) <= tolerance &&
          entry.expiresAt > now
        );

        if (validEntries.length === 0) {
          resolve(null);
          return;
        }

        // Sort by closest creativity level match
        validEntries.sort((a, b) => 
          Math.abs(a.creativityLevel - creativityLevel) - 
          Math.abs(b.creativityLevel - creativityLevel)
        );

        resolve(validEntries[0]);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getSimilar(signature: string, creativityLevel: number, limit: number = 3): Promise<CacheEntry[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const allEntries = request.result as CacheEntry[];
        const now = new Date().toISOString();
        
        // Extract base signature (remove trailing identifiers)
        const baseSignature = signature.split('-').slice(0, -1).join('-');
        
        // Filter for similar signatures and valid entries
        const similarEntries = allEntries.filter(entry => 
          (entry.fieldSignature.startsWith(baseSignature) || entry.fieldSignature === signature) &&
          entry.expiresAt > now
        );

        // Sort by exact match first, then by creativity level closeness, then by creation date
        similarEntries.sort((a, b) => {
          if (a.fieldSignature === signature && b.fieldSignature !== signature) return -1;
          if (b.fieldSignature === signature && a.fieldSignature !== signature) return 1;
          
          const creativityDiff = Math.abs(a.creativityLevel - creativityLevel) - 
                               Math.abs(b.creativityLevel - creativityLevel);
          if (creativityDiff !== 0) return creativityDiff;
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        resolve(similarEntries.slice(0, limit));
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getByType(fieldType: string, creativityLevel: number, limit: number = 5, tolerance: number = 0.2): Promise<CacheEntry[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('type');
      const request = index.getAll(fieldType);

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const now = new Date().toISOString();
        
        // Filter by creativity level tolerance and expiration
        const validEntries = entries.filter(entry => 
          Math.abs(entry.creativityLevel - creativityLevel) <= tolerance &&
          entry.expiresAt > now
        );

        // Sort by creativity level closeness, then by creation date
        validEntries.sort((a, b) => {
          const creativityDiff = Math.abs(a.creativityLevel - creativityLevel) - 
                               Math.abs(b.creativityLevel - creativityLevel);
          if (creativityDiff !== 0) return creativityDiff;
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        resolve(validEntries.slice(0, limit));
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getStats(): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    entriesByCreativity: Record<string, number>;
    storageSize: number;
  }> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const now = new Date().toISOString();
        
        // Only count non-expired entries
        const validEntries = entries.filter(entry => entry.expiresAt > now);
        
        const entriesByType: Record<string, number> = {};
        const entriesByCreativity: Record<string, number> = {};
        let totalSize = 0;

        validEntries.forEach(entry => {
          // Count by type
          entriesByType[entry.fieldType] = (entriesByType[entry.fieldType] || 0) + 1;
          
          // Count by creativity group
          let creativityGroup: string;
          if (entry.creativityLevel <= 0.3) creativityGroup = 'Predictable';
          else if (entry.creativityLevel <= 0.7) creativityGroup = 'Balanced';
          else if (entry.creativityLevel <= 1.2) creativityGroup = 'Creative';
          else creativityGroup = 'Experimental';
          
          entriesByCreativity[creativityGroup] = (entriesByCreativity[creativityGroup] || 0) + 1;
          
          // Estimate size (rough calculation)
          totalSize += JSON.stringify(entry).length;
        });

        resolve({
          totalEntries: validEntries.length,
          entriesByType,
          entriesByCreativity,
          storageSize: totalSize
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  async cleanup(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('expires');
      const now = new Date().toISOString();
      
      // Get all expired entries
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);
      
      let deletedCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`Cleaned up ${deletedCount} expired cache entries`);
          
          // Also limit total entries to 10,000 most recent
          this.limitEntries(10000).then(() => resolve()).catch(reject);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async limitEntries(maxEntries: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('created');
      const request = index.openCursor(null, 'prev'); // Newest first
      
      let count = 0;
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          count++;
          if (count > maxEntries) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Cache cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}