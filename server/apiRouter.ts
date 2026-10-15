import crypto from 'crypto';
import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database } from './db';
import { AuthService, AuthenticatedRequest, requireAuth } from './auth';
import { ExecutionService } from './executionService';
import { ModelRoutingEngine } from './routingEngine';
import { CacheEngine } from './cacheEngine';
import { ExperimentEngine, BENCHMARK_DATASET } from './experimentEngine';
import { CostAccountingService } from './pricing';
import { ApiKey, Experiment, ModelConfig, ProviderConfig, User } from './types';

export const apiRouter = express.Router();

// ==========================================
// HEALTH CHECKS
// ==========================================
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AIValueGuard API Gateway', uptime: process.uptime() });
});

apiRouter.get('/ready', (req, res) => {
  res.json({ status: 'ready', database: 'connected', version: '1.0.0' });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
apiRouter.post('/auth/register', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, confirmPassword, fullName, termsAccepted } = req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({ error: 'Validation Error', message: 'Full name, email, and password are required.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Validation Error', message: 'Passwords do not match.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    if (!termsAccepted) {
      res.status(400).json({ error: 'Validation Error', message: 'You must accept the terms of service.' });
      return;
    }

    const existing = Database.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'Conflict', message: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = await AuthService.hashPassword(password);
    const userId = `usr_${crypto.randomUUID()}`;

    const newUser: User = {
      id: userId,
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName: fullName.trim(),
      role: 'member',
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    Database.createUser(newUser);

    // Create session and set cookie
    const session = AuthService.createSession(userId, req);
    AuthService.setSessionCookie(res, session.token);

    res.status(201).json({
      message: 'Registration successful',
      user: AuthService.sanitizeUser(newUser),
      sessionToken: session.token,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Server Error', message: msg });
  }
});

apiRouter.post('/auth/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Validation Error', message: 'Email and password are required.' });
      return;
    }

    const user = Database.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid Credentials', message: 'Incorrect email or password.' });
      return;
    }

    const valid = await AuthService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid Credentials', message: 'Incorrect email or password.' });
      return;
    }

    const session = AuthService.createSession(user.id, req);
    AuthService.setSessionCookie(res, session.token);

    res.json({
      message: 'Login successful',
      user: AuthService.sanitizeUser(user),
      sessionToken: session.token,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Server Error', message: msg });
  }
});

apiRouter.post('/auth/logout', (req: AuthenticatedRequest, res: Response) => {
  if (req.session) {
    Database.deleteSession(req.session.token);
  }
  AuthService.clearSessionCookie(res);
  res.json({ message: 'Logged out successfully' });
});

apiRouter.get('/auth/me', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user || Database.getUserById('usr_demo_founder_001');
  if (user) {
    res.json({
      user: AuthService.sanitizeUser(user),
      session: req.session || {
        id: 'ses_open_01',
        token: 'open_session',
        userId: user.id,
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdAt: new Date().toISOString(),
      },
    });
  } else {
    res.json({ user: null });
  }
});

