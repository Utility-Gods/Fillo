export interface ImageGenerationHistoryEntry {
  prompt: string;
  url: string;
  timestamp: number;
  size: string;
}

export class ImageGenerationHistory {
  private static instance: ImageGenerationHistory;
  private history: Map<string, ImageGenerationHistoryEntry[]> = new Map();
  private maxHistoryPerField = 5;
  
  private constructor() {}
  
  static getInstance(): ImageGenerationHistory {
    if (!ImageGenerationHistory.instance) {
      ImageGenerationHistory.instance = new ImageGenerationHistory();
    }
    return ImageGenerationHistory.instance;
  }
  
  addEntry(fieldSignature: string, prompt: string, url: string, size: string): void {
    if (!this.history.has(fieldSignature)) {
      this.history.set(fieldSignature, []);
    }
    
    const entries = this.history.get(fieldSignature)!;
    
    entries.push({
      prompt,
      url,
      timestamp: Date.now(),
      size
    });
    
    // Keep only the most recent entries
    if (entries.length > this.maxHistoryPerField) {
      entries.shift();
    }
  }
  
  getHistory(fieldSignature: string): ImageGenerationHistoryEntry[] {
    return this.history.get(fieldSignature) || [];
  }
  
  getRecentPrompts(fieldSignature: string, limit: number = 3): string[] {
    const entries = this.getHistory(fieldSignature);
    return entries
      .slice(-limit)
      .map(entry => entry.prompt);
  }
  
  clearHistory(fieldSignature: string): void {
    this.history.delete(fieldSignature);
  }
  
  clearAllHistory(): void {
    this.history.clear();
  }
}