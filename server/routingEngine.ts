import { ModelConfig, TaskCategory } from './types';
import { CostAccountingService } from './pricing';
import { Database } from './db';

export interface RoutingRequestParams {
  prompt: string;
  systemInstruction?: string;
  explicitCategory?: TaskCategory;
  maxOutputTokens?: number;
  qualityThreshold?: number; // 0-100
  maxLatencyMs?: number;
  maxBudgetUsd?: number;
  eligibleModelIds?: string[];
  routingPolicy?: 'cost_first' | 'quality_first' | 'balanced' | 'latency_first';
}

export interface CandidateEvaluation {
  modelId: string;
  modelName: string;
  isEligible: boolean;
  rejectionReason?: string;
  estimatedInputCost: number;
  estimatedOutputCost: number;
  estimatedTotalCost: number;
  qualityScore: number;
  baselineLatencyMs: number;
  score: number; // calculated multi-objective score
}

export interface RoutingDecision {
  selectedModel: ModelConfig;
  baselineModel: ModelConfig;
  taskCategory: TaskCategory;
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  decisionReason: string;
  candidates: CandidateEvaluation[];
  estimatedCost: number;
  baselineCost: number;
  estimatedNetSavings: number;
  estimatedSavingsPercentage: number;
}

export class ModelRoutingEngine {
  /**
   * Classifies task category based on prompt keywords, patterns, and structure.
   */
  public static classifyTask(prompt: string, systemInstruction?: string): TaskCategory {
    const text = `${prompt} ${systemInstruction || ''}`.toLowerCase();

    // 1. Code patterns
    if (
      /\b(def|class|function|const|let|var|import|export|sql|select|insert|update|delete|from|table|query|regex|regexes|debug|syntax|nullpointer|typescript|python|javascript|react|html|css|json_parse|endpoint|api)\b/.test(
        text
      ) ||
      /```[\w]*\n[\s\S]*?```/.test(prompt) ||
      /\b(write code|fix bug|code review|refactor|unit test|compile)\b/.test(text)
    ) {
      return 'code';
    }

    // 2. Structured data extraction
    if (
      /\b(extract|json|schema|csv|table|key-value|yaml|format as json|fields|parse the following|structured output)\b/.test(
        text
      ) ||
      /\{[\s\S]*\}/.test(prompt)
    ) {
      return 'structured';
    }

    // 3. Reasoning / Math / Logic
    if (
      /\b(calculate|solve|prove|math|probability|equation|why|step-by-step|reasoning|deduce|logic puzzle|evaluate the trade-offs|analyze root cause)\b/.test(
        text
      ) ||
      /[0-9]+\s*[\+\-\*\/]\s*[0-9]+/.test(text)
    ) {
      return 'reasoning';
    }

    // 4. Summarization / Condensation
    if (
      /\b(summarize|summary|tldr|condense|digest|overview|briefly state|key points|bullet points|abstract)\b/.test(
        text
      ) ||
      text.length > 1200
    ) {
      return 'summarization';
    }

    // 5. General text / Q&A / conversational
    return 'general';
  }