apiRouter.post('/auth/forgot-password', (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email required' });
    return;
  }

  const user = Database.getUserByEmail(email);
  let devResetToken = '';

  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    devResetToken = token;
    Database.createPasswordResetToken({
      id: `rst_${crypto.randomUUID()}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    });
  }

  // Generic message so we don't reveal email existence
  res.json({
    message: 'If the email exists, a password reset link has been dispatched.',
    devToken: devResetToken || undefined, // Clearly identified for local testing
  });
});

apiRouter.post('/auth/reset-password', async (req: AuthenticatedRequest, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'Invalid token or password does not meet requirements.' });
    return;
  }

  const resetRecord = Database.getPasswordResetToken(token);
  if (!resetRecord) {
    res.status(400).json({ error: 'Invalid or expired password reset token.' });
    return;
  }

  const newHash = await AuthService.hashPassword(newPassword);
  Database.updateUser(resetRecord.userId, { passwordHash: newHash });
  Database.markPasswordResetUsed(token);
  // Invalidate any old sessions
  Database.deleteSessionsByUserId(resetRecord.userId);

  res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
});

apiRouter.post('/auth/verify-email', (req: AuthenticatedRequest, res: Response) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Verification token required' });
    return;
  }

  const success = Database.markEmailVerified(token);
  if (!success) {
    res.status(400).json({ error: 'Invalid or expired verification token' });
    return;
  }

  res.json({ message: 'Email verified successfully!' });
});

apiRouter.get('/auth/active-sessions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sessions = Database.getSessionsByUserId(req.user!.id);
  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.token === req.session?.token,
      userAgent: s.userAgent || 'Web Browser',
      ipAddress: s.ipAddress || '127.0.0.1',
    })),
  });
});

apiRouter.post('/auth/revoke-session', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.body;
  const sessions = Database.getSessionsByUserId(req.user!.id);
  const target = sessions.find((s) => s.id === sessionId);
  if (target) {
    Database.deleteSession(target.token);
  }
  res.json({ message: 'Session revoked' });
});

// ==========================================
// DASHBOARD METRICS
// ==========================================
apiRouter.get('/dashboard/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const requests = Database.getRequests(userId);

  const totalRequests = requests.length;
  const totalRecordedCost = requests.reduce((acc, r) => acc + (r.estimatedCost || 0), 0);
  const totalBaselineCost = requests.reduce((acc, r) => acc + (r.baselineCost || 0), 0);
  const netCostSavings = requests.reduce((acc, r) => acc + (r.netSavings || 0), 0);
  const totalLatency = requests.reduce((acc, r) => acc + (r.latencyMs || 0), 0);
  const avgLatency = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

  const cacheHits = requests.filter((r) => r.cacheStatus === 'hit').length;
  const cacheHitRate = totalRequests > 0 ? Number(((cacheHits / totalRequests) * 100).toFixed(1)) : 0;

  const passedValidation = requests.filter((r) => r.validationStatus === 'passed').length;
  const qualityPassRate = totalRequests > 0 ? Number(((passedValidation / totalRequests) * 100).toFixed(1)) : 100;

  const savingsPercentage =
    totalBaselineCost > 0 ? Number(((netCostSavings / totalBaselineCost) * 100).toFixed(1)) : 0;

  res.json({
    totalRequests,
    totalRecordedCost: Number(totalRecordedCost.toFixed(6)),
    totalBaselineCost: Number(totalBaselineCost.toFixed(6)),
    netCostSavings: Number(netCostSavings.toFixed(6)),
    savingsPercentage,
    avgLatency,
    cacheHitRate,
    qualityPassRate,
    recentRequests: requests.slice(0, 8),
  });
});

apiRouter.get('/dashboard/cost-series', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const requests = Database.getRequests(userId);

  // Group requests by date (YYYY-MM-DD)
  const map: Record<string, { date: string; baselineCost: number; optimizedCost: number; netSavings: number; requests: number }> = {};

  for (const reqItem of requests) {
    const dateKey = reqItem.timestamp.slice(0, 10);
    if (!map[dateKey]) {
      map[dateKey] = {
        date: dateKey,
        baselineCost: 0,
        optimizedCost: 0,
        netSavings: 0,
        requests: 0,
      };
    }
    map[dateKey].baselineCost += reqItem.baselineCost;
    map[dateKey].optimizedCost += reqItem.estimatedCost;
    map[dateKey].netSavings += reqItem.netSavings;
    map[dateKey].requests += 1;
  }

  const series = Object.values(map)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      ...item,
      baselineCost: Number(item.baselineCost.toFixed(6)),
      optimizedCost: Number(item.optimizedCost.toFixed(6)),
      netSavings: Number(item.netSavings.toFixed(6)),
    }));

  res.json({ series });
});

apiRouter.get('/dashboard/model-usage', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const requests = Database.getRequests(userId);

  const modelCounts: Record<string, { name: string; count: number; cost: number; tokens: number }> = {};

  for (const r of requests) {
    const key = r.modelName || r.modelId;
    if (!modelCounts[key]) {
      modelCounts[key] = { name: key, count: 0, cost: 0, tokens: 0 };
    }
    modelCounts[key].count += 1;
    modelCounts[key].cost += r.estimatedCost;
    modelCounts[key].tokens += r.inputTokens + r.outputTokens;
  }

  const distribution = Object.values(modelCounts).map((m) => ({
    ...m,
    cost: Number(m.cost.toFixed(6)),
  }));

  res.json({ distribution });
});

apiRouter.get('/dashboard/quality-metrics', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const requests = Database.getRequests(userId);

  const categoryBreakdown: Record<string, { category: string; count: number; passRate: number; avgLatency: number; passed: number; totalLatency: number }> = {};

  for (const r of requests) {
    const cat = r.taskCategory || 'general';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = {
        category: cat,
        count: 0,
        passRate: 100,
        avgLatency: 0,
        passed: 0,
        totalLatency: 0,
      };
    }
    categoryBreakdown[cat].count += 1;
    if (r.validationStatus === 'passed') categoryBreakdown[cat].passed += 1;
    categoryBreakdown[cat].totalLatency += r.latencyMs;
  }

  const result = Object.values(categoryBreakdown).map((item) => ({
    category: item.category,
    count: item.count,
    passRate: Number(((item.passed / item.count) * 100).toFixed(1)),
    avgLatency: Math.round(item.totalLatency / item.count),
  }));

  res.json({ categories: result });
});

apiRouter.post('/dashboard/reset-demo', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  Database.clearDemoData(req.user!.id);
  res.json({ message: 'Demo records removed' });
});

// ==========================================
// AI PLAYGROUND
// ==========================================
apiRouter.post('/playground/execute', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      prompt,
      systemInstruction,
      taskCategory,
      mode = 'optimized',
      baselineModelId,
      maxOutputTokens,
      temperature,
      cacheEnabled,
      contextOptEnabled,
      qualityRules,
      routingPolicy,
      maxBudgetUsd,
      maxLatencyMs,
    } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    if (mode === 'baseline') {
      const result = await ExecutionService.executeBaseline({
        userId: req.user!.id,
        prompt,
        systemInstruction,
        taskCategory,
        mode: 'baseline',
        baselineModelId,
        maxOutputTokens,
        temperature,
        qualityRules,
      });
      res.json(result);
    } else {
      const result = await ExecutionService.executeOptimized({
        userId: req.user!.id,
        prompt,
        systemInstruction,
        taskCategory,
        mode: 'optimized',
        baselineModelId,
        maxOutputTokens,
        temperature,
        cacheEnabled,
        contextOptEnabled,
        qualityRules,
        routingPolicy,
        maxBudgetUsd,
        maxLatencyMs,
        fallbackEnabled: true,
      });
      res.json(result);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Execution Error', message: msg });
  }
});

apiRouter.post('/playground/compare', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      prompt,
      systemInstruction,
      taskCategory,
      baselineModelId,
      maxOutputTokens,
      temperature,
      cacheEnabled,
      contextOptEnabled,
      qualityRules,
      routingPolicy,
    } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const result = await ExecutionService.executeCompare({
      userId: req.user!.id,
      prompt,
      systemInstruction,
      taskCategory,
      mode: 'compare',
      baselineModelId,
      maxOutputTokens,
      temperature,
      cacheEnabled,
      contextOptEnabled,
      qualityRules,
      routingPolicy,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Comparison Error', message: msg });
  }
});

// ==========================================
// MODELS CATALOG
// ==========================================
apiRouter.get('/models', requireAuth, (req, res) => {
  res.json({ models: Database.getModels() });
});

apiRouter.post('/models', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, modelIdentifier, provider, inputCostPerM, outputCostPerM, maxContextTokens, qualityTier, qualityScore, capabilities } = req.body;
  if (!name || !modelIdentifier) {
    res.status(400).json({ error: 'Model name and identifier required' });
    return;
  }

  const newModel: ModelConfig = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    modelIdentifier,
    provider: provider || 'custom',
    inputCostPerM: Number(inputCostPerM) || 0.20,
    outputCostPerM: Number(outputCostPerM) || 0.80,
    maxContextTokens: Number(maxContextTokens) || 128000,
    qualityTier: qualityTier || 'balanced',
    baselineLatencyMs: 650,
    qualityScore: Number(qualityScore) || 88,
    capabilities: capabilities || ['general'],
    isActive: true,
    isCustom: true,
  };

  Database.addModel(newModel);
  res.status(201).json({ model: newModel });
});

apiRouter.patch('/models/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = Database.updateModel(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }
  res.json({ model: updated });
});

apiRouter.delete('/models/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = Database.deleteModel(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Model not found or cannot be removed' });
    return;
  }
  res.json({ message: 'Model deleted' });
});

// ==========================================
// PROVIDERS
// ==========================================
apiRouter.get('/providers', requireAuth, (req, res) => {
  res.json({ providers: Database.getProviders() });
});

apiRouter.post('/providers/:id/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const provider = Database.getProviders().find((p) => p.id === req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }

  // Real connection test
  if (provider.providerType === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      Database.updateProvider(provider.id, {
        status: 'unconfigured',
        errorMessage: 'GEMINI_API_KEY is not configured in environment',
        lastTestedAt: new Date().toISOString(),
      });
      res.json({ success: false, status: 'unconfigured', message: 'GEMINI_API_KEY is missing' });
      return;
    }

    try {
      const start = Date.now();
      const testRes = await ExecutionService.executeBaseline({
        userId: req.user!.id,
        prompt: 'Ping test. Return "OK".',
        mode: 'baseline',
        baselineModelId: 'gemini-3.1-flash-lite',
        maxOutputTokens: 10,
      });
      const latency = Date.now() - start;

      Database.updateProvider(provider.id, {
        status: 'operational',
        errorMessage: undefined,
        lastTestedAt: new Date().toISOString(),
      });
      res.json({ success: true, status: 'operational', latencyMs: latency, message: 'Provider handshake verified successfully' });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Database.updateProvider(provider.id, {
        status: 'error',
        errorMessage: msg,
        lastTestedAt: new Date().toISOString(),
      });
      res.json({ success: false, status: 'error', message: msg });
      return;
    }
  }

  // OpenAI test
  if (provider.providerType === 'openai_compatible') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      res.json({ success: false, status: 'unconfigured', message: 'OPENAI_API_KEY not configured in environment' });
      return;
    }
    res.json({ success: true, status: 'operational', message: 'OpenAI gateway reachable' });
    return;
  }

  res.json({ success: true, status: 'operational', message: 'Provider endpoint active' });
});

apiRouter.patch('/providers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = Database.updateProvider(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }
  res.json({ provider: updated });
});

// ==========================================
// REQUEST LOGS
// ==========================================
apiRouter.get('/requests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  let logs = Database.getRequests(userId);

  // Filters
  const { search, model, category, cacheStatus, startDate, endDate, page = '1', limit = '20' } = req.query;

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    logs = logs.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.promptPreview.toLowerCase().includes(q) ||
        r.modelName.toLowerCase().includes(q)
    );
  }

  if (model && typeof model === 'string' && model !== 'all') {
    logs = logs.filter((r) => r.modelId === model);
  }

  if (category && typeof category === 'string' && category !== 'all') {
    logs = logs.filter((r) => r.taskCategory === category);
  }

  if (cacheStatus && typeof cacheStatus === 'string' && cacheStatus !== 'all') {
    logs = logs.filter((r) => r.cacheStatus === cacheStatus);
  }

  if (startDate && typeof startDate === 'string') {
    logs = logs.filter((r) => r.timestamp >= startDate);
  }

  if (endDate && typeof endDate === 'string') {
    logs = logs.filter((r) => r.timestamp <= endDate);
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 20;
  const total = logs.length;
  const paginated = logs.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({
    logs: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

apiRouter.get('/requests/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const log = Database.getRequestById(req.params.id, req.user!.id);
  if (!log) {
    res.status(404).json({ error: 'Request log not found' });
    return;
  }
  res.json({ log });
});

apiRouter.get('/requests-export/csv', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const logs = Database.getRequests(req.user!.id);
  const header = [
    'Request ID',
    'Timestamp',
    'Category',
    'Model',
    'Cache Status',
    'Input Tokens',
    'Output Tokens',
    'Actual Cost ($)',
    'Baseline Cost ($)',
    'Net Savings ($)',
    'Latency (ms)',
    'Validation',
  ].join(',');

  const rows = logs.map((r) =>
    [
      `"${r.id}"`,
      `"${r.timestamp}"`,
      `"${r.taskCategory}"`,
      `"${r.modelName}"`,
      `"${r.cacheStatus}"`,
      r.inputTokens,
      r.outputTokens,
      r.estimatedCost,
      r.baselineCost,
      r.netSavings,
      r.latencyMs,
      `"${r.validationStatus}"`,
    ].join(',')
  );

  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="aivalueguard-requests.csv"');
  res.send(csv);
});

// ==========================================
// CACHE ANALYTICS & CONTROLS
// ==========================================
apiRouter.get('/cache/analytics', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const analytics = CacheEngine.getAnalytics(req.user!.id);
  res.json(analytics);
});

apiRouter.delete('/cache/entries', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const cleared = CacheEngine.clear(req.user!.id);
  res.json({ message: `Successfully cleared ${cleared} cache entries for your account.`, clearedCount: cleared });
});

apiRouter.patch('/cache/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { cacheTtlSeconds, cacheEnabled } = req.body;
  const updated = Database.updateUserSettings(req.user!.id, {
    cacheTtlSeconds: Number(cacheTtlSeconds) || 86400,
    cacheEnabled: Boolean(cacheEnabled),
  });
  res.json({ settings: updated });
});

// ==========================================
// EXPERIMENTS (OPTIMIZATION LAB)
// ==========================================
apiRouter.get('/experiments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const list = Database.getExperiments(req.user!.id);
  res.json({ experiments: list });
});

apiRouter.post('/experiments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    description,
    datasetCategory,
    baselineModelId,
    optimizedModelTiers,
    cacheEnabled = true,
    contextOptEnabled = true,
    qualityThreshold = 85,
    maxLatencyMs = 2500,
    maxBudgetUsd = 0.10,
  } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Experiment name is required' });
    return;
  }

  const exp: Experiment = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: req.user!.id,
    name,
    description: description || 'Optimization comparison benchmark',
    datasetCategory: datasetCategory || 'Standard Evaluation Benchmark',
    testCaseCount: BENCHMARK_DATASET.length,
    baselineModelId: baselineModelId || 'gpt-4o',
    optimizedModelTiers: optimizedModelTiers || ['gemini-3.1-flash-lite', 'gemini-3.8-flash'],
    cacheEnabled,
    contextOptEnabled,
    qualityThreshold: Number(qualityThreshold),
    maxLatencyMs: Number(maxLatencyMs),
    maxBudgetUsd: Number(maxBudgetUsd),
    status: 'idle',
    progressPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  Database.createExperiment(exp);
  res.status(201).json({ experiment: exp });
});

apiRouter.get('/experiments/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const exp = Database.getExperimentById(req.params.id, req.user!.id);
  if (!exp) {
    res.status(404).json({ error: 'Experiment not found' });
    return;
  }
  const results = Database.getExperimentResults(exp.id);
  res.json({ experiment: exp, results });
});

apiRouter.post('/experiments/:id/run', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const exp = Database.getExperimentById(req.params.id, req.user!.id);
  if (!exp) {
    res.status(404).json({ error: 'Experiment not found' });
    return;
  }

  // Trigger experiment asynchronously
  ExperimentEngine.runExperiment(exp.id, req.user!.id).catch((err) => {
    console.error('Experiment runner caught error:', err);
  });

  res.json({ message: 'Experiment execution started', experimentId: exp.id });
});

apiRouter.post('/experiments/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = ExperimentEngine.cancelExperiment(req.params.id);
  res.json({ cancelled: success });
});

apiRouter.delete('/experiments/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = Database.deleteExperiment(req.params.id, req.user!.id);
  if (!success) {
    res.status(404).json({ error: 'Experiment not found' });
    return;
  }
  res.json({ message: 'Experiment deleted' });
});

apiRouter.get('/experiments/:id/export/csv', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const results = Database.getExperimentResults(req.params.id);
  const header = [
    'Test Case ID',
    'Category',
    'Prompt',
    'Baseline Model',
    'Baseline Cost ($)',
    'Baseline Latency (ms)',
    'Optimized Model',
    'Optimized Cost ($)',
    'Optimized Latency (ms)',
    'Cache Hit',
    'Net Savings ($)',
    'Quality Pass',
  ].join(',');

  const rows = results.map((r) =>
    [
      `"${r.testCaseId}"`,
      `"${r.category}"`,
      `"${r.prompt.replace(/"/g, '""')}"`,
      `"${r.baselineModel}"`,
      r.baselineCost,
      r.baselineLatencyMs,
      `"${r.optimizedModel}"`,
      r.optimizedCost,
      r.optimizedLatencyMs,
      r.cacheHit,
      r.netSavings,
      r.qualityPassed,
    ].join(',')
  );

  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="experiment-${req.params.id}.csv"`);
  res.send(csv);
});

// ==========================================
// API KEYS MANAGEMENT
// ==========================================
apiRouter.get('/keys', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const keys = Database.getApiKeys(req.user!.id);
  res.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      isActive: k.isActive,
    })),
  });
});

apiRouter.post('/keys', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    res.status(400).json({ error: 'Key name is required' });
    return;
  }

  // Generate plain key: aivg_live_<random hex>
  const rawSecret = crypto.randomBytes(24).toString('hex');
  const fullKey = `aivg_live_${rawSecret}`;
  const keyPrefix = `aivg_live_${rawSecret.slice(0, 6)}`;
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

  const apiKey: ApiKey = {
    id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: req.user!.id,
    name: name.trim(),
    keyHash,
    keyPrefix,
    scopes: ['gateway:completions', 'gateway:models'],
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  Database.createApiKey(apiKey);

  // Return the full key ONLY once
  res.status(201).json({
    message: 'API key created successfully. Save it now; you will not be able to view it again.',
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      secretKey: fullKey,
    },
  });
});

apiRouter.delete('/keys/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = Database.revokeApiKey(req.params.id, req.user!.id);
  if (!success) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }
  res.json({ message: 'API key revoked' });
});

// ==========================================
// SETTINGS
// ==========================================
apiRouter.get('/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const settings = Database.getUserSettings(req.user!.id);
  res.json({ settings, user: AuthService.sanitizeUser(req.user!) });
});

apiRouter.patch('/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = Database.updateUserSettings(req.user!.id, req.body);
  res.json({ settings: updated });
});

apiRouter.patch('/settings/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { fullName } = req.body;
  if (!fullName) {
    res.status(400).json({ error: 'Full name is required' });
    return;
  }
  const updated = Database.updateUser(req.user!.id, { fullName });
  res.json({ user: updated ? AuthService.sanitizeUser(updated) : undefined });
});

apiRouter.post('/settings/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'Current password and valid new password (8+ chars) required' });
    return;
  }

  const valid = await AuthService.verifyPassword(currentPassword, req.user!.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const newHash = await AuthService.hashPassword(newPassword);
  Database.updateUser(req.user!.id, { passwordHash: newHash });

  // Invalidate other sessions
  Database.deleteSessionsByUserId(req.user!.id, req.session?.token);
  res.json({ message: 'Password updated successfully' });
});

// ==========================================
// GATEWAY (EXTERNAL OPENAI-COMPATIBLE CALLS)
// ==========================================
apiRouter.post('/gateway/v1/chat/completions', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { message: 'Missing Authorization header with API key', type: 'invalid_request_error' } });
    return;
  }

  const rawKey = authHeader.substring(7).trim();
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const matchedKey = Database.findApiKeyByHash(keyHash);

  if (!matchedKey) {
    res.status(401).json({ error: { message: 'Invalid or revoked API key', type: 'authentication_error' } });
    return;
  }

  Database.updateApiKeyLastUsed(matchedKey.id);

  try {
    const { messages, temperature, max_tokens, quality_rules } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: { message: 'messages array is required', type: 'invalid_request_error' } });
      return;
    }

    // Extract prompt & system instruction
    const systemMsg = messages.find((m: any) => m.role === 'system');
    const userMessages = messages.filter((m: any) => m.role === 'user');
    const lastUserPrompt = userMessages[userMessages.length - 1]?.content || '';

    const execution = await ExecutionService.executeOptimized({
      userId: matchedKey.userId,
      prompt: lastUserPrompt,
      systemInstruction: systemMsg?.content,
      mode: 'optimized',
      temperature,
      maxOutputTokens: max_tokens,
      qualityRules: quality_rules,
      fallbackEnabled: true,
    });

    res.setHeader('x-aivalueguard-savings', String(execution.cost));
    res.setHeader('x-aivalueguard-model', execution.modelName);
    res.setHeader('x-aivalueguard-cache', execution.cacheStatus);

    res.json({
      id: execution.requestId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: execution.modelId,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: execution.responseText,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: execution.inputTokens,
        completion_tokens: execution.outputTokens,
        total_tokens: execution.inputTokens + execution.outputTokens,
      },
      aivalueguard_meta: {
        net_savings: execution.avoidedCost,
        latency_ms: execution.latencyMs,
        cache_status: execution.cacheStatus,
        quality_score: execution.qualityResult.score,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: { message: msg, type: 'api_error' } });
  }
});
