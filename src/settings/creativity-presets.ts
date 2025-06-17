export interface CreativityPreset {
  id: string;
  name: string;
  description: string;
  temperature: number;
  color: string;
  icon: string;
}

export const CREATIVITY_PRESETS: CreativityPreset[] = [
  {
    id: 'predictable',
    name: 'Predictable',
    description: 'Conservative, consistent responses',
    temperature: 0.2,
    color: '#0066cc',
    icon: '🎯'
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Good mix of accuracy and variation',
    temperature: 0.7,
    color: '#28a745',
    icon: '⚖️'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'More varied and creative responses',
    temperature: 1.0,
    color: '#fd7e14',
    icon: '🎨'
  },
  {
    id: 'experimental',
    name: 'Experimental',
    description: 'Highly creative, less predictable',
    temperature: 1.5,
    color: '#dc3545',
    icon: '🚀'
  }
];

export const FIELD_SPECIFIC_PRESETS: Record<string, number> = {
  'name': 0.3,
  'email': 0.1,
  'phone': 0.1,
  'address': 0.4,
  'city': 0.2,
  'company': 0.5,
  'title': 0.6,
  'description': 1.0,
  'bio': 1.2,
  'textarea': 1.0,
  'text': 0.7
};

export function getPresetByTemperature(temperature: number): CreativityPreset {
  return CREATIVITY_PRESETS.reduce((closest, preset) => {
    const currentDiff = Math.abs(preset.temperature - temperature);
    const closestDiff = Math.abs(closest.temperature - temperature);
    return currentDiff < closestDiff ? preset : closest;
  });
}

export function getTemperatureLabel(temperature: number): string {
  if (temperature <= 0.3) return 'Very Predictable';
  if (temperature <= 0.5) return 'Predictable';
  if (temperature <= 0.8) return 'Balanced';
  if (temperature <= 1.2) return 'Creative';
  if (temperature <= 1.5) return 'Very Creative';
  return 'Experimental';
}

export function getTemperatureColor(temperature: number): string {
  if (temperature <= 0.3) return '#0066cc';
  if (temperature <= 0.5) return '#17a2b8';
  if (temperature <= 0.8) return '#28a745';
  if (temperature <= 1.2) return '#fd7e14';
  if (temperature <= 1.5) return '#e83e8c';
  return '#dc3545';
}