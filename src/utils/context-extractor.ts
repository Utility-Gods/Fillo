export interface PageContext {
  title: string;
  description?: string;
  keywords?: string;
  url: string;
  hostname: string;
  parentElements: string[];
  nearbyText: string;
  formPurpose?: string;
}

export class ContextExtractor {
  static extractPageContext(element: HTMLElement): PageContext {
    const context: PageContext = {
      title: document.title || '',
      url: window.location.href,
      hostname: window.location.hostname,
      parentElements: [],
      nearbyText: ''
    };

    // Extract meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      context.description = metaDescription.getAttribute('content') || undefined;
    }

    // Extract meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      context.keywords = metaKeywords.getAttribute('content') || undefined;
    }

    // Extract parent element context
    context.parentElements = this.getParentElementContext(element);

    // Extract nearby text content
    context.nearbyText = this.getNearbyText(element);

    // Try to determine form purpose from context
    context.formPurpose = this.inferFormPurpose(element, context);

    return context;
  }

  private static getParentElementContext(element: HTMLElement): string[] {
    const contexts: string[] = [];
    let current = element.parentElement;
    let depth = 0;
    const maxDepth = 5; // Limit traversal depth

    while (current && depth < maxDepth) {
      // Extract meaningful context from parent elements
      const tagName = current.tagName.toLowerCase();
      
      // Form context
      if (tagName === 'form') {
        const formName = current.getAttribute('name') || current.getAttribute('id');
        if (formName) {
          contexts.push(`form: ${formName}`);
        }
        
        const action = current.getAttribute('action');
        if (action) {
          contexts.push(`form action: ${action}`);
        }
      }

      // Fieldset context
      if (tagName === 'fieldset') {
        const legend = current.querySelector('legend');
        if (legend) {
          contexts.push(`fieldset: ${legend.textContent?.trim()}`);
        }
      }

      // Section context
      if (tagName === 'section') {
        const heading = current.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading) {
          contexts.push(`section: ${heading.textContent?.trim()}`);
        }
      }

      // Div with meaningful class or id
      if (tagName === 'div') {
        const className = current.className;
        const id = current.id;
        
        if (className && this.isMeaningfulClassName(className)) {
          contexts.push(`div class: ${className}`);
        }
        
        if (id && this.isMeaningfulId(id)) {
          contexts.push(`div id: ${id}`);
        }
      }

      // Article context
      if (tagName === 'article') {
        const heading = current.querySelector('h1, h2, h3');
        if (heading) {
          contexts.push(`article: ${heading.textContent?.trim()}`);
        }
      }

      current = current.parentElement;
      depth++;
    }

    return contexts.filter(Boolean);
  }

  private static getNearbyText(element: HTMLElement): string {
    const textParts: string[] = [];
    
    // Get preceding label or text
    const label = this.getAssociatedLabel(element);
    if (label) {
      textParts.push(label);
    }

    // Get placeholder text
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) {
      textParts.push(`placeholder: ${placeholder}`);
    }

    // Get nearby sibling text
    const siblings = this.getNearbyElements(element, 2);
    siblings.forEach(sibling => {
      const text = sibling.textContent?.trim();
      if (text && text.length < 200 && text.length > 5) {
        textParts.push(text);
      }
    });

    return textParts.join(' | ').substring(0, 500); // Limit context length
  }

  private static getAssociatedLabel(element: HTMLElement): string | null {
    // Check for label with 'for' attribute
    const id = element.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent?.trim() || null;
      }
    }

    // Check for wrapping label
    let current = element.parentElement;
    while (current && current.tagName.toLowerCase() !== 'form') {
      if (current.tagName.toLowerCase() === 'label') {
        return current.textContent?.trim() || null;
      }
      current = current.parentElement;
    }

    return null;
  }

  private static getNearbyElements(element: HTMLElement, radius: number): Element[] {
    const elements: Element[] = [];
    const parent = element.parentElement;
    
    if (!parent) return elements;

    const allSiblings = Array.from(parent.children);
    const elementIndex = allSiblings.indexOf(element);
    
    const start = Math.max(0, elementIndex - radius);
    const end = Math.min(allSiblings.length, elementIndex + radius + 1);
    
    for (let i = start; i < end; i++) {
      if (i !== elementIndex) {
        elements.push(allSiblings[i]);
      }
    }

    return elements;
  }

  private static inferFormPurpose(element: HTMLElement, context: PageContext): string | undefined {
    const indicators = [
      context.title.toLowerCase(),
      context.description?.toLowerCase() || '',
      context.keywords?.toLowerCase() || '',
      ...context.parentElements.map(p => p.toLowerCase()),
      context.nearbyText.toLowerCase()
    ].join(' ');

    // Common form purposes
    const purposes: Record<string, string[]> = {
      'registration': ['register', 'signup', 'sign up', 'create account', 'join'],
      'login': ['login', 'sign in', 'signin', 'authentication', 'auth'],
      'contact': ['contact', 'get in touch', 'reach out', 'inquir'],
      'checkout': ['checkout', 'payment', 'billing', 'order', 'purchase'],
      'profile': ['profile', 'account settings', 'personal info', 'edit profile'],
      'search': ['search', 'find', 'filter', 'query'],
      'feedback': ['feedback', 'review', 'rating', 'comment'],
      'newsletter': ['newsletter', 'subscribe', 'email updates'],
      'booking': ['book', 'reserve', 'appointment', 'schedule'],
      'application': ['apply', 'application', 'job', 'submit']
    };

    for (const [purpose, keywords] of Object.entries(purposes)) {
      if (keywords.some(keyword => indicators.includes(keyword))) {
        return purpose;
      }
    }

    return undefined;
  }

  private static isMeaningfulClassName(className: string): boolean {
    const meaningfulPatterns = [
      'form', 'input', 'field', 'register', 'login', 'contact', 
      'checkout', 'profile', 'search', 'submit', 'user', 'account',
      'address', 'payment', 'billing', 'personal', 'info'
    ];
    
    const normalizedClass = className.toLowerCase();
    return meaningfulPatterns.some(pattern => normalizedClass.includes(pattern));
  }

  private static isMeaningfulId(id: string): boolean {
    const meaningfulPatterns = [
      'form', 'input', 'field', 'register', 'login', 'contact',
      'checkout', 'profile', 'search', 'submit', 'user', 'account',
      'address', 'payment', 'billing', 'personal', 'info'
    ];
    
    const normalizedId = id.toLowerCase();
    return meaningfulPatterns.some(pattern => normalizedId.includes(pattern));
  }
}