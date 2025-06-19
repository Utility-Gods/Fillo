export interface GenerationHistoryEntry {
  content: string;
  timestamp: number;
  provider: string;
}

export class GenerationHistory {
  private static instance: GenerationHistory;
  private history: Map<string, GenerationHistoryEntry[]> = new Map();
  private maxHistoryPerField = 10;
  
  private constructor() {}
  
  static getInstance(): GenerationHistory {
    if (!GenerationHistory.instance) {
      GenerationHistory.instance = new GenerationHistory();
    }
    return GenerationHistory.instance;
  }
  
  addEntry(fieldSignature: string, content: string, provider: string): void {
    if (!this.history.has(fieldSignature)) {
      this.history.set(fieldSignature, []);
    }
    
    const entries = this.history.get(fieldSignature)!;
    
    // Check if this exact content already exists
    const exists = entries.some(entry => entry.content === content);
    if (!exists) {
      entries.push({
        content,
        timestamp: Date.now(),
        provider
      });
      
      // Keep only the most recent entries
      if (entries.length > this.maxHistoryPerField) {
        entries.shift();
      }
    }
  }
  
  getHistory(fieldSignature: string): GenerationHistoryEntry[] {
    return this.history.get(fieldSignature) || [];
  }
  
  getRecentContents(fieldSignature: string, limit: number = 5): string[] {
    const entries = this.getHistory(fieldSignature);
    return entries
      .slice(-limit)
      .map(entry => entry.content);
  }
  
  clearHistory(fieldSignature: string): void {
    this.history.delete(fieldSignature);
  }
  
  clearAllHistory(): void {
    this.history.clear();
  }
}