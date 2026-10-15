// Client API helper for AIValueGuard

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'member';
  emailVerified: boolean;
  createdAt: string;
}

export interface ModelConfig {
  id: string;
  provider: string;
  name: string;
  modelIdentifier: string;
  inputCostPerM: number;
  outputCostPerM: number;
  maxContextTokens: number;
  capabilities: string[];
  qualityTier: 'standard' | 'balanced' | 'flagship';
  baselineLatencyMs: number;
  qualityScore: number;
  isActive: boolean;
  isCustom?: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  providerType: 'gemini' | 'openai_compatible' | 'anthropic_compatible';
  apiKeyConfigured: boolean;
  endpointUrl?: string;
  isActive: boolean;
  lastTestedAt?: string;
  status: 'operational' | 'unconfigured' | 'error';
  errorMessage?: string;
}

export interface RequestLog {
  id: string;
  userId: string;
  timestamp: string;
  taskCategory: string;
  provider: string;
  modelId: string;
  modelName: string;
  baselineModelId?: string;
  baselineModelName?: string;
  routingDecision: string;
  cacheStatus: 'hit' | 'miss' | 'disabled';
  inputTokens: number;
  outputTokens: number;
  tokenSource: 'provider' | 'estimated';
  estimatedCost: number;
  baselineCost: number;
  netSavings: number;
  optimizationOverhead: number;
  latencyMs: number;
  validationStatus: 'passed' | 'failed' | 'bypassed';
  retryCount: number;
  fallbackApplied: boolean;
  promptPreview: string;
  responsePreview: string;
  contextOptimizationApplied: boolean;
  tokensSavedContext: number;
  isDemo?: boolean;
}

export interface DashboardSummary {
  totalRequests: number;
  totalRecordedCost: number;
  totalBaselineCost: number;
  netCostSavings: number;
  savingsPercentage: number;
  avgLatency: number;
  cacheHitRate: number;
  qualityPassRate: number;
  recentRequests: RequestLog[];
}

export interface CacheAnalytics {
  totalEntries: number;
  totalHits: number;
  totalCostAvoided: number;
  totalStorageKb: number;
  entries: any[];
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  datasetCategory: string;
  testCaseCount: number;
  baselineModelId: string;
  optimizedModelTiers: string[];
  cacheEnabled: boolean;
  contextOptEnabled: boolean;
  qualityThreshold: number;
  maxLatencyMs: number;
  maxBudgetUsd: number;
  status: 'idle' | 'running' | 'completed' | 'cancelled';
  progressPercentage: number;
  resultsSummary?: {
    totalTestCases: number;
    successfulCases: number;
    failedCases: number;
    totalBaselineCost: number;
    totalOptimizedCost: number;
    measuredOverhead: number;
    netSavings: number;
    savingsPercentage: number;
    avgBaselineLatencyMs: number;
    avgOptimizedLatencyMs: number;
    p95LatencyMs: number;
    cacheHitRate: number;
    validationPassRate: number;
    fallbackRate: number;
  };
  createdAt: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export interface UserSettings {
  id: string;
  userId: string;
  defaultRoutingPolicy: 'cost_first' | 'quality_first' | 'balanced' | 'latency_first';
  cacheTtlSeconds: number;
  cacheEnabled: boolean;
  contextOptEnabled: boolean;
  qualityThreshold: number;
  maxRetries: number;
  latencyLimitMs: number;
  budgetLimitUsd: number;
  darkMode: boolean;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP error ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: any) => request<{ message: string; user: User; sessionToken: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request<{ message: string; user: User; sessionToken: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  getMe: () => request<{ user: User | null }>('/api/auth/me'),
  forgotPassword: (email: string) => request<{ message: string; devToken?: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload: any) => request<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  verifyEmail: (token: string) => request<{ message: string }>('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  getActiveSessions: () => request<{ sessions: any[] }>('/api/auth/active-sessions'),
  revokeSession: (sessionId: string) => request<{ message: string }>('/api/auth/revoke-session', { method: 'POST', body: JSON.stringify({ sessionId }) }),

  // Dashboard
  getDashboardSummary: () => request<DashboardSummary>('/api/dashboard/summary'),
  getCostSeries: () => request<{ series: any[] }>('/api/dashboard/cost-series'),
  getModelUsage: () => request<{ distribution: any[] }>('/api/dashboard/model-usage'),
  getQualityMetrics: () => request<{ categories: any[] }>('/api/dashboard/quality-metrics'),
  resetDemoData: () => request<{ message: string }>('/api/dashboard/reset-demo', { method: 'POST' }),

  // Playground
  executePrompt: (payload: any) => request<any>('/api/playground/execute', { method: 'POST', body: JSON.stringify(payload) }),
  comparePrompt: (payload: any) => request<any>('/api/playground/compare', { method: 'POST', body: JSON.stringify(payload) }),

  // Models
  getModels: () => request<{ models: ModelConfig[] }>('/api/models'),
  createModel: (payload: any) => request<{ model: ModelConfig }>('/api/models', { method: 'POST', body: JSON.stringify(payload) }),
  updateModel: (id: string, payload: any) => request<{ model: ModelConfig }>(`/api/models/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteModel: (id: string) => request<{ message: string }>(`/api/models/${id}`, { method: 'DELETE' }),

  // Providers
  getProviders: () => request<{ providers: ProviderConfig[] }>('/api/providers'),
  testProvider: (id: string) => request<any>(`/api/providers/${id}/test`, { method: 'POST' }),
  updateProvider: (id: string, payload: any) => request<any>(`/api/providers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Request Logs
  getRequests: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ logs: RequestLog[]; total: number; page: number; totalPages: number }>(`/api/requests?${qs}`);
  },
  getRequestById: (id: string) => request<{ log: RequestLog }>(`/api/requests/${id}`),

  // Cache
  getCacheAnalytics: () => request<CacheAnalytics>('/api/cache/analytics'),
  clearCache: () => request<{ message: string; clearedCount: number }>('/api/cache/entries', { method: 'DELETE' }),
  updateCacheSettings: (payload: any) => request<any>('/api/cache/settings', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Experiments
  getExperiments: () => request<{ experiments: Experiment[] }>('/api/experiments'),
  createExperiment: (payload: any) => request<{ experiment: Experiment }>('/api/experiments', { method: 'POST', body: JSON.stringify(payload) }),
  getExperimentById: (id: string) => request<{ experiment: Experiment; results: any[] }>(`/api/experiments/${id}`),
  runExperiment: (id: string) => request<any>(`/api/experiments/${id}/run`, { method: 'POST' }),
  cancelExperiment: (id: string) => request<any>(`/api/experiments/${id}/cancel`, { method: 'POST' }),
  deleteExperiment: (id: string) => request<any>(`/api/experiments/${id}`, { method: 'DELETE' }),

  // API Keys
  getApiKeys: () => request<{ keys: ApiKeyItem[] }>('/api/keys'),
  createApiKey: (name: string) => request<{ message: string; apiKey: any }>('/api/keys', { method: 'POST', body: JSON.stringify({ name }) }),
  revokeApiKey: (id: string) => request<any>(`/api/keys/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request<{ settings: UserSettings; user: User }>('/api/settings'),
  updateSettings: (payload: any) => request<{ settings: UserSettings }>('/api/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
  updateProfile: (fullName: string) => request<{ user: User }>('/api/settings/profile', { method: 'PATCH', body: JSON.stringify({ fullName }) }),
  changePassword: (payload: any) => request<{ message: string }>('/api/settings/change-password', { method: 'POST', body: JSON.stringify(payload) }),
};
