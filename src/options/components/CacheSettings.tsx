import { Component, createSignal, createEffect, onMount } from 'solid-js';
import { Settings } from '../../types';
import { CacheManager } from '../../database/cache';

interface CacheSettingsProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const CacheSettings: Component<CacheSettingsProps> = (props) => {
  const [stats, setStats] = createSignal<any>(null);
  const [clearing, setClearing] = createSignal(false);

  const cacheManager = CacheManager.getInstance();

  const loadStats = async () => {
    try {
      const cacheStats = await cacheManager.getStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  onMount(() => {
    loadStats();
  });

  createEffect(() => {
    // Reload stats when cache settings change
    loadStats();
  });

  const handleCacheEnabledChange = (enabled: boolean) => {
    const newSettings = {
      ...props.settings,
      cache: {
        ...props.settings.cache,
        enabled
      }
    };
    props.onSettingsChange(newSettings);
  };

  const handleMaxEntriesChange = (maxEntries: number) => {
    const newSettings = {
      ...props.settings,
      cache: {
        ...props.settings.cache,
        maxEntries
      }
    };
    props.onSettingsChange(newSettings);
  };

  const handleExpirationDaysChange = (expirationDays: number) => {
    const newSettings = {
      ...props.settings,
      cache: {
        ...props.settings.cache,
        expirationDays
      }
    };
    props.onSettingsChange(newSettings);
  };

  const clearCache = async () => {
    setClearing(true);
    try {
      await cacheManager.clear();
      await loadStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setClearing(false);
    }
  };

  const cleanupCache = async () => {
    try {
      await cacheManager.cleanup();
      await loadStats();
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div class="cache-settings">
      <div class="cache-toggle">
        <label class="toggle-label">
          <input
            type="checkbox"
            checked={props.settings.cache.enabled}
            onChange={(e) => handleCacheEnabledChange(e.currentTarget.checked)}
            class="toggle-input"
          />
          <span class="toggle-slider"></span>
          <span class="toggle-text">Enable intelligent caching</span>
        </label>
        <p class="toggle-description">
          Cache LLM responses to reduce API calls and improve performance. Responses are cached based on field type, context, and creativity level.
        </p>
      </div>

      {props.settings.cache.enabled && (
        <>
          <div class="cache-config">
            <div class="form-group">
              <label>Maximum Cache Entries</label>
              <input
                type="number"
                min="100"
                max="100000"
                step="100"
                value={props.settings.cache.maxEntries}
                onInput={(e) => handleMaxEntriesChange(parseInt(e.currentTarget.value))}
                class="input"
              />
              <span class="help-text">
                Number of responses to keep cached (100 - 100,000)
              </span>
            </div>

            <div class="form-group">
              <label>Cache Expiration (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={props.settings.cache.expirationDays}
                onInput={(e) => handleExpirationDaysChange(parseInt(e.currentTarget.value))}
                class="input"
              />
              <span class="help-text">
                How long to keep cached responses (1 - 365 days)
              </span>
            </div>
          </div>

          {stats() && (
            <div class="cache-stats">
              <h3>Cache Statistics</h3>
              
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">{stats().totalEntries.toLocaleString()}</div>
                  <div class="stat-label">Total Entries</div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-value">{stats().hitRate.toFixed(1)}%</div>
                  <div class="stat-label">Hit Rate</div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-value">{stats().cacheHits.toLocaleString()}</div>
                  <div class="stat-label">Cache Hits</div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-value">{stats().cacheMisses.toLocaleString()}</div>
                  <div class="stat-label">Cache Misses</div>
                </div>
                
                <div class="stat-card">
                  <div class="stat-value">{formatBytes(stats().storageSize)}</div>
                  <div class="stat-label">Storage Used</div>
                </div>
              </div>

              {Object.keys(stats().entriesByType).length > 0 && (
                <div class="breakdown">
                  <h4>Entries by Field Type</h4>
                  <div class="breakdown-list">
                    {Object.entries(stats().entriesByType).map(([type, count]: [string, any]) => (
                      <div class="breakdown-item">
                        <span class="breakdown-label">{type}</span>
                        <span class="breakdown-value">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(stats().entriesByCreativity).length > 0 && (
                <div class="breakdown">
                  <h4>Entries by Creativity Level</h4>
                  <div class="breakdown-list">
                    {Object.entries(stats().entriesByCreativity).map(([level, count]: [string, any]) => (
                      <div class="breakdown-item">
                        <span class="breakdown-label">{level}</span>
                        <span class="breakdown-value">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div class="cache-actions">
            <h3>Cache Management</h3>
            
            <div class="action-buttons">
              <button
                class="btn btn-secondary"
                onClick={cleanupCache}
              >
                🧹 Cleanup Expired
              </button>
              
              <button
                class={`btn btn-danger ${clearing() ? 'btn-loading' : ''}`}
                onClick={clearCache}
                disabled={clearing()}
              >
                {clearing() ? 'Clearing...' : '🗑️ Clear All Cache'}
              </button>
            </div>
            
            <p class="action-description">
              <strong>Cleanup:</strong> Removes expired entries and keeps only the most recent {props.settings.cache.maxEntries.toLocaleString()} entries.<br/>
              <strong>Clear All:</strong> Completely empties the cache. This cannot be undone.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default CacheSettings;