export function isLocalhost(url?: string): boolean {
  try {
    const hostname = new URL(url || window.location.href).hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' ||
           hostname.endsWith('.localhost');
  } catch {
    return false;
  }
}

export function shouldActivate(): boolean {
  // Check if we're on localhost - don't require complete state since we init on DOMContentLoaded
  return isLocalhost();
}