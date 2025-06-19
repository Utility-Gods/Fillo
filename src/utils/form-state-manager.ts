export interface FormState {
  formId: string;
  fields: Map<string, FieldValue>;
  lastUpdated: number;
}

export interface FieldValue {
  name: string;
  value: string;
  type: string;
  label?: string;
}

export class FormStateManager {
  private static instance: FormStateManager;
  private formStates: Map<string, FormState> = new Map();
  
  private constructor() {}
  
  static getInstance(): FormStateManager {
    if (!FormStateManager.instance) {
      FormStateManager.instance = new FormStateManager();
    }
    return FormStateManager.instance;
  }
  
  getFormState(element: HTMLElement): FormState | null {
    const form = element.closest('form');
    if (!form) return null;
    
    const formId = this.getFormId(form);
    return this.formStates.get(formId) || null;
  }
  
  updateFieldValue(element: HTMLElement, value: string): void {
    const form = element.closest('form');
    if (!form) return;
    
    const formId = this.getFormId(form);
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    if (!this.formStates.has(formId)) {
      this.formStates.set(formId, {
        formId,
        fields: new Map(),
        lastUpdated: Date.now()
      });
    }
    
    const formState = this.formStates.get(formId)!;
    const fieldKey = input.name || input.id || `field_${formState.fields.size}`;
    
    formState.fields.set(fieldKey, {
      name: input.name || '',
      value: value,
      type: (input as HTMLInputElement).type || input.tagName.toLowerCase(),
      label: this.getFieldLabel(input as HTMLElement)
    });
    
    formState.lastUpdated = Date.now();
  }
  
  private getFormId(form: HTMLElement): string {
    // Try to get a unique identifier for the form
    const id = form.id || form.getAttribute('name') || '';
    const action = form.getAttribute('action') || '';
    const method = form.getAttribute('method') || 'get';
    
    // Create a hash-like identifier
    return `form_${id}_${action}_${method}_${form.className}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  
  private getFieldLabel(element: HTMLElement): string | undefined {
    // Check for label with 'for' attribute
    const id = element.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent?.trim() || undefined;
      }
    }
    
    // Check for wrapping label
    let current = element.parentElement;
    while (current && current.tagName.toLowerCase() !== 'form') {
      if (current.tagName.toLowerCase() === 'label') {
        return current.textContent?.trim() || undefined;
      }
      current = current.parentElement;
    }
    
    return undefined;
  }
  
  clearFormState(element: HTMLElement): void {
    const form = element.closest('form');
    if (!form) return;
    
    const formId = this.getFormId(form);
    this.formStates.delete(formId);
  }
  
  clearAllStates(): void {
    this.formStates.clear();
  }
}