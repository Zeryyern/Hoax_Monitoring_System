// API Client Service for Frontend

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').trim();

interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  details?: string;
}

interface AuthTokens {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: 'user' | 'admin';
  };
}

class ApiClient {
  private baseUrl: string;
  private lastWorkingBaseUrl: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getRequestCandidates(endpoint: string): string[] {
    const relative = `/api${endpoint}`;
    const candidates: string[] = [];
    const runtimeDefault = `${window.location.hostname}:5000`;
    const normalizedBase = this.baseUrl.replace(/\/+$/, '');
    const isProd = import.meta.env.PROD;

    if (normalizedBase) {
      const absolute = normalizedBase.endsWith('/api')
        ? `${normalizedBase}${endpoint}`
        : `${normalizedBase}/api${endpoint}`;
      candidates.push(absolute);
    }

    if (!isProd) {
      // Development fallback candidates only.
      candidates.push(`http://127.0.0.1:5000/api${endpoint}`);
      candidates.push(`http://localhost:5000/api${endpoint}`);
      candidates.push(`http://${runtimeDefault}/api${endpoint}`);
      candidates.push(`https://${runtimeDefault}/api${endpoint}`);
      if (normalizedBase) {
        const absolute = normalizedBase.endsWith('/api')
          ? `${normalizedBase}${endpoint}`
          : `${normalizedBase}/api${endpoint}`;
        candidates.push(absolute.replace('localhost', '127.0.0.1'));
        candidates.push(absolute.replace('127.0.0.1', 'localhost'));
      }
    }

    // Same-origin fallback is useful in development or when no explicit API base is configured.
    if (!isProd || !normalizedBase) {
      candidates.push(relative);
    }

    return Array.from(new Set(candidates));
  }

