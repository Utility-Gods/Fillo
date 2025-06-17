import { Component, createSignal, For } from 'solid-js';
import { Settings } from '../../types';
import { CREATIVITY_PRESETS, getTemperatureLabel, getTemperatureColor, FIELD_SPECIFIC_PRESETS } from '../../settings/creativity-presets';

interface CreativitySettingsProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const CreativitySettings: Component<CreativitySettingsProps> = (props) => {
  const [selectedFieldType, setSelectedFieldType] = createSignal<string | null>(null);

  const handleCreativityChange = (level: number) => {
    const newSettings = {
      ...props.settings,
      creativity: {
        ...props.settings.creativity,
        level
      }
    };
    props.onSettingsChange(newSettings);
  };

  const handlePresetSelect = (preset: typeof CREATIVITY_PRESETS[0]) => {
    const newSettings = {
      ...props.settings,
      creativity: {
        ...props.settings.creativity,
        level: preset.temperature,
        preset: preset.id
      }
    };
    props.onSettingsChange(newSettings);
  };

  const handleFieldSpecificChange = (fieldType: string, level: number) => {
    const newSettings = {
      ...props.settings,
      creativity: {
        ...props.settings.creativity,
        fieldSpecific: {
          ...props.settings.creativity.fieldSpecific,
          [fieldType]: level
        }
      }
    };
    props.onSettingsChange(newSettings);
  };

  const removeFieldSpecific = (fieldType: string) => {
    const newFieldSpecific = { ...props.settings.creativity.fieldSpecific };
    delete newFieldSpecific[fieldType];
    
    const newSettings = {
      ...props.settings,
      creativity: {
        ...props.settings.creativity,
        fieldSpecific: newFieldSpecific
      }
    };
    props.onSettingsChange(newSettings);
  };

  const getCreativityPercentage = () => {
    return ((props.settings.creativity.level - 0.1) / (2.0 - 0.1)) * 100;
  };

  return (
    <div class="creativity-settings">
      <div class="main-creativity">
        <h3>Global Creativity Level</h3>
        <p>Control how creative and varied the generated content should be across all fields.</p>

        <div class="creativity-slider-container">
          <div class="slider-header">
            <span 
              class="current-level"
              style={{ color: getTemperatureColor(props.settings.creativity.level) }}
            >
              {getTemperatureLabel(props.settings.creativity.level)}
            </span>
            <span class="current-value">
              {props.settings.creativity.level.toFixed(1)}
            </span>
          </div>

          <div class="slider-wrapper">
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={props.settings.creativity.level}
              onInput={(e) => handleCreativityChange(parseFloat(e.currentTarget.value))}
              class="creativity-slider"
              style={{
                background: `linear-gradient(to right, #0066cc 0%, #28a745 35%, #fd7e14 70%, #dc3545 100%)`
              }}
            />
            <div 
              class="slider-thumb"
              style={{
                left: `${getCreativityPercentage()}%`,
                'background-color': getTemperatureColor(props.settings.creativity.level)
              }}
            />
          </div>

          <div class="slider-labels">
            <span>Predictable</span>
            <span>Balanced</span>
            <span>Creative</span>
            <span>Experimental</span>
          </div>
        </div>

        <div class="presets">
          <h4>Quick Presets</h4>
          <div class="preset-buttons">
            <For each={CREATIVITY_PRESETS}>
              {(preset) => (
                <button
                  class={`preset-btn ${props.settings.creativity.preset === preset.id ? 'active' : ''}`}
                  onClick={() => handlePresetSelect(preset)}
                  style={{ 'border-color': preset.color }}
                >
                  <span class="preset-icon">{preset.icon}</span>
                  <div class="preset-info">
                    <div class="preset-name">{preset.name}</div>
                    <div class="preset-desc">{preset.description}</div>
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>

      <div class="field-specific">
        <h3>Field-Specific Settings</h3>
        <p>Override creativity levels for specific field types.</p>

        <div class="field-list">
          <For each={Object.entries(props.settings.creativity.fieldSpecific)}>
            {([fieldType, level]) => (
              <div class="field-item">
                <div class="field-info">
                  <span class="field-type">{fieldType}</span>
                  <span 
                    class="field-level"
                    style={{ color: getTemperatureColor(level) }}
                  >
                    {getTemperatureLabel(level)} ({level.toFixed(1)})
                  </span>
                </div>
                <div class="field-controls">
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={level}
                    onInput={(e) => handleFieldSpecificChange(fieldType, parseFloat(e.currentTarget.value))}
                    class="field-slider"
                  />
                  <button
                    class="btn-remove"
                    onClick={() => removeFieldSpecific(fieldType)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>

        <div class="add-field">
          <select
            value={selectedFieldType() || ''}
            onChange={(e) => setSelectedFieldType(e.currentTarget.value || null)}
            class="field-select"
          >
            <option value="">Add field-specific setting...</option>
            <For each={Object.entries(FIELD_SPECIFIC_PRESETS)}>
              {([fieldType, defaultLevel]) => (
                <option 
                  value={fieldType}
                  disabled={fieldType in props.settings.creativity.fieldSpecific}
                >
                  {fieldType} (default: {defaultLevel})
                </option>
              )}
            </For>
          </select>
          
          {selectedFieldType() && (
            <button
              class="btn btn-secondary"
              onClick={() => {
                const fieldType = selectedFieldType()!;
                handleFieldSpecificChange(fieldType, FIELD_SPECIFIC_PRESETS[fieldType] || 0.7);
                setSelectedFieldType(null);
              }}
            >
              Add Override
            </button>
          )}
        </div>

        <div class="field-examples">
          <h4>Default Field Recommendations</h4>
          <div class="example-grid">
            <For each={Object.entries(FIELD_SPECIFIC_PRESETS)}>
              {([fieldType, level]) => (
                <div class="example-item">
                  <span class="example-field">{fieldType}</span>
                  <span 
                    class="example-level"
                    style={{ color: getTemperatureColor(level) }}
                  >
                    {level.toFixed(1)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativitySettings;