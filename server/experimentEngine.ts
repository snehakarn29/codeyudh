import { Database } from './db';
import { ExecutionService } from './executionService';
import { Experiment, ExperimentResultRow, TestCase } from './types';

// Pre-built representative evaluation dataset for reproducible testing
export const BENCHMARK_DATASET: TestCase[] = [
  {
    id: 'tc_support_01',
    category: 'general',
    prompt:
      'A customer is requesting a refund on an annual SaaS billing plan billed 3 days ago. Write a polite, empathetic support email explaining our 14-day refund policy and requesting their invoice number.',
    expectedKeywords: ['refund', '14-day', 'invoice'],
  },
  {
    id: 'tc_extract_02',
    category: 'structured',
    prompt:
      'Extract the order details from this receipt into strict JSON format with keys "vendor", "date", "subtotal", "tax", "total", and "items" (array of {name, price}): "Acme Cloud Corp. Date: 2026-10-12. Server Hosting: $80.00, Storage Backup: $15.00. Tax: $7.60. Total Charged: $102.60."',
    formatRequirement: 'json',
  },
  {
    id: 'tc_code_03',
    category: 'code',
    prompt:
      'Write a Python function `find_first_duplicate(arr)` that takes a list of integers and returns the first duplicate value encountered, or None if all elements are distinct. Use an O(n) set approach with type hints and docstring.',
    expectedKeywords: ['def find_first_duplicate', 'set', 'return'],
    formatRequirement: 'code',
  },
  {
    id: 'tc_summarize_04',
    category: 'summarization',
    prompt:
      'Provide a 3-bullet executive summary of the following quarterly update: "In Q3, enterprise revenue increased by 28% year-over-year to $42M, driven primarily by expanded adoption of AI gateway products. Gross margins improved by 240 basis points to 78.4%. Operating expenses rose 12% due to data center GPU capacity expansion. Operating cash flow stood at $11.2M, up from $8.1M in the prior year period."',
    expectedKeywords: ['revenue', 'margin', 'cash flow'],
    formatRequirement: 'bullet_points',
  },
  {
    id: 'tc_math_05',
    category: 'reasoning',
    prompt:
      'A cluster runs 12 GPU instances 24 hours a day for 30 days. Each instance costs $1.85 per hour. If AIValueGuard reduces active workload hours by 35% through response caching and prompt compression, calculate: (1) Total baseline cost, (2) Total reduced cost, and (3) Net dollar savings. Show clear arithmetic steps.',
    expectedKeywords: ['15,984', '10,389.60', '5,594.40'],
  },
];

export class ExperimentEngine {
  private static activeJobs: Map<string, boolean> = new Map();

