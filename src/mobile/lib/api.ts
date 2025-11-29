const getBaseUrl = () => {
  // In production, served from same origin
  if (window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('192.168')) {
    return '';
  }
  // Dev: use same hostname as the page (works for both localhost and network IP)
  return `http://${window.location.hostname}:7777`;
};

class ApiClient {
  private baseUrl = getBaseUrl();

  private getToken(): string | null {
    return localStorage.getItem('maestro_token');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = this.getToken();

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Maestro-Client': 'mobile', // CSRF protection header
        ...(token ? { Authorization: `Maestro ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      // Token expired - trigger refresh
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
      throw new Error('Token expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return res.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  async waitForHealth(retries = 20, interval = 1000): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.get('/api/health');
        return true;
      } catch (err) {
        console.log(`Waiting for server... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    return false;
  }
}

export const api = new ApiClient();

// === Typed API Helpers ===

export interface SpaceUpdatePayload {
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  icon?: string;
  next?: string | null;
  isActive?: boolean;
}

export const spacesApi = {
  // Update space properties
  updateSpace: (spaceId: string, updates: SpaceUpdatePayload) =>
    api.patch<{ success: boolean }>(`/api/spaces/${spaceId}`, updates),

  // Set "What's Next"
  setNext: (spaceId: string, next: string | null) =>
    api.put<{ success: boolean }>(`/api/spaces/${spaceId}/next`, { next }),

  // Create terminal
  createTerminal: (spaceId: string) =>
    api.post<{ success: boolean }>(`/api/spaces/${spaceId}/terminals`),

  // Create tab
  createTab: (spaceId: string, type: string, url?: string) =>
    api.post<{ success: boolean }>(`/api/spaces/${spaceId}/tabs`, { type, url }),

  // Close tab
  closeTab: (spaceId: string, tabId: string) =>
    api.delete<{ success: boolean }>(`/api/spaces/${spaceId}/tabs/${tabId}`),
};

export const tasksApi = {
  // Create task
  create: (spaceId: string, content: string) =>
    api.post<{ success: boolean }>(`/api/spaces/${spaceId}/tasks`, { content }),

  // Toggle task completion
  toggle: (spaceId: string, taskId: string) =>
    api.post<{ success: boolean }>(`/api/spaces/${spaceId}/tasks/${taskId}/toggle`),

  // Update task content
  update: (spaceId: string, taskId: string, content: string) =>
    api.patch<{ success: boolean }>(`/api/spaces/${spaceId}/tasks/${taskId}`, { content }),

  // Delete task
  delete: (spaceId: string, taskId: string) =>
    api.delete<{ success: boolean }>(`/api/spaces/${spaceId}/tasks/${taskId}`),
};

export const notesApi = {
  // Get notes content for a space
  get: (spaceId: string) =>
    api.get<{ notesContent: string | null }>(`/api/spaces/${spaceId}/notes`),

  // Update notes content (plain text - will be converted to Lexical format on server)
  update: (spaceId: string, content: string) =>
    api.put<{ success: boolean }>(`/api/spaces/${spaceId}/notes`, { content }),
};