import { GoogleGenAI } from '@google/genai';
import { Database } from './db';
import { ModelRoutingEngine, RoutingRequestParams } from './routingEngine';
import { CacheEngine } from './cacheEngine';
import { ContextOptimizer } from './contextOptimizer';
import { QualityValidator, QualityValidationResult } from './qualityValidator';
import { CostAccountingService } from './pricing';
import { ModelConfig, QualityRuleConfig, RequestLog, TaskCategory } from './types';

export interface ExecuteRequestOptions {
  userId: string;
  prompt: string;
  systemInstruction?: string;
  taskCategory?: TaskCategory;
  mode: 'baseline' | 'optimized' | 'compare';
  baselineModelId?: string;
  maxOutputTokens?: number;
  temperature?: number;
  cacheEnabled?: boolean;
  contextOptEnabled?: boolean;
  qualityRules?: QualityRuleConfig;
  fallbackEnabled?: boolean;
  maxBudgetUsd?: number;
  maxLatencyMs?: number;
  routingPolicy?: 'cost_first' | 'quality_first' | 'balanced' | 'latency_first';
}

export interface ExecutionResult {
  mode: 'baseline' | 'optimized';
  modelId: string;
  modelName: string;
  provider: string;
  responseText: string;
  inputTokens: number;
  outputTokens: number;
  tokenSource: 'provider' | 'estimated';
  cost: number;
  latencyMs: number;
  cacheStatus: 'hit' | 'miss' | 'disabled';
  avoidedCost: number;
  qualityResult: QualityValidationResult;
  fallbackApplied: boolean;
  fallbackModelId?: string;
  routingDecision?: string;
  contextOptimized: boolean;
  tokensSavedContext: number;
  requestId: string;
  timestamp: string;
}

export interface CompareExecutionResponse {
  baseline: ExecutionResult;
  optimized: ExecutionResult;
  netSavings: number;
  savingsPercentage: number;
  latencyDifferenceMs: number;
  tokenReduction: number;
}

export class ExecutionService {
  private static geminiClient: GoogleGenAI | null = null;

  private static getGeminiClient(): GoogleGenAI {
    if (!this.geminiClient) {
      this.geminiClient = new GoogleGenAI();
    }
    return this.geminiClient;
  }

  /**
   * Helper that executes generateContent with a timeout.
   */
  private static async generateWithTimeout(
    modelIdentifier: string,
    prompt: string,
    systemInstruction?: string,
    temperature: number = 0.7,
    maxTokens: number = 500,
    timeoutMs: number = 15000
  ): Promise<{ text: string; inputTokens: number; outputTokens: number; tokenSource: 'provider' | 'estimated' }> {
    const client = this.getGeminiClient();

    const callPromise = client.models.generateContent({
      model: modelIdentifier,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms waiting for ${modelIdentifier}`)), timeoutMs)
    );

    const response = await Promise.race([callPromise, timeoutPromise]);
    const text = response.text || '';
    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount || CostAccountingService.estimateTokenCount(prompt);
    const outputTokens = usage?.candidatesTokenCount || CostAccountingService.estimateTokenCount(text);

    return {
      text,
      inputTokens,
      outputTokens,
      tokenSource: usage?.promptTokenCount ? 'provider' : 'estimated',
    };
  }

  /**
   * Invokes upstream model provider or fallback adapter.
   */
  private static async callProvider(
    model: ModelConfig,
    prompt: string,
    systemInstruction?: string,
    temperature: number = 0.7,
    maxTokens: number = 500
  ): Promise<{ text: string; inputTokens: number; outputTokens: number; tokenSource: 'provider' | 'estimated' }> {
    const geminiKey = process.env.GEMINI_API_KEY;

    // OpenAI provider integration (if OPENAI_API_KEY is configured in server env)
    if (model.provider === 'openai' && process.env.OPENAI_API_KEY) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: model.modelIdentifier,
            messages: [
              ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
              { role: 'user', content: prompt },
            ],
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`OpenAI API failed (${res.status}): ${errBody}`);
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        return {
          text,
          inputTokens: data.usage?.prompt_tokens || CostAccountingService.estimateTokenCount(prompt),
          outputTokens: data.usage?.completion_tokens || CostAccountingService.estimateTokenCount(text),
          tokenSource: 'provider',
        };
      } catch (err: unknown) {
        console.warn(`Upstream OpenAI call error: ${err}`);
      }
    }

    // Direct Gemini provider integration
    if (geminiKey) {
      // 1. Try requested model
      try {
        const targetModel =
          model.provider === 'gemini'
            ? model.modelIdentifier
            : 'gemini-3.5-flash';

        return await this.generateWithTimeout(
          targetModel,
          prompt,
          systemInstruction,
          temperature,
          maxTokens,
          14000
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Primary candidate ${model.modelIdentifier} error: ${msg}. Attempting resilient fallback...`);

        // 2. Fallback to gemini-3.5-flash or gemini-3.1-flash-lite
        const fallbacks = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
        for (const fb of fallbacks) {
          if (fb === model.modelIdentifier) continue;
          try {
            return await this.generateWithTimeout(
              fb,
              prompt,
              systemInstruction,
              temperature,
              maxTokens,
              12000
            );
          } catch (fbErr) {
            console.warn(`Fallback ${fb} failed: ${fbErr}`);
          }
        }

        throw new Error(`Provider Execution Error: ${msg}`);
      }
    }

