const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8080/api/v1';
  }
  return 'https://leagueflow-v80x.onrender.com/api/v1';
};

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

export class ApiClient {
  private static token: string | null = null;

  public static setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      const secureFlag = isHttps ? '; Secure' : '';
      if (token) {
        localStorage.setItem('leagueflow_access_token', token);
        // Set cookie so Next.js Middleware can read auth state
        document.cookie = `leagueflow_access_token=${token}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
      } else {
        localStorage.removeItem('leagueflow_access_token');
        document.cookie = `leagueflow_access_token=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
      }
    }
  }

  public static getToken(): string | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('leagueflow_access_token');
      if (stored) {
        this.token = stored;
        const isHttps = window.location.protocol === 'https:';
        const secureFlag = isHttps ? '; Secure' : '';
        // Keep cookie active and synchronized for Server Actions
        document.cookie = `leagueflow_access_token=${stored}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
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
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = options.token || this.getToken();

    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      throw new ApiError(networkErr?.message || 'Network error', 0);
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new ApiError(errorData.error || `HTTP Error ${res.status}`, res.status, errorData);
    }

    return res.json();
  }
}
