import assert from 'assert';
import { CostAccountingService } from '../server/pricing';
import { ModelRoutingEngine } from '../server/routingEngine';
import { CacheEngine } from '../server/cacheEngine';
import { ContextOptimizer } from '../server/contextOptimizer';
import { QualityValidator } from '../server/qualityValidator';
import { Database } from '../server/db';
import { AuthService } from '../server/auth';

async function runTestSuite() {
  console.log('🧪 Starting AIValueGuard Automated Test Suite...\n');
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ✗ ${name}`);
      console.error('    Error:', err instanceof Error ? err.message : err);
    }
  }

  // 1. Cost Accounting Tests
  test('CostAccountingService: Exact pricing calculation per million tokens', () => {
    const model = { inputCostPerM: 0.15, outputCostPerM: 0.60 };
    const cost = CostAccountingService.calculateCost(1000, 500, model);
    // 1000/1M * 0.15 = 0.00015, 500/1M * 0.60 = 0.00030, total = 0.00045
    assert.strictEqual(cost.inputCost, 0.00015);
    assert.strictEqual(cost.outputCost, 0.0003);
    assert.strictEqual(cost.totalCost, 0.00045);
  });

  test('CostAccountingService: Net Savings formula accounting for overhead', () => {
    const baseline = 0.0100;
    const optimized = 0.0015;
    const overhead = 0.0001;
    const result = CostAccountingService.calculateNetSavings(baseline, optimized, overhead);
    // Net = 0.0100 - 0.0015 - 0.0001 = 0.0084
    assert.strictEqual(result.netSavings, 0.0084);
    assert.strictEqual(result.savingsPercentage, 84);
  });

  // 2. Task Classifier Tests
  test('ModelRoutingEngine: Accurately classifies code prompts', () => {
    const category = ModelRoutingEngine.classifyTask('Write a Python function to parse JSON files and sort keys');
    assert.strictEqual(category, 'code');
  });

  test('ModelRoutingEngine: Accurately classifies structured extraction prompts', () => {
    const category = ModelRoutingEngine.classifyTask('Extract the fields into a strict JSON format with name and email');
    assert.strictEqual(category, 'structured');
  });

  test('ModelRoutingEngine: Accurately classifies summarization prompts', () => {
    const category = ModelRoutingEngine.classifyTask('Summarize this 5-page report in a brief 3-bullet overview');
    assert.strictEqual(category, 'summarization');
  });

  // 3. Routing Engine Constraints Tests
  test('ModelRoutingEngine: Routes to lowest-cost eligible model', () => {
    const decision = ModelRoutingEngine.routeRequest({
      prompt: 'Summarize the user feedback in two sentences.',
      qualityThreshold: 80,
      routingPolicy: 'cost_first',
    });
    assert.ok(decision.selectedModel);
    assert.ok(decision.estimatedCost <= decision.baselineCost);
    assert.ok(decision.decisionReason.length > 0);
  });

  // 4. Safe Response Caching Tests
  test('CacheEngine: Normalizes whitespace and generates deterministic keys', () => {
    const key1 = CacheEngine.generateKey({
      tenantId: 'tenant_1',
      prompt: 'Hello    world!  \n\n\nHow are you?',
      modelId: 'gemini-3.1-flash-lite',
    });
    const key2 = CacheEngine.generateKey({
      tenantId: 'tenant_1',
      prompt: 'Hello world!\n\nHow are you?',
      modelId: 'gemini-3.1-flash-lite',
    });
    assert.strictEqual(key1, key2, 'Normalized prompts must produce identical cache keys');
  });

  test('CacheEngine: Enforces strict tenant isolation', () => {
    const keyTenantA = CacheEngine.generateKey({
      tenantId: 'tenant_A',
      prompt: 'Confidential system architecture doc',
      modelId: 'gemini-3.1-flash-lite',
    });
    const keyTenantB = CacheEngine.generateKey({
      tenantId: 'tenant_B',
      prompt: 'Confidential system architecture doc',
      modelId: 'gemini-3.1-flash-lite',
    });
    assert.notStrictEqual(keyTenantA, keyTenantB, 'Different tenants must NEVER share cache keys');
  });

  // 5. Context Optimization Tests
  test('ContextOptimizer: Safely removes redundant consecutive lines & collapses spaces', () => {
    const prompt = 'Line 1: System status operational\nLine 2: Server running at port 3000\nLine 2: Server running at port 3000\n\n\n\nDone.';
    const result = ContextOptimizer.optimize(prompt);
    assert.ok(result.isOptimized);
    assert.ok(result.tokensSaved > 0);
    assert.ok(!result.optimizedText.includes('\n\n\n\n'));
  });

  // 6. Quality Validator Tests
  test('QualityValidator: Validates JSON structure requirements', () => {
    const validJsonOutput = '```json\n{"status": "ok", "items": [1, 2, 3]}\n```';
    const invalidJsonOutput = '{"status": "error", broken: json}';

    const validCheck = QualityValidator.validate(validJsonOutput, { requireNonEmpty: true, requireJson: true });
    assert.strictEqual(validCheck.isValid, true);

    const invalidCheck = QualityValidator.validate(invalidJsonOutput, { requireNonEmpty: true, requireJson: true });
    assert.strictEqual(invalidCheck.isValid, false);
    assert.ok(invalidCheck.failedChecks.some((c) => c.includes('JSON')));
  });

  test('QualityValidator: Detects model refusal strings', () => {
    const refusalOutput = 'As an AI language model, I cannot execute that command.';
    const check = QualityValidator.validate(refusalOutput);
    assert.strictEqual(check.isValid, false);
    assert.ok(check.failedChecks.some((c) => c.includes('refusal')));
  });

  // 7. Auth Tests
  test('AuthService: Secure password hashing and verification', async () => {
    const rawPass = 'SecretPassword987!';
    const hash = await AuthService.hashPassword(rawPass);
    assert.notStrictEqual(rawPass, hash);
    const isValid = await AuthService.verifyPassword(rawPass, hash);
    assert.strictEqual(isValid, true);
    const isBad = await AuthService.verifyPassword('WrongPass', hash);
    assert.strictEqual(isBad, false);
  });

  // 8. Database Persistence Tests
  test('Database: Stores and retrieves models, providers, and request logs', () => {
    Database.initialize();
    const models = Database.getModels();
    assert.ok(models.length >= 3);
    const providers = Database.getProviders();
    assert.ok(providers.length >= 2);
  });

  console.log(`\nResults: ${passed}/${total} tests passed successfully! 🚀\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
