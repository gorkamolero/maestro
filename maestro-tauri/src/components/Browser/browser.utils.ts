/**
 * Normalize URL to ensure it has a valid scheme
 * Matches the logic in Rust navigate_webview
 */
export function normalizeUrl(url: string): string {
  if (!url || !url.trim()) return 'https://www.google.com';

  const trimmed = url.trim();

  // Already has a valid scheme
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed === 'about:blank') {
    return trimmed;
  }

  // Looks like a domain (contains a dot but no spaces)
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }

  // Otherwise treat as search query
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}