  /**
   * Runs an experiment asynchronously through baseline and optimized pipelines.
   */
  public static async runExperiment(experimentId: string, userId: string): Promise<void> {
    const experiment = Database.getExperimentById(experimentId, userId);
    if (!experiment) throw new Error('Experiment not found');

    this.activeJobs.set(experimentId, true);
    Database.updateExperiment(experimentId, {
      status: 'running',
      progressPercentage: 5,
    });

    const testCases = BENCHMARK_DATASET;
    const totalCases = testCases.length;
    const results: ExperimentResultRow[] = [];

    let totalBaselineCost = 0;
    let totalOptimizedCost = 0;
    let baselineLatencies: number[] = [];
    let optimizedLatencies: number[] = [];
    let passedCount = 0;
    let cacheHits = 0;
    let fallbackCount = 0;

    try {
      for (let i = 0; i < testCases.length; i++) {
        // Check for cancellation
        if (!this.activeJobs.get(experimentId)) {
          Database.updateExperiment(experimentId, { status: 'cancelled' });
          return;
        }

        const tc = testCases[i];

        // 1. Run Baseline
        const baselineRes = await ExecutionService.executeBaseline({
          userId,
          prompt: tc.prompt,
          mode: 'baseline',
          baselineModelId: experiment.baselineModelId,
          maxOutputTokens: 350,
          qualityRules: {
            requireNonEmpty: true,
            requireJson: tc.formatRequirement === 'json',
            requireMarkdownCodeBlock: tc.formatRequirement === 'code',
            requiredKeywords: tc.expectedKeywords,
          },
        });

        // 2. Run Optimized
        const optimizedRes = await ExecutionService.executeOptimized({
          userId,
          prompt: tc.prompt,
          mode: 'optimized',
          baselineModelId: experiment.baselineModelId,
          cacheEnabled: experiment.cacheEnabled,
          contextOptEnabled: experiment.contextOptEnabled,
          maxLatencyMs: experiment.maxLatencyMs,
          maxBudgetUsd: experiment.maxBudgetUsd,
          qualityRules: {
            requireNonEmpty: true,
            requireJson: tc.formatRequirement === 'json',
            requireMarkdownCodeBlock: tc.formatRequirement === 'code',
            requiredKeywords: tc.expectedKeywords,
          },
          fallbackEnabled: true,
        });

        const netSavings = Number(Math.max(0, baselineRes.cost - optimizedRes.cost).toFixed(6));

        const row: ExperimentResultRow = {
          id: `res_${experimentId}_${tc.id}`,
          experimentId,
          testCaseId: tc.id,
          category: tc.category,
          prompt: tc.prompt,
          baselineModel: baselineRes.modelName,
          baselineCost: baselineRes.cost,
          baselineLatencyMs: baselineRes.latencyMs,
          baselineTokens: { input: baselineRes.inputTokens, output: baselineRes.outputTokens },
          baselineOutput: baselineRes.responseText,
          optimizedModel: optimizedRes.modelName,
          optimizedCost: optimizedRes.cost,
          optimizedLatencyMs: optimizedRes.latencyMs,
          optimizedTokens: { input: optimizedRes.inputTokens, output: optimizedRes.outputTokens },
          optimizedOutput: optimizedRes.responseText,
          cacheHit: optimizedRes.cacheStatus === 'hit',
          netSavings,
          qualityPassed: optimizedRes.qualityResult.isValid,
          failedChecks: optimizedRes.qualityResult.failedChecks,
          fallbackTriggered: optimizedRes.fallbackApplied,
          createdAt: new Date().toISOString(),
        };

        Database.addExperimentResult(row);
        results.push(row);

        // Accumulate
        totalBaselineCost += baselineRes.cost;
        totalOptimizedCost += optimizedRes.cost;
        baselineLatencies.push(baselineRes.latencyMs);
        optimizedLatencies.push(optimizedRes.latencyMs);

        if (optimizedRes.qualityResult.isValid) passedCount++;
        if (optimizedRes.cacheStatus === 'hit') cacheHits++;
        if (optimizedRes.fallbackApplied) fallbackCount++;

        const progress = Math.round(((i + 1) / totalCases) * 100);
        Database.updateExperiment(experimentId, { progressPercentage: progress });
      }

      // Compute aggregates
      const measuredOverhead = 0.000005 * totalCases;
      const netSavings = Number(Math.max(0, totalBaselineCost - totalOptimizedCost - measuredOverhead).toFixed(6));
      const savingsPercentage =
        totalBaselineCost > 0 ? Number(((netSavings / totalBaselineCost) * 100).toFixed(2)) : 0;

      const avgBaselineLatencyMs = Math.round(
        baselineLatencies.reduce((a, b) => a + b, 0) / (baselineLatencies.length || 1)
      );
      const avgOptimizedLatencyMs = Math.round(
        optimizedLatencies.reduce((a, b) => a + b, 0) / (optimizedLatencies.length || 1)
      );

      // p95 latency
      optimizedLatencies.sort((a, b) => a - b);
      const p95Index = Math.min(
        optimizedLatencies.length - 1,
        Math.floor(optimizedLatencies.length * 0.95)
      );
      const p95LatencyMs = optimizedLatencies[p95Index] || avgOptimizedLatencyMs;

      Database.updateExperiment(experimentId, {
        status: 'completed',
        progressPercentage: 100,
        resultsSummary: {
          totalTestCases: totalCases,
          successfulCases: passedCount,
          failedCases: totalCases - passedCount,
          totalBaselineCost: Number(totalBaselineCost.toFixed(6)),
          totalOptimizedCost: Number(totalOptimizedCost.toFixed(6)),
          measuredOverhead: Number(measuredOverhead.toFixed(6)),
          netSavings,
          savingsPercentage,
          avgBaselineLatencyMs,
          avgOptimizedLatencyMs,
          p95LatencyMs,
          cacheHitRate: Number(((cacheHits / totalCases) * 100).toFixed(1)),
          validationPassRate: Number(((passedCount / totalCases) * 100).toFixed(1)),
          fallbackRate: Number(((fallbackCount / totalCases) * 100).toFixed(1)),
        },
      });
    } catch (err) {
      console.error('Experiment execution error:', err);
      Database.updateExperiment(experimentId, {
        status: 'cancelled',
      });
    } finally {
      this.activeJobs.delete(experimentId);
    }
  }

  public static cancelExperiment(experimentId: string): boolean {
    if (this.activeJobs.has(experimentId)) {
      this.activeJobs.set(experimentId, false);
      return true;
    }
    return false;
  }
}
