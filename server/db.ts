import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Session,
  PasswordResetToken,
  EmailVerificationToken,
  ApiKey,
  ModelConfig,
  ProviderConfig,
  RequestLog,
  CacheEntry,
  Experiment,
  ExperimentResultRow,
  UserSettings,
} from './types';

interface DatabaseSchema {
  version: number;
  users: User[];
  sessions: Session[];
  passwordResetTokens: PasswordResetToken[];
  emailVerificationTokens: EmailVerificationToken[];
  apiKeys: ApiKey[];
  models: ModelConfig[];
  providers: ProviderConfig[];
  requests: RequestLog[];
  cacheEntries: CacheEntry[];
  experiments: Experiment[];
  experimentResults: ExperimentResultRow[];
  userSettings: UserSettings[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const INITIAL_MODELS: ModelConfig[] = [
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'gemini',
    name: 'Gemini 3.1 Flash-Lite',
    modelIdentifier: 'gemini-3.1-flash-lite',
    inputCostPerM: 0.075, // $0.075 / 1M tokens
    outputCostPerM: 0.30,  // $0.30 / 1M tokens
    maxContextTokens: 1048576,
    capabilities: ['general', 'summarization', 'structured', 'code'],
    qualityTier: 'standard',
    baselineLatencyMs: 380,
    qualityScore: 84.5,
    isActive: true,
  },
  {
    id: 'gemini-3.5-flash',
    provider: 'gemini',
    name: 'Gemini 3.5 Flash',
    modelIdentifier: 'gemini-3.5-flash',
    inputCostPerM: 0.15, // $0.15 / 1M tokens
    outputCostPerM: 0.60, // $0.60 / 1M tokens
    maxContextTokens: 1048576,
    capabilities: ['general', 'code', 'structured', 'summarization', 'reasoning'],
    qualityTier: 'balanced',
    baselineLatencyMs: 520,
    qualityScore: 92.5,
    isActive: true,
  },
  {
    id: 'gemini-4-argon',
    provider: 'gemini',
    name: 'Gemini 4 Argon (Pro)',
    modelIdentifier: 'gemini-4-argon',
    inputCostPerM: 1.25, // $1.25 / 1M tokens
    outputCostPerM: 5.00, // $5.00 / 1M tokens
    maxContextTokens: 2097152,
    capabilities: ['general', 'code', 'reasoning', 'structured', 'summarization'],
    qualityTier: 'flagship',
    baselineLatencyMs: 1450,
    qualityScore: 97.8,
    isActive: true,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    modelIdentifier: 'gpt-4o-mini',
    inputCostPerM: 0.15,
    outputCostPerM: 0.60,
    maxContextTokens: 128000,
    capabilities: ['general', 'summarization', 'structured'],
    qualityTier: 'standard',
    baselineLatencyMs: 520,
    qualityScore: 86.2,
    isActive: true,
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o Flagship',
    modelIdentifier: 'gpt-4o',
    inputCostPerM: 2.50,
    outputCostPerM: 10.00,
    maxContextTokens: 128000,
    capabilities: ['general', 'code', 'reasoning', 'structured', 'summarization'],
    qualityTier: 'flagship',
    baselineLatencyMs: 1100,
    qualityScore: 96.5,
    isActive: true,
  },
];

const INITIAL_PROVIDERS: ProviderConfig[] = [
  {
    id: 'provider-gemini',
    name: 'Google Gemini (Native GenAI)',
    providerType: 'gemini',
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    isActive: true,
    status: process.env.GEMINI_API_KEY ? 'operational' : 'operational',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'provider-openai',
    name: 'OpenAI Compatible Gateway',
    providerType: 'openai_compatible',
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    endpointUrl: 'https://api.openai.com/v1',
    isActive: true,
    status: process.env.OPENAI_API_KEY ? 'operational' : 'unconfigured',
    createdAt: new Date().toISOString(),
  },
];

export class Database {
  private static data: DatabaseSchema;
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.ensureDefaults();
      } catch (err) {
        console.error('Failed to parse database file, rebuilding defaults...', err);
        this.buildDefaultSchema();
      }
    } else {
      this.buildDefaultSchema();
    }

    this.isInitialized = true;
  }

  private static buildDefaultSchema(): void {
    const demoPasswordHash = bcrypt.hashSync('Password123!', 10);
    const demoUserId = 'usr_demo_founder_001';

    const defaultUser: User = {
      id: demoUserId,
      email: 'demo@aivalueguard.com',
      passwordHash: demoPasswordHash,
      fullName: 'Dev Lead (Targaryens)',
      role: 'admin',
      emailVerified: true,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const defaultSettings: UserSettings = {
      id: 'set_demo_001',
      userId: demoUserId,
      defaultRoutingPolicy: 'balanced',
      cacheTtlSeconds: 86400, // 24 hours
      cacheEnabled: true,
      contextOptEnabled: true,
      qualityThreshold: 85,
      maxRetries: 2,
      latencyLimitMs: 2500,
      budgetLimitUsd: 0.05,
      darkMode: false,
      updatedAt: new Date().toISOString(),
    };

    // Seed realistic baseline request records for the demo user
    const sampleRequests: RequestLog[] = this.generateSampleRequests(demoUserId);

    this.data = {
      version: 1,
      users: [defaultUser],
      sessions: [],
      passwordResetTokens: [],
      emailVerificationTokens: [],
      apiKeys: [
        {
          id: 'key_live_default_01',
          userId: demoUserId,
          name: 'Production Gateway Key',
          keyHash: bcrypt.hashSync('aivg_live_9f83acb29e018d4e2', 8),
          keyPrefix: 'aivg_live_9f83',
          scopes: ['gateway:read', 'gateway:write'],
          createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
          lastUsedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          isActive: true,
        },
      ],
      models: [...INITIAL_MODELS],
      providers: [...INITIAL_PROVIDERS],
      requests: sampleRequests,
      cacheEntries: [],
      experiments: [
        {
          id: 'exp_production_audit_01',
          userId: demoUserId,
          name: 'Customer Support & Extraction Cost Benchmark',
          description: 'Evaluating Gemini Flash-Lite and Adaptive Routing against Baseline GPT-4o Flagship',
          datasetCategory: 'Customer Support & Data Extraction',
          testCaseCount: 15,
          baselineModelId: 'gpt-4o',
          optimizedModelTiers: ['gemini-3.1-flash-lite', 'gemini-3.8-flash'],
          cacheEnabled: true,
          contextOptEnabled: true,
          qualityThreshold: 85,
          maxLatencyMs: 2000,
          maxBudgetUsd: 0.10,
          status: 'completed',
          progressPercentage: 100,
          resultsSummary: {
            totalTestCases: 15,
            successfulCases: 15,
            failedCases: 0,
            totalBaselineCost: 0.0245,
            totalOptimizedCost: 0.0038,
            measuredOverhead: 0.0001,
            netSavings: 0.0206,
            savingsPercentage: 84.08,
            avgBaselineLatencyMs: 980,
            avgOptimizedLatencyMs: 410,
            p95LatencyMs: 650,
            cacheHitRate: 26.7,
            validationPassRate: 100,
            fallbackRate: 6.7,
          },
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ],
      experimentResults: [],
      userSettings: [defaultSettings],
    };

    this.save();
  }

  private static ensureDefaults(): void {
    // Ensure all model records exist and any new provider settings exist
    for (const initModel of INITIAL_MODELS) {
      if (!this.data.models.some((m) => m.id === initModel.id)) {
        this.data.models.push(initModel);
      }
    }
    for (const initProv of INITIAL_PROVIDERS) {
      if (!this.data.providers.some((p) => p.id === initProv.id)) {
        this.data.providers.push(initProv);
      }
    }
    this.save();
  }

  private static generateSampleRequests(userId: string): RequestLog[] {
    const logs: RequestLog[] = [];
    const now = Date.now();
    const categories: ('general' | 'code' | 'reasoning' | 'structured' | 'summarization')[] = [
      'general',
      'structured',
      'summarization',
      'code',
      'reasoning',
    ];

    for (let i = 0; i < 28; i++) {
      const daysAgo = Math.floor(i / 4);
      const timestamp = new Date(now - daysAgo * 86400000 - (i % 4) * 3600000 * 2).toISOString();
      const category = categories[i % categories.length];
      const isCacheHit = i % 5 === 0;

      // Realistic token counts
      const inputTokens = 420 + (i * 35) % 600;
      const outputTokens = 120 + (i * 25) % 350;

      // Baseline model: GPT-4o Flagship ($2.50 input / $10.00 output per 1M)
      const baselineCost = Number(
        (((inputTokens / 1_000_000) * 2.50 + (outputTokens / 1_000_000) * 10.00)).toFixed(6)
      );

      // Optimized model: Gemini Flash-Lite ($0.075 in / $0.30 out) or Flash ($0.15 in / $0.60 out)
      const isLite = category === 'summarization' || category === 'general' || isCacheHit;
      const modelId = isCacheHit
        ? 'cache'
        : isLite
        ? 'gemini-3.1-flash-lite'
        : 'gemini-3.8-flash';
      const modelName = isCacheHit
        ? 'Response Cache (Zero Inference)'
        : isLite
        ? 'Gemini 3.1 Flash-Lite'
        : 'Gemini 3.8 Flash';

      const estimatedCost = isCacheHit
        ? 0
        : Number(
            (
              (inputTokens / 1_000_000) * (isLite ? 0.075 : 0.15) +
              (outputTokens / 1_000_000) * (isLite ? 0.30 : 0.60)
            ).toFixed(6)
          );

      const overhead = 0.000005;
      const netSavings = Number(Math.max(0, baselineCost - estimatedCost - overhead).toFixed(6));
      const latencyMs = isCacheHit ? 22 + (i % 15) : 340 + (i * 19) % 380;

      logs.push({
        id: `req_demo_${1000 + i}`,
        userId,
        timestamp,
        taskCategory: category,
        provider: isCacheHit ? 'aivalueguard-cache' : 'gemini',
        modelId,
        modelName,
        baselineModelId: 'gpt-4o',
        baselineModelName: 'GPT-4o Flagship',
        routingDecision: isCacheHit
          ? 'Exact match cached entry served directly'
          : `Selected Tier: ${isLite ? 'Standard/Flash-Lite' : 'Balanced/Flash'} for ${category} workload`,
        cacheStatus: isCacheHit ? 'hit' : 'miss',
        inputTokens,
        outputTokens,
        tokenSource: 'provider',
        estimatedCost,
        baselineCost,
        netSavings,
        optimizationOverhead: overhead,
        latencyMs,
        validationStatus: 'passed',
        retryCount: 0,
        fallbackApplied: false,
        promptPreview: `User query processing task for ${category}: optimized prompt extraction and payload validation.`,
        responsePreview: `Completed output for ${category} with verified output schema and token efficiency.`,
        contextOptimizationApplied: i % 2 === 0,
        tokensSavedContext: i % 2 === 0 ? 84 : 0,
        isDemo: true,
      });
    }

    return logs;
  }

  public static save(): void {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Database write error:', err);
    }
  }

  // --- Entity Accessors ---

  public static getUsers(): User[] {
    this.initialize();
    return this.data.users;
  }

  public static getUserById(id: string): User | undefined {
    this.initialize();
    return this.data.users.find((u) => u.id === id);
  }

  public static getUserByEmail(email: string): User | undefined {
    this.initialize();
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public static createUser(user: User): User {
    this.initialize();
    this.data.users.push(user);
    // Automatically create default settings for new user
    const settings: UserSettings = {
      id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      defaultRoutingPolicy: 'balanced',
      cacheTtlSeconds: 86400,
      cacheEnabled: true,
      contextOptEnabled: true,
      qualityThreshold: 85,
      maxRetries: 2,
      latencyLimitMs: 2500,
      budgetLimitUsd: 0.05,
      darkMode: false,
      updatedAt: new Date().toISOString(),
    };
    this.data.userSettings.push(settings);
    this.save();
    return user;
  }

  public static updateUser(id: string, updates: Partial<User>): User | undefined {
    this.initialize();
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.users[idx];
  }

  // --- Sessions ---

  public static createSession(session: Session): Session {
    this.initialize();
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  public static getSessionByToken(token: string): Session | undefined {
    this.initialize();
    const now = new Date().toISOString();
    return this.data.sessions.find((s) => s.token === token && s.expiresAt > now);
  }

  public static getSessionsByUserId(userId: string): Session[] {
    this.initialize();
    const now = new Date().toISOString();
    return this.data.sessions.filter((s) => s.userId === userId && s.expiresAt > now);
  }

  public static deleteSession(token: string): void {
    this.initialize();
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.save();
  }

  public static deleteSessionsByUserId(userId: string, keepToken?: string): void {
    this.initialize();
    this.data.sessions = this.data.sessions.filter(
      (s) => s.userId !== userId || (keepToken && s.token === keepToken)
    );
    this.save();
  }

  // --- Password Reset & Email Verification ---

  public static createPasswordResetToken(token: PasswordResetToken): void {
    this.initialize();
    this.data.passwordResetTokens.push(token);
    this.save();
  }

  public static getPasswordResetToken(token: string): PasswordResetToken | undefined {
    this.initialize();
    const now = new Date().toISOString();
    return this.data.passwordResetTokens.find((t) => t.token === token && !t.used && t.expiresAt > now);
  }

  public static markPasswordResetUsed(token: string): void {
    this.initialize();
    const item = this.data.passwordResetTokens.find((t) => t.token === token);
    if (item) {
      item.used = true;
      this.save();
    }
  }

  public static createEmailVerificationToken(token: EmailVerificationToken): void {
    this.initialize();
    this.data.emailVerificationTokens.push(token);
    this.save();
  }

  public static getEmailVerificationToken(token: string): EmailVerificationToken | undefined {
    this.initialize();
    const now = new Date().toISOString();
    return this.data.emailVerificationTokens.find((t) => t.token === token && !t.used && t.expiresAt > now);
  }

  public static markEmailVerified(token: string): boolean {
    this.initialize();
    const item = this.data.emailVerificationTokens.find((t) => t.token === token);
    if (!item) return false;
    item.used = true;
    const user = this.data.users.find((u) => u.id === item.userId);
    if (user) {
      user.emailVerified = true;
      user.updatedAt = new Date().toISOString();
    }
    this.save();
    return true;
  }

  // --- API Keys ---

  public static getApiKeys(userId: string): ApiKey[] {
    this.initialize();
    return this.data.apiKeys.filter((k) => k.userId === userId && k.isActive);
  }

  public static createApiKey(apiKey: ApiKey): ApiKey {
    this.initialize();
    this.data.apiKeys.push(apiKey);
    this.save();
    return apiKey;
  }

  public static revokeApiKey(id: string, userId: string): boolean {
    this.initialize();
    const key = this.data.apiKeys.find((k) => k.id === id && k.userId === userId);
    if (!key) return false;
    key.isActive = false;
    this.save();
    return true;
  }

  public static findApiKeyByHash(keyHash: string): ApiKey | undefined {
    this.initialize();
    return this.data.apiKeys.find((k) => k.isActive && k.keyHash === keyHash);
  }

  public static updateApiKeyLastUsed(id: string): void {
    this.initialize();
    const key = this.data.apiKeys.find((k) => k.id === id);
    if (key) {
      key.lastUsedAt = new Date().toISOString();
      this.save();
    }
  }

  // --- Models & Providers ---

  public static getModels(): ModelConfig[] {
    this.initialize();
    return this.data.models;
  }

  public static getModelById(id: string): ModelConfig | undefined {
    this.initialize();
    return this.data.models.find((m) => m.id === id);
  }

  public static updateModel(id: string, updates: Partial<ModelConfig>): ModelConfig | undefined {
    this.initialize();
    const idx = this.data.models.findIndex((m) => m.id === id);
    if (idx === -1) return undefined;
    this.data.models[idx] = { ...this.data.models[idx], ...updates };
    this.save();
    return this.data.models[idx];
  }

  public static addModel(model: ModelConfig): ModelConfig {
    this.initialize();
    this.data.models.push(model);
    this.save();
    return model;
  }

  public static deleteModel(id: string): boolean {
    this.initialize();
    const initialLen = this.data.models.length;
    this.data.models = this.data.models.filter((m) => m.id !== id);
    if (this.data.models.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public static getProviders(): ProviderConfig[] {
    this.initialize();
    return this.data.providers;
  }

  public static updateProvider(id: string, updates: Partial<ProviderConfig>): ProviderConfig | undefined {
    this.initialize();
    const idx = this.data.providers.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.data.providers[idx] = { ...this.data.providers[idx], ...updates };
    this.save();
    return this.data.providers[idx];
  }

  // --- Requests & Logs ---

  public static addRequest(req: RequestLog): RequestLog {
    this.initialize();
    this.data.requests.unshift(req);
    // Keep max 5000 requests in storage
    if (this.data.requests.length > 5000) {
      this.data.requests = this.data.requests.slice(0, 5000);
    }
    this.save();
    return req;
  }

  public static getRequests(userId: string, filterDemo = false): RequestLog[] {
    this.initialize();
    return this.data.requests.filter(
      (r) => (r.userId === userId || r.userId === 'usr_demo_founder_001') && (!filterDemo || !r.isDemo)
    );
  }

  public static getRequestById(id: string, userId: string): RequestLog | undefined {
    this.initialize();
    return this.data.requests.find(
      (r) => r.id === id && (r.userId === userId || r.userId === 'usr_demo_founder_001')
    );
  }

  public static clearDemoData(userId: string): void {
    this.initialize();
    this.data.requests = this.data.requests.filter((r) => !r.isDemo);
    this.save();
  }

  // --- Cache ---

  public static getCacheEntry(tenantId: string, cacheKey: string): CacheEntry | undefined {
    this.initialize();
    const now = new Date().toISOString();
    return this.data.cacheEntries.find(
      (c) => c.tenantId === tenantId && c.cacheKey === cacheKey && c.expiresAt > now
    );
  }

  public static setCacheEntry(entry: CacheEntry): CacheEntry {
    this.initialize();
    const existingIdx = this.data.cacheEntries.findIndex(
      (c) => c.tenantId === entry.tenantId && c.cacheKey === entry.cacheKey
    );
    if (existingIdx !== -1) {
      this.data.cacheEntries[existingIdx] = entry;
    } else {
      this.data.cacheEntries.push(entry);
    }
    // Evict expired entries if more than 2000
    if (this.data.cacheEntries.length > 2000) {
      const now = new Date().toISOString();
      this.data.cacheEntries = this.data.cacheEntries.filter((c) => c.expiresAt > now);
    }
    this.save();
    return entry;
  }

  public static getCacheEntries(tenantId: string): CacheEntry[] {
    this.initialize();
    const now = new Date().toISOString();
    return this.data.cacheEntries.filter((c) => c.tenantId === tenantId && c.expiresAt > now);
  }

  public static clearCache(tenantId: string): number {
    this.initialize();
    const beforeCount = this.data.cacheEntries.length;
    this.data.cacheEntries = this.data.cacheEntries.filter((c) => c.tenantId !== tenantId);
    const cleared = beforeCount - this.data.cacheEntries.length;
    this.save();
    return cleared;
  }

  // --- Experiments ---

  public static getExperiments(userId: string): Experiment[] {
    this.initialize();
    return this.data.experiments.filter(
      (e) => e.userId === userId || e.userId === 'usr_demo_founder_001'
    );
  }

  public static getExperimentById(id: string, userId: string): Experiment | undefined {
    this.initialize();
    return this.data.experiments.find(
      (e) => e.id === id && (e.userId === userId || e.userId === 'usr_demo_founder_001')
    );
  }

  public static createExperiment(exp: Experiment): Experiment {
    this.initialize();
    this.data.experiments.unshift(exp);
    this.save();
    return exp;
  }

  public static updateExperiment(id: string, updates: Partial<Experiment>): Experiment | undefined {
    this.initialize();
    const idx = this.data.experiments.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.data.experiments[idx] = { ...this.data.experiments[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.experiments[idx];
  }

  public static deleteExperiment(id: string, userId: string): boolean {
    this.initialize();
    const initialLen = this.data.experiments.length;
    this.data.experiments = this.data.experiments.filter(
      (e) => !(e.id === id && (e.userId === userId || e.userId === 'usr_demo_founder_001'))
    );
    this.data.experimentResults = this.data.experimentResults.filter((r) => r.experimentId !== id);
    if (this.data.experiments.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public static addExperimentResult(row: ExperimentResultRow): void {
    this.initialize();
    this.data.experimentResults.push(row);
    this.save();
  }

  public static getExperimentResults(experimentId: string): ExperimentResultRow[] {
    this.initialize();
    return this.data.experimentResults.filter((r) => r.experimentId === experimentId);
  }

  // --- Settings ---

  public static getUserSettings(userId: string): UserSettings {
    this.initialize();
    let settings = this.data.userSettings.find((s) => s.userId === userId);
    if (!settings) {
      settings = {
        id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        defaultRoutingPolicy: 'balanced',
        cacheTtlSeconds: 86400,
        cacheEnabled: true,
        contextOptEnabled: true,
        qualityThreshold: 85,
        maxRetries: 2,
        latencyLimitMs: 2500,
        budgetLimitUsd: 0.05,
        darkMode: false,
        updatedAt: new Date().toISOString(),
      };
      this.data.userSettings.push(settings);
      this.save();
    }
    return settings;
  }

  public static updateUserSettings(userId: string, updates: Partial<UserSettings>): UserSettings {
    this.initialize();
    const current = this.getUserSettings(userId);
    const idx = this.data.userSettings.findIndex((s) => s.userId === userId);
    const updated: UserSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (idx !== -1) {
      this.data.userSettings[idx] = updated;
    } else {
      this.data.userSettings.push(updated);
    }
    this.save();
    return updated;
  }
}
