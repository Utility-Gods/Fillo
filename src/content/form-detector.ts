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
            if (this.isFormField(element) || element.querySelector('input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], input[type="tel"], input[type="number"], input[type="file"], input:not([type]), textarea, select')) {
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
    // Only query for actual form input elements, exclude buttons and links
    const formFields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], input[type="tel"], input[type="number"], input[type="file"], input:not([type]), textarea, select');
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
      // Explicitly exclude button types and only include text-like inputs and file inputs
      const allowedTypes = ['text', 'email', 'password', 'search', 'url', 'tel', 'number', 'file'];
      const excludedTypes = ['button', 'submit', 'reset', 'image', 'checkbox', 'radio', 'hidden', 'range', 'color', 'date', 'datetime-local', 'month', 'time', 'week'];
      
      return allowedTypes.includes(type) && !excludedTypes.includes(type);
    }

    // Exclude button and link elements
    if (element.tagName === 'BUTTON') return false;
    if (element.tagName === 'A') return false;

    return false;
  }

  private isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    
    // For file inputs, they're often hidden for custom styling
    // We should include them if they have an associated label or are in a form
    const isFileInput = element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'file';
    
    if (isFileInput) {
      // Always include file inputs, even if hidden - the overlay manager will handle positioning
      return true;
    }
    
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
    
    // Handle file input types
    if (type === 'file') {
      const accept = htmlInput.accept?.toLowerCase() || '';
      const name = htmlInput.name?.toLowerCase() || '';
      const id = htmlInput.id?.toLowerCase() || '';
      const combined = `${accept} ${name} ${id}`;
      
      if (accept.includes('image/') || combined.includes('image') || combined.includes('photo') || combined.includes('picture')) {
        return 'image';
      }
      return 'file';
    }
    
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