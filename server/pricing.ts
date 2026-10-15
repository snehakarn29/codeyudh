import { ModelConfig } from './types';

export class CostAccountingService {
  /**
   * Calculates the exact cost for given token counts and model pricing.
   * Model prices are stored in USD per 1,000,000 (1M) tokens.
   */
  static calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: Pick<ModelConfig, 'inputCostPerM' | 'outputCostPerM'>
  ): { inputCost: number; outputCost: number; totalCost: number } {
    const inputCost = (Math.max(0, inputTokens) / 1_000_000) * model.inputCostPerM;
    const outputCost = (Math.max(0, outputTokens) / 1_000_000) * model.outputCostPerM;
    const totalCost = Number((inputCost + outputCost).toFixed(8));

    return {
      inputCost: Number(inputCost.toFixed(8)),
      outputCost: Number(outputCost.toFixed(8)),
      totalCost,
    };
  }

  /**
   * Calculates Net Cost Savings according to strict specification:
   * Net Savings = Baseline Total Cost - Optimized Total Cost - Optimization Overhead
   */
  static calculateNetSavings(
    baselineCost: number,
    optimizedCost: number,
    optimizationOverhead: number = 0.000005 // Average sub-millisecond proxy/routing overhead
  ): {
    grossSavings: number;
    netSavings: number;
    savingsPercentage: number;
  } {
    const grossSavings = Math.max(0, baselineCost - optimizedCost);
    const netSavings = Math.max(0, baselineCost - optimizedCost - optimizationOverhead);
    const savingsPercentage =
      baselineCost > 0 ? Math.min(100, Math.max(0, (netSavings / baselineCost) * 100)) : 0;

    return {
      grossSavings: Number(grossSavings.toFixed(8)),
      netSavings: Number(netSavings.toFixed(8)),
      savingsPercentage: Number(savingsPercentage.toFixed(2)),
    };
  }

  /**
   * Estimates token count for text using standard heuristic (~4 chars/token).
   */
  static estimateTokenCount(text: string): number {
    if (!text || text.length === 0) return 0;
    // Approximates token count: ~4 characters per token for English text & code
    return Math.max(1, Math.ceil(text.trim().length / 3.8));
  }
}
