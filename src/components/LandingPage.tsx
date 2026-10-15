import React from 'react';
import {
  ShieldCheck,
  TrendingDown,
  Cpu,
  Layers,
  Zap,
  FlaskConical,
  ArrowRight,
  Database,
  CheckCircle2,
  Lock,
  ChevronRight,
  Activity,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900">AIValueGuard</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-500 font-medium border-l border-slate-200 pl-2">
                Team Targaryens · Code Yudh
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#product" className="hover:text-blue-600 transition-colors">Product</a>
            <a href="#architecture" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#benchmark" className="hover:text-blue-600 transition-colors">Benchmarks</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              Log In
            </button>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full mb-6">
            <Activity className="w-3.5 h-3.5" />
            <span>Track PS-08 · AI Cost Optimization Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Optimize AI Costs. <br />
            <span className="text-blue-600">Preserve Quality.</span> Scale Intelligently.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            An intelligent optimization layer that routes AI requests, reuses eligible responses,
            reduces unnecessary context, and transparently measures cost against verified answer quality.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#architecture"
              className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Explore How It Works
            </a>
          </div>

          {/* Clean Architecture Diagram */}
          <div id="architecture" className="mt-16 pt-12 border-t border-slate-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
              AIValueGuard Gateway Pipeline
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center text-left">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs font-semibold text-slate-500 mb-1">Source</div>
                <div className="font-bold text-slate-900 text-sm">AI Application</div>
                <div className="text-xs text-slate-500 mt-1">SDK or API client</div>
              </div>

              <div className="hidden md:flex justify-center text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-lg shadow-xs">
                <div className="text-xs font-semibold text-blue-600 mb-1">Gateway</div>
                <div className="font-bold text-blue-950 text-sm">AIValueGuard</div>
                <div className="text-xs text-blue-700 mt-1">Auth &amp; Rate limits</div>
              </div>

              <div className="hidden md:flex justify-center text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs font-semibold text-slate-500 mb-1">Engine</div>
                <div className="font-bold text-slate-900 text-sm">Optimization</div>
                <div className="text-xs text-slate-500 mt-1">Routing &amp; Cache</div>
              </div>

              <div className="hidden md:flex justify-center text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs font-semibold text-slate-500 mb-1">Target</div>
                <div className="font-bold text-slate-900 text-sm">Model Provider</div>
                <div className="text-xs text-slate-500 mt-1">Gemini / OpenAI</div>
              </div>

              <div className="hidden md:flex justify-center text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <div className="text-xs font-semibold text-emerald-700 mb-1">Verify</div>
                <div className="font-bold text-emerald-950 text-sm">Quality Check</div>
                <div className="text-xs text-emerald-700 mt-1">Schema &amp; Fallback</div>
              </div>

              <div className="hidden md:flex justify-center text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </div>

              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-lg">
                <div className="text-xs font-semibold text-purple-700 mb-1">Insights</div>
                <div className="font-bold text-purple-950 text-sm">Net Cost Observability</div>
                <div className="text-xs text-purple-700 mt-1">Audited Savings</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 CORE FEATURES */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">Core Platform Capabilities</h2>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              Engineered for Enterprise LLM Efficiency
            </p>
            <p className="mt-3 text-slate-600 text-base">
              Six production-grade pillars that eliminate wasted inference spend while preserving response accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <TrendingDown className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">1. Adaptive Model Routing</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dynamically classifies task complexity (code, structured JSON, reasoning, summary) and routes to the lowest-cost model that satisfies quality and latency constraints.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">2. Safe Response Caching</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Deterministic exact-match caching with prompt normalization, parameter fingerprinting, tenant isolation, and explicit TTL eviction to avoid redundant provider invocations.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">3. Context Optimization</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Safely strips redundant whitespace, repetitive retrieved document passages, and redundant conversational tokens while preserving all instructions and schemas.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">4. Quality Validation &amp; Fallback</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Evaluates response schemas, syntax, and required keywords. When candidate output fails validation, bounded fallback policies retry using higher-tier models.
              </p>
            </div>

            {/* Card 5 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">5. Net Cost Observability</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Real accounting formula: Net Savings = Baseline Cost - Optimized Cost - Optimization Overhead. Real token metrics, zero fabricated numbers.
              </p>
            </div>

            {/* Card 6 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">6. Optimization Laboratory</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Execute reproducible baseline vs. optimized experiments across standardized datasets. Audit p95 latency, quality pass rates, and export CSV logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS: 3 STAGES */}
      <section id="product" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">The 3-Stage Pipeline</h2>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">How AIValueGuard Operates</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Stage 1: Understand</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                The gateway analyzes prompt structure, task category (coding, reasoning, structured, summarization), context length, required SLA latency, and budget ceilings.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Stage 2: Optimize</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Checks exact-match cache for instant zero-cost fulfillment. If miss, compresses redundant tokens, calculates cost for eligible models, and routes to the best value tier.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Stage 3: Validate &amp; Learn</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Executes the request, validates JSON and formatting constraints, applies bounded fallbacks if needed, and records actual token consumption and audited net savings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">AIValueGuard</span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
              <span>Team: <strong className="text-white">Targaryens</strong></span>
              <span>Track: <strong className="text-white">PS-08 AI Cost Optimization</strong></span>
              <span>Organization: <strong className="text-white">Chandigarh University — Code Yudh</strong></span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© 2026 AIValueGuard · Intelligent AI Cost Optimization Platform. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-slate-400 transition-colors">API Documentation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
