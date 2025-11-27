import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';

export interface UrlHistoryEntry {
  url: string;
  title: string;
  visitedAt: Date;
  visitCount: number;
}

interface UrlHistoryState {
  entries: UrlHistoryEntry[];
}

const { store } = await persist<UrlHistoryState>(
  {
    entries: [],
  },
  'maestro-url-history',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 1000,
  }
);

export const urlHistoryStore = store;

export const urlHistoryActions = {
  /**
   * Add or update a URL in the history
   */
  addUrl(url: string, title = '') {
    const existingIndex = urlHistoryStore.entries.findIndex((entry) => entry.url === url);

    if (existingIndex >= 0) {
      // Update existing entry
      const entry = urlHistoryStore.entries[existingIndex];
      entry.visitedAt = new Date();
      entry.visitCount += 1;
      if (title) {
        entry.title = title;
      }
    } else {
      // Add new entry
      urlHistoryStore.entries.unshift({
        url,
        title,
        visitedAt: new Date(),
        visitCount: 1,
      });
    }

    // Keep only the most recent 1000 entries
    if (urlHistoryStore.entries.length > 1000) {
      urlHistoryStore.entries = urlHistoryStore.entries.slice(0, 1000);
    }
  },

  /**
   * Search URL history based on query
   */
  searchHistory(query: string): UrlHistoryEntry[] {
    if (!query) {
      // Return recent entries sorted by visit time
      return [...urlHistoryStore.entries]
        .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
        .slice(0, 10);
    }

    const lowerQuery = query.toLowerCase();

    // Filter and score entries
    const scored = urlHistoryStore.entries
      .map((entry) => {
        let score = 0;
        const lowerUrl = entry.url.toLowerCase();
        const lowerTitle = entry.title.toLowerCase();

        // Exact URL match gets highest score
        if (lowerUrl === lowerQuery) {
          score += 100;
        }
        // URL starts with query
        else if (lowerUrl.startsWith(lowerQuery)) {
          score += 50;
        }
        // URL contains query
        else if (lowerUrl.includes(lowerQuery)) {
          score += 25;
        }

        // Title matches
        if (lowerTitle.includes(lowerQuery)) {
          score += 15;
        }

        // Boost score by visit count (logarithmically)
        score += Math.log(entry.visitCount + 1) * 5;

        // Boost recent visits
        const daysSinceVisit =
          (Date.now() - new Date(entry.visitedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceVisit < 1) score += 10;
        else if (daysSinceVisit < 7) score += 5;

        return { entry, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return scored.map(({ entry }) => entry);
  },

  /**
   * Clear all history
   */
  clearHistory() {
    urlHistoryStore.entries = [];
  },

  /**
   * Remove a specific URL from history
   */
  removeUrl(url: string) {
    const index = urlHistoryStore.entries.findIndex((entry) => entry.url === url);
    if (index >= 0) {
      urlHistoryStore.entries.splice(index, 1);
    }
  },
};