  private getAuthHeader(): Record<string, string> {
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    if (token && !sessionStorage.getItem('auth_token')) {
      sessionStorage.setItem('auth_token', token);
      localStorage.removeItem('auth_token');
    }
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private clearAuthSession() {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('current_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }

  private hasStoredAuthToken(): boolean {
    return Boolean(sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token'));
  }

  private isInvalidTokenMessage(message?: string): boolean {
    const value = (message || '').toLowerCase();
    return value.includes('invalid token') || value.includes('token expired') || value.includes('unauthorized');
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const buildOptions = (): RequestInit => {
      const options: RequestInit = {
        method,
        headers: this.getAuthHeader(),
        cache: 'no-store',
      };
      if (data !== undefined) {
        options.headers = {
          ...options.headers,
          'Content-Type': 'application/json',
        };
        options.body = JSON.stringify(data);
      }
      return options;
    };

    try {
      let response: Response | null = null;
      let responseBodyText = '';
      let lastError: unknown = null;
      const orderedCandidates = this.getRequestCandidates(endpoint);
      const candidates =
        this.lastWorkingBaseUrl === null
          ? orderedCandidates
          : [
              `${this.lastWorkingBaseUrl}/api${endpoint}`,
              ...orderedCandidates.filter((url) => !url.startsWith(this.lastWorkingBaseUrl as string)),
            ];
      const attemptedErrors: string[] = [];

      for (const candidate of candidates) {
        try {
          const currentResponse = await fetch(candidate, buildOptions());
          const currentText = await currentResponse.clone().text();
          const contentType = currentResponse.headers.get('content-type') || '';

          if (currentResponse.status >= 500) {
            attemptedErrors.push(`${candidate} -> HTTP ${currentResponse.status}`);
            lastError = new Error(`API error on ${candidate}: HTTP ${currentResponse.status}`);
            continue;
          }

          // Reject frontend HTML pages returned from a same-origin fallback when we expected JSON.
          const looksLikeHtml = contentType.includes('text/html');
          if (looksLikeHtml) {
            attemptedErrors.push(`${candidate} -> unexpected HTML response`);
            lastError = new Error(`Unexpected HTML response from ${candidate}`);
            continue;
          }

          response = currentResponse;
          responseBodyText = currentText;
          const match = candidate.match(/^(https?:\/\/[^/]+)\/api\//);
          if (match) {
            this.lastWorkingBaseUrl = match[1];
          }
          break;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : 'network error';
          attemptedErrors.push(`${candidate} -> ${message}`);
        }
      }

        if (!response) {
          const diagnostic = attemptedErrors.slice(0, 4).join(' | ');
          const lastMessage = lastError instanceof Error ? lastError.message : 'unknown network error';
          throw new Error(
          `Unable to reach backend API. Last error: ${lastMessage}. Attempts: ${diagnostic}`
        );
      }

      const result =
        response.headers.get('content-type')?.includes('application/json')
          ? ((await response.json()) as ApiResponse<T>)
          : ({
              status: response.ok ? 'success' : 'error',
              message: responseBodyText || `HTTP ${response.status}`,
            } as ApiResponse<T>);

      const isAuthEntryRoute = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register');
      const shouldExpireSession =
        this.isInvalidTokenMessage(result.message) ||
        (response.status === 401 && this.hasStoredAuthToken() && !isAuthEntryRoute);

      if (shouldExpireSession) {
        this.clearAuthSession();
      }

      if (!response.ok || result.status === 'error') {
        return {
          success: false,
          error: result.message || 'An error occurred',
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error: failed to connect to backend API',
      };
    }
  }

  // ===============================
  // AUTHENTICATION
  // ===============================

  async register(username: string, email: string, password: string) {
    return this.request<AuthTokens>('/auth/register', 'POST', {
      username,
      email,
      password,
    });
  }

  async createPasswordResetTicket(
    fullName: string,
    email: string,
    message?: string,
    ticketType: 'user' | 'admin' = 'user',
    adminUniqueId?: string
  ) {
    return this.request<{ ticket_id: number; status: 'open' | 'resolved' }>('/password-reset-tickets', 'POST', {
      full_name: fullName,
      email,
      message,
      ticket_type: ticketType,
      admin_unique_id: adminUniqueId || '',
    });
  }

  async login(email: string, password: string, loginType: 'any' | 'user' | 'admin' = 'any') {
    const result = await this.request<AuthTokens>('/auth/login', 'POST', {
      email,
      password,
      login_type: loginType,
    });

    if (result.success && result.data) {
      sessionStorage.setItem('auth_token', result.data.token);
      sessionStorage.setItem('current_user', JSON.stringify(result.data.user));
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }

    return result;
  }

  async logout() {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('current_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    return { success: true };
  }

  async getCurrentUser() {
    return this.request('/auth/me', 'GET');
  }

  // ===============================
  // NEWS
  // ===============================

  async getNews(
    page = 1,
    limit = 20,
    category?: string,
    prediction?: string,
    source?: string,
    search?: string,
  ) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (category) params.append('category', category);
    if (prediction) params.append('prediction', prediction);
    if (source) params.append('source', source);
    if (search) params.append('search', search);

    return this.request<{
      items: any[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/news?${params}`, 'GET');
  }

  async getNewsDetail(newsId: number) {
    return this.request(`/news/${newsId}`, 'GET');
  }

  async getRecentNews(limit = 10) {
    return this.request<any[]>(`/news/recent?limit=${limit}`, 'GET');
  }

  async searchHoaxClaims(q: string, limit = 10, perGroup = 5) {
    const params = new URLSearchParams({
      q: String(q || '').trim(),
      limit: String(limit),
      per_group: String(perGroup),
    });
    return this.request<any[]>(`/hoax/search?${params.toString()}`, 'GET');
  }

  async analyzeText(text: string, source?: string, category?: string) {
    return this.request('/analyze', 'POST', {
      text,
      source,
      category,
    });
  }

  // ===============================
  // ADMIN
  // ===============================

  async getAdminDashboard(days = 30) {
    const params = new URLSearchParams({ days: String(days) });
    return this.request(`/admin/dashboard?${params.toString()}`, 'GET');
  }

  async getAdminUsers(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request(`/admin/users?${params}`, 'GET');
  }

  async changeUserRole(userId: number, role: 'user' | 'admin') {
    return this.request(`/admin/users/${userId}/role`, 'PUT', { role });
  }

  async deleteUser(userId: number) {
    return this.request(`/admin/users/${userId}`, 'DELETE');
  }

  async changeUserStatus(userId: number, isActive: boolean) {
    return this.request<{ user_id: number; is_active: boolean }>(`/admin/users/${userId}/status`, 'PUT', {
      is_active: isActive,
    });
  }

  async addHoaxAnalyticsEntry(payload: {
    title: string;
    source: string;
    article?: string;
    source_url?: string;
    category?: string;
    published_date?: string;
    confidence?: number;
  }) {
    return this.request('/admin/hoax-analytics', 'POST', payload);
  }

  async getAdminLogs(page = 1, limit = 50) {
    return this.request<{
      logs: any[];
      total: number;
      today_total: number;
      unique_admins_total: number;
      can_reset: boolean;
      page: number;
      limit: number;
      total_pages: number;
    }>(`/admin/logs?page=${page}&limit=${limit}`, 'GET');
  }

  async resetAdminLogs() {
    return this.request<{ removed: number }>('/admin/logs/reset', 'POST');
  }

  async enrichRecentNews(days = 30, limit = 200) {
    return this.request<{ updated: number; failed: number; days: number; limit: number }>(
      '/admin/news/enrich',
      'POST',
      { days, limit }
    );
  }

  async getPasswordResetTickets(page = 1, limit = 20, status: 'all' | 'open' | 'resolved' = 'all') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status,
    });
    return this.request<{
      items: any[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/admin/password-reset-tickets?${params.toString()}`, 'GET');
  }

  async resolvePasswordResetTicket(
    ticketId: number,
    adminUniqueId: string,
    resolutionNote?: string,
    resetUsername?: string,
    resetPassword?: string
  ) {
    return this.request<{ ticket_id: number; status: 'resolved' }>(
      `/admin/password-reset-tickets/${ticketId}/resolve`,
      'PUT',
      {
        admin_unique_id: adminUniqueId,
        resolution_note: resolutionNote || '',
        reset_username: resetUsername || '',
        reset_password: resetPassword || '',
      }
    );
  }

  async deletePasswordResetTicket(ticketId: number, adminUniqueId: string, deleteReason?: string) {
    return this.request<{ ticket_id: number; deleted: true }>(
      `/admin/password-reset-tickets/${ticketId}`,
      'DELETE',
      {
        admin_unique_id: adminUniqueId,
        delete_reason: deleteReason || '',
      }
    );
  }

  async getScrapingStatus() {
    return this.request<{
      is_running: boolean;
      interval_seconds: number;
      started_at: string | null;
      last_run_at: string | null;
      last_summary: any;
      sources: any[];
    }>('/admin/scraping/status', 'GET');
  }

  async getScrapingSources() {
    return this.request<any[]>('/admin/scraping/sources', 'GET');
  }

  async startScraping(intervalSeconds = 300, maxRuntimeSeconds?: number) {
    return this.request('/admin/scraping/start', 'POST', {
      interval_seconds: intervalSeconds,
      ...(maxRuntimeSeconds ? { max_runtime_seconds: maxRuntimeSeconds } : {}),
    });
  }

  async stopScraping() {
    return this.request('/admin/scraping/stop', 'POST');
  }

  async runAllScrapers() {
    return this.request('/admin/scraping/run-all', 'POST');
  }

  async runSingleScraper(sourceKey: string) {
    return this.request(`/admin/scraping/run-source/${sourceKey}`, 'POST');
  }

  async startSingleScraper(sourceKey: string, intervalSeconds = 300, maxRuntimeSeconds?: number) {
    return this.request(`/admin/scraping/start-source/${sourceKey}`, 'POST', {
      interval_seconds: intervalSeconds,
      ...(maxRuntimeSeconds ? { max_runtime_seconds: maxRuntimeSeconds } : {}),
    });
  }

  async stopSingleScraper(sourceKey: string) {
    return this.request(`/admin/scraping/stop-source/${sourceKey}`, 'POST');
  }

  async resetScrapedData() {
    return this.request('/admin/scraping/reset-data', 'POST');
  }

  // ===============================
  // USER
  // ===============================

  async getUserProfile() {
    return this.request('/user/profile', 'GET');
  }

  async getUserAnalysisHistory(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request(`/user/analysis?${params}`, 'GET');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/user/profile/password', 'PUT', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // ===============================
  // STATISTICS
  // ===============================

  async getRecentStatistics(days = 7) {
    return this.request(`/statistics/recent?days=${days}`, 'GET');
  }

  async getHealthStatus() {
    return this.request('/health', 'GET');
  }
}

export const apiClient = new ApiClient();


