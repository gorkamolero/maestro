/**
 * Browser utilities for URL handling and tab management
 */

/**
 * Validate and normalize a URL
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();

  // If empty, return default
  if (!trimmed) {
    return 'about:blank';
  }

  // If it looks like a search query (no dots, no protocol), treat as search
  if (!trimmed.includes('.') && !trimmed.includes('://') && !trimmed.includes('localhost')) {
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  // If no protocol, add https://
  if (!trimmed.match(/^[a-z]+:\/\//i)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Extract domain from URL for display
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Get favicon URL for a given domain
 */
export function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '';
  }
}

/**
 * Check if URL is navigable (not about:blank, etc.)
 */
export function isNavigableUrl(url: string): boolean {
  return url !== 'about:blank' && url.trim().length > 0;
}

/**
 * Generate a unique tab ID
 */
export function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Truncate title for display
 */
export function truncateTitle(title: string, maxLength: number = 30): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + '...';
}

/**
 * Check if a URL is safe to load
 * Basic validation to prevent obviously malicious URLs
 */
export function isSafeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol;

    // Only allow http, https, and about protocols
    if (!['http:', 'https:', 'about:'].includes(protocol)) {
      return false;
    }

    // Block localhost access (can be configured to allow)
    // if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
    //   return false;
    // }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get default browser profile path for a space
 */
export function getProfilePath(spaceId: string): string {
  return `browser-profiles/${spaceId}`;
}
