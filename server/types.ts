export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'admin' | 'member';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export type TaskCategory = 'general' | 'code' | 'reasoning' | 'structured' | 'summarization';

export interface ModelConfig {
  id: string;
  provider: string; // 'gemini' | 'openai' | 'anthropic' | 'custom'
  name: string;
  modelIdentifier: string;
  inputCostPerM: number; // Cost in USD per 1M input tokens
  outputCostPerM: number; // Cost in USD per 1M output tokens
  maxContextTokens: number;
  capabilities: TaskCategory[];
  qualityTier: 'standard' | 'balanced' | 'flagship';
  baselineLatencyMs: number;
  qualityScore: number; // 0-100 score based on benchmarks / evaluations
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
  createdAt: string;
}

export interface QualityRuleConfig {
  requireNonEmpty: boolean;
  requireJson?: boolean;
  jsonSchema?: string;
  requireMarkdownCodeBlock?: boolean;
  requiredKeywords?: string[];
  minLength?: number;
  maxLength?: number;
}

export interface RequestLog {
  id: string;
  userId: string;
  timestamp: string;
  taskCategory: TaskCategory;
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
  fallbackModelId?: string;
  errorInfo?: string;
  promptPreview: string;
  responsePreview: string;
  contextOptimizationApplied: boolean;
  tokensSavedContext: number;
  isDemo?: boolean;
}

export interface CacheEntry {
  id: string;
  tenantId: string;
  cacheKey: string;
  normalizedPrompt: string;
  systemInstruction?: string;
  modelId: string;
  temperature: number;
  responseText: string;
  inputTokens: number;
  outputTokens: number;
  costAvoided: number;
  hitCount: number;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
}

export interface TestCase {
  id: string;
  category: TaskCategory;
  prompt: string;
  systemInstruction?: string;
  expectedKeywords?: string[];
  formatRequirement?: 'any' | 'json' | 'code' | 'bullet_points';
}

export interface Experiment {
  id: string;
  userId: string;
  name: string;
  description: string;
  datasetCategory: string;
  testCaseCount: number;
  baselineModelId: string;
  optimizedModelTiers: string[];
  cacheEnabled: boolean;
  contextOptEnabled: boolean;
  qualityThreshold: number; // 0-100
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
  updatedAt: string;
}

export interface ExperimentResultRow {
  id: string;
  experimentId: string;
  testCaseId: string;
  category: TaskCategory;
  prompt: string;
  baselineModel: string;
  baselineCost: number;
  baselineLatencyMs: number;
  baselineTokens: { input: number; output: number };
  baselineOutput: string;
  optimizedModel: string;
  optimizedCost: number;
  optimizedLatencyMs: number;
  optimizedTokens: { input: number; output: number };
  optimizedOutput: string;
  cacheHit: boolean;
  netSavings: number;
  qualityPassed: boolean;
  failedChecks: string[];
  fallbackTriggered: boolean;
  createdAt: string;
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
  updatedAt: string;
}