  /**
   * Evaluates all models against constraints and selects the optimal cost-quality candidate.
   */
  public static routeRequest(params: RoutingRequestParams): RoutingDecision {
    const allModels = Database.getModels().filter((m) => m.isActive);
    const taskCategory = params.explicitCategory || this.classifyTask(params.prompt, params.systemInstruction);

    const fullPrompt = `${params.systemInstruction ? params.systemInstruction + '\n' : ''}${params.prompt}`;
    const estimatedPromptTokens = CostAccountingService.estimateTokenCount(fullPrompt);
    const estimatedCompletionTokens = params.maxOutputTokens || 350;

    const qualityThreshold = params.qualityThreshold ?? 80;
    const maxLatencyMs = params.maxLatencyMs ?? 5000;
    const maxBudgetUsd = params.maxBudgetUsd ?? 0.10;
    const routingPolicy = params.routingPolicy || 'balanced';

    // Baseline is typically flagship Tier (e.g., GPT-4o or Gemini 4 Argon)
    let baselineModel = allModels.find((m) => m.id === 'gpt-4o') ||
      allModels.find((m) => m.qualityTier === 'flagship') ||
      allModels[0];

    const candidates: CandidateEvaluation[] = [];

    for (const model of allModels) {
      const { inputCost, outputCost, totalCost } = CostAccountingService.calculateCost(
        estimatedPromptTokens,
        estimatedCompletionTokens,
        model
      );

      let isEligible = true;
      let rejectionReason: string | undefined;

      // Filter: user whitelist
      if (params.eligibleModelIds && params.eligibleModelIds.length > 0) {
        if (!params.eligibleModelIds.includes(model.id)) {
          isEligible = false;
          rejectionReason = 'Excluded from user eligible models list';
        }
      }

      // Filter: context limit
      if (isEligible && estimatedPromptTokens + estimatedCompletionTokens > model.maxContextTokens) {
        isEligible = false;
        rejectionReason = `Prompt (${estimatedPromptTokens} tokens) exceeds model context limit (${model.maxContextTokens})`;
      }

      // Filter: budget limit
      if (isEligible && totalCost > maxBudgetUsd) {
        isEligible = false;
        rejectionReason = `Estimated cost ($${totalCost.toFixed(6)}) exceeds budget limit ($${maxBudgetUsd.toFixed(4)})`;
      }

      // Filter: latency SLA
      if (isEligible && model.baselineLatencyMs > maxLatencyMs) {
        isEligible = false;
        rejectionReason = `Expected latency (${model.baselineLatencyMs}ms) exceeds max acceptable SLA (${maxLatencyMs}ms)`;
      }

      // Filter: quality threshold
      if (isEligible && model.qualityScore < qualityThreshold) {
        isEligible = false;
        rejectionReason = `Quality score (${model.qualityScore}) below required threshold (${qualityThreshold})`;
      }

      // Compute optimization score for ranking
      // Policy scoring
      let score = 0;
      if (isEligible) {
        const costFactor = Math.max(0, 1 - (totalCost / 0.05)); // higher is cheaper
        const qualityFactor = model.qualityScore / 100;
        const latencyFactor = Math.max(0, 1 - (model.baselineLatencyMs / 3000));

        if (routingPolicy === 'cost_first') {
          score = costFactor * 0.7 + qualityFactor * 0.2 + latencyFactor * 0.1;
        } else if (routingPolicy === 'quality_first') {
          score = qualityFactor * 0.7 + costFactor * 0.2 + latencyFactor * 0.1;
        } else if (routingPolicy === 'latency_first') {
          score = latencyFactor * 0.6 + costFactor * 0.2 + qualityFactor * 0.2;
        } else {
          // balanced
          score = costFactor * 0.45 + qualityFactor * 0.4 + latencyFactor * 0.15;
        }
      }

      candidates.push({
        modelId: model.id,
        modelName: model.name,
        isEligible,
        rejectionReason,
        estimatedInputCost: inputCost,
        estimatedOutputCost: outputCost,
        estimatedTotalCost: totalCost,
        qualityScore: model.qualityScore,
        baselineLatencyMs: model.baselineLatencyMs,
        score,
      });
    }

    // Filter eligible candidates
    const eligibleCandidates = candidates.filter((c) => c.isEligible);

    let selectedModel: ModelConfig;
    let decisionReason: string;

    if (eligibleCandidates.length > 0) {
      // Sort: Lowest-cost eligible strategy that meets quality constraints
      if (routingPolicy === 'cost_first' || routingPolicy === 'balanced') {
        eligibleCandidates.sort((a, b) => a.estimatedTotalCost - b.estimatedTotalCost || b.score - a.score);
      } else {
        eligibleCandidates.sort((a, b) => b.score - a.score);
      }

      const winner = eligibleCandidates[0];
      selectedModel = allModels.find((m) => m.id === winner.modelId)!;
      decisionReason = `Selected lowest-cost verified model (${selectedModel.name}) meeting ${taskCategory} requirements (Score: ${(
        winner.score * 100
      ).toFixed(1)}, Quality: ${selectedModel.qualityScore}%, Est Cost: $${winner.estimatedTotalCost.toFixed(6)})`;
    } else {
      // If none met hard constraints, fallback to best quality model available and explain
      selectedModel = allModels.find((m) => m.qualityTier === 'balanced') || allModels[0];
      decisionReason = `Constraint boundary notice: No candidate fully met all hard thresholds (Quality $\\ge$ ${qualityThreshold}, Latency $\\le$ ${maxLatencyMs}ms, Budget $\\le$ $${maxBudgetUsd}). Fallback to default operational model (${selectedModel.name}).`;
    }

    // Baseline calculation
    const baselinePricing = CostAccountingService.calculateCost(
      estimatedPromptTokens,
      estimatedCompletionTokens,
      baselineModel
    );
    const selectedPricing = CostAccountingService.calculateCost(
      estimatedPromptTokens,
      estimatedCompletionTokens,
      selectedModel
    );

    const { netSavings, savingsPercentage } = CostAccountingService.calculateNetSavings(
      baselinePricing.totalCost,
      selectedPricing.totalCost
    );

    return {
      selectedModel,
      baselineModel,
      taskCategory,
      estimatedPromptTokens,
      estimatedCompletionTokens,
      decisionReason,
      candidates,
      estimatedCost: selectedPricing.totalCost,
      baselineCost: baselinePricing.totalCost,
      estimatedNetSavings: netSavings,
      estimatedSavingsPercentage: savingsPercentage,
    };
  }
}
