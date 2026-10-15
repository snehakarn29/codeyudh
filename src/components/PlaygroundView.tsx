import React, { useState } from 'react';
import { api, ModelConfig } from '../api';
import {
  Terminal,
  Send,
  Copy,
  Check,
  AlertCircle,
  Database,
  Layers,
  Sparkles,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Sliders,
  RefreshCw,
} from 'lucide-react';

interface PlaygroundViewProps {
  onNavigateTab: (tab: any) => void;
}

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({ onNavigateTab }) => {
  const [prompt, setPrompt] = useState(
    'A customer is inquiring whether their annual plan can be refunded 4 days after the renewal date. Draft a concise, empathetic customer support response explaining our standard 14-day refund window and requesting their billing email.'
  );
  const [systemInstruction, setSystemInstruction] = useState(
    'You are a professional customer support specialist for an enterprise AI platform. Keep replies courteous and structured.'
  );
  const [taskCategory, setTaskCategory] = useState<string>('auto');
  const [mode, setMode] = useState<'baseline' | 'optimized' | 'compare'>('compare');
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(350);
  const [temperature, setTemperature] = useState<number>(0.7);

  // Optimization toggles
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [contextOptEnabled, setContextOptEnabled] = useState(true);
  const [fallbackEnabled, setFallbackEnabled] = useState(true);

  // Quality Validation Rules
  const [requireNonEmpty, setRequireNonEmpty] = useState(true);
  const [requireJson, setRequireJson] = useState(false);
  const [requireMarkdownCodeBlock, setRequireMarkdownCodeBlock] = useState(false);
  const [requiredKeywords, setRequiredKeywords] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [singleResult, setSingleResult] = useState<any | null>(null);
  const [compareResult, setCompareResult] = useState<any | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExecute = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to execute.');
      return;
    }

    setError(null);
    setLoading(true);
    setSingleResult(null);
    setCompareResult(null);

    const qualityRules = {
      requireNonEmpty,
      requireJson,
      requireMarkdownCodeBlock,
      requiredKeywords: requiredKeywords
        ? requiredKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
        : undefined,
    };

    const payload = {
      prompt,
      systemInstruction: systemInstruction.trim() || undefined,
      taskCategory: taskCategory === 'auto' ? undefined : taskCategory,
      maxOutputTokens,
      temperature,
      cacheEnabled,
      contextOptEnabled,
      qualityRules,
      fallbackEnabled,
    };

    try {
      if (mode === 'compare') {
        const res = await api.comparePrompt(payload);
        setCompareResult(res);
      } else {
        const res = await api.executePrompt({ ...payload, mode });
        setSingleResult(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Controls Grid */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mode:</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setMode('compare')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  mode === 'compare' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compare Both
              </button>
              <button
                onClick={() => setMode('optimized')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  mode === 'optimized' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AIValueGuard Optimized
              </button>
              <button
                onClick={() => setMode('baseline')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  mode === 'baseline' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Baseline Only
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cacheEnabled}
                onChange={(e) => setCacheEnabled(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Response Cache</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={contextOptEnabled}
                onChange={(e) => setContextOptEnabled(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Context Compression</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={fallbackEnabled}
                onChange={(e) => setFallbackEnabled(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Quality Fallback</span>
            </label>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Prompt Payload</label>
                <span className="text-[11px] text-slate-400">~{Math.ceil(prompt.length / 4)} estimated tokens</span>
              </div>
              <textarea
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter input prompt..."
                className="w-full p-3 text-xs sm:text-sm font-sans bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                System Instructions (Optional)
              </label>
              <input
                type="text"
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                placeholder="Direct the behavior, tone, or formatting constraints..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Parameters & Validation Rules */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3.5 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Execution &amp; Validation Policy</span>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">Task Category Classifier</label>
              <select
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="auto">Auto-Classify (Intelligent Engine)</option>
                <option value="general">General Text / Q&amp;A</option>
                <option value="code">Code &amp; Debugging</option>
                <option value="structured">Structured JSON Extraction</option>
                <option value="summarization">Summarization</option>
                <option value="reasoning">Reasoning &amp; STEM</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Max Output Tokens</label>
                <input
                  type="number"
                  min={50}
                  max={2048}
                  step={50}
                  value={maxOutputTokens}
                  onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Temperature ({temperature})</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <span className="font-semibold text-slate-700 block text-[11px]">Quality Validation Rules:</span>

              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={requireJson}
                  onChange={(e) => setRequireJson(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                />
                <span>Strict JSON Syntax Required</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={requireMarkdownCodeBlock}
                  onChange={(e) => setRequireMarkdownCodeBlock(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                />
                <span>Markdown Code Block (` ``` `)</span>
              </label>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  Required Keywords (comma-separated):
                </label>
                <input
                  type="text"
                  placeholder="e.g. refund, 14-day, email"
                  value={requiredKeywords}
                  onChange={(e) => setRequiredKeywords(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <button
              onClick={handleExecute}
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Execute Request</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Execution Failed:</div>
            <div className="mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {/* 1. COMPARE MODE RESULTS */}
      {compareResult && (
        <div className="space-y-4">
          {/* Net Savings Highlight Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Audited Net Cost Savings
                </div>
                <div className="text-xl font-extrabold text-emerald-950">
                  +${compareResult.netSavings.toFixed(6)} ({compareResult.savingsPercentage}% savings)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-emerald-800">
              <div>
                <span className="text-emerald-600 block text-[11px]">Latency SLA Delta</span>
                <span className="font-bold font-mono">
                  {compareResult.latencyDifferenceMs > 0
                    ? `${compareResult.latencyDifferenceMs}ms faster`
                    : `${Math.abs(compareResult.latencyDifferenceMs)}ms difference`}
                </span>
              </div>
              <div>
                <span className="text-emerald-600 block text-[11px]">Total Token Delta</span>
                <span className="font-bold font-mono">{compareResult.tokenReduction} tokens saved</span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Baseline Column */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Unoptimized Baseline</span>
                    <h3 className="text-sm font-bold text-slate-900">{compareResult.baseline.modelName}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Baseline Spend</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      ${compareResult.baseline.cost.toFixed(6)}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 p-2.5 bg-slate-50 rounded-lg">
                    <div>
                      <span className="block text-slate-400">Tokens</span>
                      <span className="font-mono font-medium text-slate-800">
                        {compareResult.baseline.inputTokens} in / {compareResult.baseline.outputTokens} out
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Latency</span>
                      <span className="font-mono font-medium text-slate-800">
                        {compareResult.baseline.latencyMs}ms
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Quality</span>
                      <span className="font-medium text-emerald-700">
                        {compareResult.baseline.qualityResult.score}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Generated Response</span>
                      <button
                        onClick={() => handleCopy(compareResult.baseline.responseText, 'baseline')}
                        className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px]"
                      >
                        {copiedKey === 'baseline' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                      {compareResult.baseline.responseText}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400">
                Executed raw without caching or adaptive routing.
              </div>
            </div>

            {/* AIValueGuard Optimized Column */}
            <div className="bg-white rounded-xl border border-blue-300 shadow-sm flex flex-col justify-between ring-1 ring-blue-500/10">
              <div>
                <div className="p-4 border-b border-blue-100 flex items-center justify-between bg-blue-50/40 rounded-t-xl">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>AIValueGuard Optimized</span>
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{compareResult.optimized.modelName}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-blue-700 font-semibold block">Actual Spend</span>
                    <span className="text-sm font-bold font-mono text-emerald-700">
                      ${compareResult.optimized.cost.toFixed(6)}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-600 p-2.5 bg-blue-50/30 border border-blue-100 rounded-lg">
                    <div>
                      <span className="block text-slate-400">Tokens</span>
                      <span className="font-mono font-medium text-slate-800">
                        {compareResult.optimized.inputTokens} in / {compareResult.optimized.outputTokens} out
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Latency</span>
                      <span className="font-mono font-medium text-slate-800">
                        {compareResult.optimized.latencyMs}ms
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Cache</span>
                      <span
                        className={`font-semibold ${
                          compareResult.optimized.cacheStatus === 'hit' ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {compareResult.optimized.cacheStatus.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Quality</span>
                      <span className="font-medium text-emerald-700">
                        {compareResult.optimized.qualityResult.score}%
                      </span>
                    </div>
                  </div>

                  {/* Routing Decision Explanation */}
                  {compareResult.optimized.routingDecision && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">Routing Decision: </span>
                      <span>{compareResult.optimized.routingDecision}</span>
                    </div>
                  )}

                  {/* Quality Checklist */}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {compareResult.optimized.qualityResult.passedChecks.map((chk: string, i: number) => (
                      <span key={i} className="text-emerald-700 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{chk}</span>
                      </span>
                    ))}
                    {compareResult.optimized.qualityResult.failedChecks.map((chk: string, i: number) => (
                      <span key={i} className="text-rose-700 flex items-center gap-1 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{chk}</span>
                      </span>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Generated Response</span>
                      <button
                        onClick={() => handleCopy(compareResult.optimized.responseText, 'optimized')}
                        className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px]"
                      >
                        {copiedKey === 'optimized' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                      {compareResult.optimized.responseText}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px]">Request ID: {compareResult.optimized.requestId}</span>
                <button
                  onClick={() => onNavigateTab('logs')}
                  className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                >
                  Inspect in Request Logs →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SINGLE EXECUTION RESULT */}
      {singleResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executed Model</span>
              <h3 className="text-lg font-bold text-slate-900">{singleResult.modelName}</h3>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Actual Cost</span>
                <span className="font-bold font-mono text-slate-900">${singleResult.cost.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Latency</span>
                <span className="font-bold font-mono text-slate-900">{singleResult.latencyMs}ms</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Cache Status</span>
                <span
                  className={`font-semibold ${
                    singleResult.cacheStatus === 'hit' ? 'text-emerald-700' : 'text-slate-600'
                  }`}
                >
                  {singleResult.cacheStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {singleResult.routingDecision && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Decision Rationale: </span>
              <span>{singleResult.routingDecision}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Model Output</span>
              <button
                onClick={() => handleCopy(singleResult.responseText, 'single')}
                className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-xs"
              >
                {copiedKey === 'single' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
              {singleResult.responseText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
