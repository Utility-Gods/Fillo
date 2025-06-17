import { FieldInfo } from '../types';

export class FormDetector {
  private fields: FieldInfo[] = [];
  private observer: MutationObserver;

  constructor() {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
  }

  start(): void {
    this.detectFields();
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type', 'name', 'id', 'placeholder']
    });
  }

  stop(): void {
    this.observer.disconnect();
  }

  private handleMutations(mutations: MutationRecord[]): void {
    let shouldRedetect = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (this.isFormField(element) || element.querySelector('input, textarea, select')) {
              shouldRedetect = true;
              break;
            }
          }
        }
      }
    }

    if (shouldRedetect) {
      this.detectFields();
    }
  }

  private detectFields(): void {
    const formFields = document.querySelectorAll('input, textarea, select');
    this.fields = [];

    formFields.forEach(field => {
      if (this.isFormField(field) && this.isVisible(field)) {
        const fieldInfo = this.analyzeField(field as HTMLElement);
        if (fieldInfo) {
          this.fields.push(fieldInfo);
        }
      }
    });

    this.notifyFieldsChanged();
  }

  private isFormField(element: Element): boolean {
    if (element.tagName === 'TEXTAREA') return true;
    if (element.tagName === 'SELECT') return true;
    
    if (element.tagName === 'INPUT') {
      const input = element as HTMLInputElement;
      const type = input.type.toLowerCase();
      return ['text', 'email', 'password', 'search', 'url', 'tel', 'number'].includes(type);
    }

    return false;
  }

  private isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  private analyzeField(element: HTMLElement): FieldInfo | null {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    const type = this.getFieldType(input);
    const label = this.getFieldLabel(input);
    const context = this.getFieldContext(input);
    const signature = this.generateSignature(type, label, context);

    return {
      element,
      type,
      label,
      context,
      signature
    };
  }

  private getFieldType(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    if (input.tagName === 'TEXTAREA') return 'textarea';
    if (input.tagName === 'SELECT') return 'select';
    
    const htmlInput = input as HTMLInputElement;
    const type = htmlInput.type.toLowerCase();
    
    // Infer semantic type from attributes
    const name = htmlInput.name?.toLowerCase() || '';
    const id = htmlInput.id?.toLowerCase() || '';
    const placeholder = htmlInput.placeholder?.toLowerCase() || '';
    const combined = `${name} ${id} ${placeholder}`;

    if (combined.includes('email')) return 'email';
    if (combined.includes('password')) return 'password';
    if (combined.includes('phone') || combined.includes('tel')) return 'phone';
    if (combined.includes('name')) return 'name';
    if (combined.includes('address')) return 'address';
    if (combined.includes('city')) return 'city';
    if (combined.includes('zip') || combined.includes('postal')) return 'zip';
    if (combined.includes('country')) return 'country';
    if (combined.includes('age')) return 'age';
    if (combined.includes('date') || combined.includes('birth')) return 'date';
    if (combined.includes('url') || combined.includes('website')) return 'url';
    if (combined.includes('company') || combined.includes('organization')) return 'company';
    if (combined.includes('title') || combined.includes('position')) return 'title';
    if (combined.includes('description') || combined.includes('bio')) return 'description';

    return type;
  }

  private getFieldLabel(input: HTMLElement): string {
    // Try to find associated label
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label.textContent?.trim() || '';
    }

    // Try parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      const text = parentLabel.textContent?.replace(input.textContent || '', '').trim();
      if (text) return text;
    }

    // Try adjacent text
    const prev = input.previousElementSibling;
    if (prev && prev.tagName === 'LABEL') {
      return prev.textContent?.trim() || '';
    }

    // Try placeholder or name
    const htmlInput = input as HTMLInputElement;
    return htmlInput.placeholder || htmlInput.name || 'Field';
  }

  private getFieldContext(input: HTMLElement): string {
    const form = input.closest('form');
    if (!form) return '';

    const formTitle = form.querySelector('h1, h2, h3, .title, .form-title');
    if (formTitle) return formTitle.textContent?.trim() || '';

    const formClass = form.className;
    if (formClass.includes('registration')) return 'registration';
    if (formClass.includes('login')) return 'login';
    if (formClass.includes('contact')) return 'contact';
    if (formClass.includes('profile')) return 'profile';
    if (formClass.includes('checkout')) return 'checkout';

    return 'form';
  }

  private generateSignature(type: string, label: string, context: string): string {
    return `${type}-${label}-${context}`.toLowerCase().replace(/\s+/g, '-');
  }

  private notifyFieldsChanged(): void {
    document.dispatchEvent(new CustomEvent('fillo:fields-changed', {
      detail: { fields: this.fields }
    }));
  }

  getFields(): FieldInfo[] {
    return this.fields;
  }
}