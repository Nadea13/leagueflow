const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

interface RequestOptions extends RequestInit {
  token?: string;
}

export class ApiClient {
  private static token: string | null = null;

  public static setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('leagueflow_access_token', token);
        // Set cookie so Next.js Middleware can read auth state
        document.cookie = `leagueflow_access_token=${token}; path=/; max-age=604800; SameSite=Lax`;
      } else {
        localStorage.removeItem('leagueflow_access_token');
        document.cookie = `leagueflow_access_token=; path=/; max-age=0; SameSite=Lax`;
      }
    }
  }

  public static getToken(): string | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('leagueflow_access_token');
      if (stored) {
        this.token = stored;
        // Keep cookie active and synchronized for Server Actions
        document.cookie = `leagueflow_access_token=${stored}; path=/; max-age=604800; SameSite=Lax`;
        return stored;
      }
      // Fallback check cookie
      const match = document.cookie.match(new RegExp('(^| )leagueflow_access_token=([^;]+)'));
      if (match) {
        this.token = match[2];
        localStorage.setItem('leagueflow_access_token', match[2]);
        return match[2];
      }
    }
    return this.token;
  }

  public static async fetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = options.token || this.getToken();

    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP Error ${res.status}`);
    }

    return res.json();
  }
}
