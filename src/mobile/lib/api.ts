const getBaseUrl = () => {
  // In production, served from same origin
  if (window.location.hostname !== 'localhost') {
    return '';
  }
  // Dev: point to local server
  return 'http://localhost:7777';
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

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();