    throw new Error(
      `Provider credentials missing. Please set GEMINI_API_KEY in environment or configure a provider key in Settings.`
    );
  }

  /**
   * Executes a single prompt in Baseline mode.
   */
  public static async executeBaseline(opts: ExecuteRequestOptions): Promise<ExecutionResult> {
    const start = Date.now();
    const models = Database.getModels();
    const targetModel =
      models.find((m) => m.id === opts.baselineModelId) ||
      models.find((m) => m.qualityTier === 'flagship') ||
      models[0];

    const category = opts.taskCategory || ModelRoutingEngine.classifyTask(opts.prompt, opts.systemInstruction);

    // Baseline executes raw without cache or context compression
    const { text, inputTokens, outputTokens, tokenSource } = await this.callProvider(
      targetModel,
      opts.prompt,
      opts.systemInstruction,
      opts.temperature ?? 0.7,
      opts.maxOutputTokens ?? 500
    );

    const latencyMs = Math.max(1, Date.now() - start);
    const { totalCost } = CostAccountingService.calculateCost(inputTokens, outputTokens, targetModel);
    const qualityResult = QualityValidator.validate(text, opts.qualityRules);

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const log: RequestLog = {
      id: requestId,
      userId: opts.userId,
      timestamp,
      taskCategory: category,
      provider: targetModel.provider,
      modelId: targetModel.id,
      modelName: targetModel.name,
      baselineModelId: targetModel.id,
      baselineModelName: targetModel.name,
      routingDecision: `Baseline execution using configured flagship model (${targetModel.name})`,
      cacheStatus: 'disabled',
      inputTokens,
      outputTokens,
      tokenSource,
      estimatedCost: totalCost,
      baselineCost: totalCost,
      netSavings: 0,
      optimizationOverhead: 0,
      latencyMs,
      validationStatus: qualityResult.isValid ? 'passed' : 'failed',
      retryCount: 0,
      fallbackApplied: false,
      promptPreview: opts.prompt.slice(0, 160),
      responsePreview: text.slice(0, 200),
      contextOptimizationApplied: false,
      tokensSavedContext: 0,
    };

    Database.addRequest(log);

    return {
      mode: 'baseline',
      modelId: targetModel.id,
      modelName: targetModel.name,
      provider: targetModel.provider,
      responseText: text,
      inputTokens,
      outputTokens,
      tokenSource,
      cost: totalCost,
      latencyMs,
      cacheStatus: 'disabled',
      avoidedCost: 0,
      qualityResult,
      fallbackApplied: false,
      routingDecision: log.routingDecision,
      contextOptimized: false,
      tokensSavedContext: 0,
      requestId,
      timestamp,
    };
  }

  /**
   * Executes a prompt through the complete AIValueGuard optimization engine:
   * 1. Cache check
   * 2. Context optimization
   * 3. Intelligent model routing
   * 4. Upstream execution
   * 5. Quality validation & bounded fallback
   * 6. Accurate cost & net savings accounting
   */
  public static async executeOptimized(opts: ExecuteRequestOptions): Promise<ExecutionResult> {
    const start = Date.now();
    const cacheEnabled = opts.cacheEnabled ?? true;
    const contextOptEnabled = opts.contextOptEnabled ?? true;
    const userSettings = Database.getUserSettings(opts.userId);
    const models = Database.getModels();

    // Baseline model for savings comparison
    const baselineModel =
      models.find((m) => m.id === opts.baselineModelId) ||
      models.find((m) => m.qualityTier === 'flagship') ||
      models[0];

    // 1. Context Optimization
    let effectivePrompt = opts.prompt;
    let tokensSavedContext = 0;
    let contextOptimized = false;

    if (contextOptEnabled) {
      const optResult = ContextOptimizer.optimize(opts.prompt);
      if (optResult.isOptimized) {
        effectivePrompt = optResult.optimizedText;
        tokensSavedContext = optResult.tokensSaved;
        contextOptimized = true;
      }
    }

    // 2. Intelligent Model Routing
    const routingParams: RoutingRequestParams = {
      prompt: effectivePrompt,
      systemInstruction: opts.systemInstruction,
      explicitCategory: opts.taskCategory,
      maxOutputTokens: opts.maxOutputTokens ?? 400,
      qualityThreshold: opts.qualityRules ? 85 : userSettings.qualityThreshold,
      maxLatencyMs: opts.maxLatencyMs ?? userSettings.latencyLimitMs,
      maxBudgetUsd: opts.maxBudgetUsd ?? userSettings.budgetLimitUsd,
      routingPolicy: opts.routingPolicy || userSettings.defaultRoutingPolicy,
    };

    const routingDecision = ModelRoutingEngine.routeRequest(routingParams);
    let selectedModel = routingDecision.selectedModel;

    // 3. Exact-Match Response Caching
    if (cacheEnabled && userSettings.cacheEnabled) {
      const cacheResult = CacheEngine.lookup({
        tenantId: opts.userId,
        prompt: effectivePrompt,
        systemInstruction: opts.systemInstruction,
        modelId: selectedModel.id,
        temperature: opts.temperature,
      });

      if (cacheResult.isHit && cacheResult.cachedEntry) {
        const cached = cacheResult.cachedEntry;
        const latencyMs = Math.max(8, Date.now() - start);

        // Compute baseline cost
        const { totalCost: baselineCost } = CostAccountingService.calculateCost(
          cached.inputTokens,
          cached.outputTokens,
          baselineModel
        );

        const netSavings = CostAccountingService.calculateNetSavings(baselineCost, 0).netSavings;
        const qualityResult = QualityValidator.validate(cached.responseText, opts.qualityRules);
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const timestamp = new Date().toISOString();

        const log: RequestLog = {
          id: requestId,
          userId: opts.userId,
          timestamp,
          taskCategory: routingDecision.taskCategory,
          provider: 'aivalueguard-cache',
          modelId: cached.modelId,
          modelName: 'Safe Response Cache',
          baselineModelId: baselineModel.id,
          baselineModelName: baselineModel.name,
          routingDecision: 'Exact match cached entry served directly without LLM invocation',
          cacheStatus: 'hit',
          inputTokens: cached.inputTokens,
          outputTokens: cached.outputTokens,
          tokenSource: 'provider',
          estimatedCost: 0,
          baselineCost,
          netSavings,
          optimizationOverhead: 0.000005,
          latencyMs,
          validationStatus: qualityResult.isValid ? 'passed' : 'failed',
          retryCount: 0,
          fallbackApplied: false,
          promptPreview: opts.prompt.slice(0, 160),
          responsePreview: cached.responseText.slice(0, 200),
          contextOptimizationApplied: contextOptimized,
          tokensSavedContext,
        };

        Database.addRequest(log);

        return {
          mode: 'optimized',
          modelId: cached.modelId,
          modelName: 'Safe Response Cache (Hit)',
          provider: 'aivalueguard-cache',
          responseText: cached.responseText,
          inputTokens: cached.inputTokens,
          outputTokens: cached.outputTokens,
          tokenSource: 'provider',
          cost: 0,
          latencyMs,
          cacheStatus: 'hit',
          avoidedCost: baselineCost,
          qualityResult,
          fallbackApplied: false,
          routingDecision: log.routingDecision,
          contextOptimized,
          tokensSavedContext,
          requestId,
          timestamp,
        };
      }
    }

    // 4. Upstream Provider Execution
    let fallbackApplied = false;
    let fallbackModelId: string | undefined;
    let retryCount = 0;
    let providerOutput: { text: string; inputTokens: number; outputTokens: number; tokenSource: 'provider' | 'estimated' };

    try {
      providerOutput = await this.callProvider(
        selectedModel,
        effectivePrompt,
        opts.systemInstruction,
        opts.temperature ?? 0.7,
        opts.maxOutputTokens ?? 400
      );
    } catch (err: unknown) {
      // If primary candidate fails, apply bounded fallback to balanced tier
      console.warn(`Primary candidate failed: ${err}. Attempting fallback model...`);
      const fallbackCandidate =
        models.find((m) => m.id === 'gemini-3.5-flash' && m.id !== selectedModel.id) ||
        models.find((m) => m.id === 'gemini-3.1-flash-lite') ||
        models[0];

      fallbackApplied = true;
      fallbackModelId = fallbackCandidate.id;
      selectedModel = fallbackCandidate;
      retryCount = 1;

      providerOutput = await this.callProvider(
        fallbackCandidate,
        effectivePrompt,
        opts.systemInstruction,
        opts.temperature ?? 0.7,
        opts.maxOutputTokens ?? 400
      );
    }

    // 5. Quality Validation
    let qualityResult = QualityValidator.validate(providerOutput.text, opts.qualityRules);

    // If validation fails and fallback is enabled, execute bounded retry with higher tier
    if (!qualityResult.isValid && opts.fallbackEnabled && !fallbackApplied) {
      const upgradeCandidate =
        models.find((m) => m.id === 'gemini-3.5-flash' && m.id !== selectedModel.id) ||
        models.find((m) => m.id === 'gemini-3.1-flash-lite') ||
        selectedModel;

      if (upgradeCandidate.id !== selectedModel.id) {
        retryCount++;
        fallbackApplied = true;
        fallbackModelId = upgradeCandidate.id;
        selectedModel = upgradeCandidate;

        providerOutput = await this.callProvider(
          upgradeCandidate,
          effectivePrompt,
          opts.systemInstruction,
          opts.temperature ?? 0.7,
          opts.maxOutputTokens ?? 500
        );

        qualityResult = QualityValidator.validate(providerOutput.text, opts.qualityRules);
      }
    }

    const latencyMs = Math.max(1, Date.now() - start);

    // 6. Cost & Savings Accounting
    const { totalCost: optimizedCost } = CostAccountingService.calculateCost(
      providerOutput.inputTokens,
      providerOutput.outputTokens,
      selectedModel
    );

    const { totalCost: baselineCost } = CostAccountingService.calculateCost(
      providerOutput.inputTokens + tokensSavedContext,
      providerOutput.outputTokens,
      baselineModel
    );

    const { netSavings } = CostAccountingService.calculateNetSavings(
      baselineCost,
      optimizedCost,
      0.000005
    );

    // 7. Store in Cache if successful & valid
    if (cacheEnabled && qualityResult.isValid) {
      CacheEngine.store(
        {
          tenantId: opts.userId,
          prompt: effectivePrompt,
          systemInstruction: opts.systemInstruction,
          modelId: selectedModel.id,
          temperature: opts.temperature,
        },
        providerOutput.text,
        providerOutput.inputTokens,
        providerOutput.outputTokens,
        baselineCost - optimizedCost,
        userSettings.cacheTtlSeconds
      );
    }

    // 8. Log Request
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const log: RequestLog = {
      id: requestId,
      userId: opts.userId,
      timestamp,
      taskCategory: routingDecision.taskCategory,
      provider: selectedModel.provider,
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      baselineModelId: baselineModel.id,
      baselineModelName: baselineModel.name,
      routingDecision: routingDecision.decisionReason,
      cacheStatus: 'miss',
      inputTokens: providerOutput.inputTokens,
      outputTokens: providerOutput.outputTokens,
      tokenSource: providerOutput.tokenSource,
      estimatedCost: optimizedCost,
      baselineCost,
      netSavings,
      optimizationOverhead: 0.000005,
      latencyMs,
      validationStatus: qualityResult.isValid ? 'passed' : 'failed',
      retryCount,
      fallbackApplied,
      fallbackModelId,
      promptPreview: opts.prompt.slice(0, 160),
      responsePreview: providerOutput.text.slice(0, 200),
      contextOptimizationApplied: contextOptimized,
      tokensSavedContext,
    };

    Database.addRequest(log);

    return {
      mode: 'optimized',
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      provider: selectedModel.provider,
      responseText: providerOutput.text,
      inputTokens: providerOutput.inputTokens,
      outputTokens: providerOutput.outputTokens,
      tokenSource: providerOutput.tokenSource,
      cost: optimizedCost,
      latencyMs,
      cacheStatus: 'miss',
      avoidedCost: 0,
      qualityResult,
      fallbackApplied,
      fallbackModelId,
      routingDecision: routingDecision.decisionReason,
      contextOptimized,
      tokensSavedContext,
      requestId,
      timestamp,
    };
  }

  /**
   * Executes Compare Both mode: runs baseline and optimized simultaneously on identical input.
   */
  public static async executeCompare(opts: ExecuteRequestOptions): Promise<CompareExecutionResponse> {
    const [baseline, optimized] = await Promise.all([
      this.executeBaseline(opts),
      this.executeOptimized(opts),
    ]);

    const netSavings = Number(Math.max(0, baseline.cost - optimized.cost).toFixed(6));
    const savingsPercentage =
      baseline.cost > 0 ? Number(((netSavings / baseline.cost) * 100).toFixed(2)) : 0;
    const latencyDifferenceMs = baseline.latencyMs - optimized.latencyMs;
    const tokenReduction =
      baseline.inputTokens + baseline.outputTokens - (optimized.inputTokens + optimized.outputTokens);

    return {
      baseline,
      optimized,
      netSavings,
      savingsPercentage,
      latencyDifferenceMs,
      tokenReduction,
    };
  }
}
