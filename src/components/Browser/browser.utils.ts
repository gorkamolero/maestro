/**
 * Normalize URL to ensure it has a valid scheme
 * Matches the logic in Rust navigate_webview
 */
export function normalizeUrl(url: string): string {
  if (!url || !url.trim()) return 'about:blank';

  const trimmed = url.trim();

  // Already has a valid scheme
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed === 'about:blank'
  ) {
    return trimmed;
  }

  // Handle localhost addresses (with or without port)
  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
    return `http://${trimmed}`;
  }

  // Looks like a domain (contains a dot but no spaces)
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }

  // Otherwise treat as search query
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}
