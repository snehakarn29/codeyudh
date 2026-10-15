# AIValueGuard

**Tagline:** Optimize AI Costs. Preserve Quality. Scale Intelligently.  
**Team:** Targaryens  
**Track:** PS-08 — AI Cost Optimization Platform  
**Organization:** Chandigarh University — Code Yudh Hackathon  

---

## 🚀 Overview

**AIValueGuard** is an intelligent AI cost-optimization gateway and observability platform that helps engineering teams reduce LLM inference costs while strictly preserving answer quality, reliability, and latency SLAs.

Instead of blind model downgrading or unmonitored truncation, AIValueGuard introduces an adaptive proxy layer that evaluates every incoming prompt across the **Cost-Quality Frontier**, normalizes and checks response caches for sub-10ms zero-cost fulfillment, strips redundant context, validates output schemas, and applies bounded fallbacks when required.

---

## 🛠️ Key Capabilities & Features

1. **Adaptive Model Routing**
   - Automatically classifies task categories (`code`, `reasoning`, `structured`, `summarization`, `general`).
   - Filters candidate models against hard constraints (max acceptable latency SLA, quality threshold, context limits, budget ceilings).
   - Dynamically selects the lowest-cost eligible strategy.

2. **Safe Response Caching**
   - Deterministic SHA-256 fingerprinting with prompt whitespace normalization and parameter serialization.
   - Strict tenant isolation preventing cross-account cache poisoning.
   - Configurable TTL, instantaneous cache hits (<20ms latency), and exact avoided-cost calculations.

3. **Context Optimization**
   - Safely removes redundant whitespace, repeated context chunks, and redundant lines.
   - Preserves system instructions, formatting, code blocks, and JSON structures.
   - Measures token reduction and cost impact before/after optimization.

4. **Quality Validation & Bounded Fallback**
   - Enforces format rules (valid JSON syntax, schema compliance, markdown code blocks, required keywords, and refusal detection).
   - If output fails validation, applies bounded fallback to higher-tier models (e.g. Gemini 4 Argon or GPT-4o) to prevent broken responses.

5. **Net Cost Observability**
   - Mathematical formula:  
     $$\text{Net Savings} = \text{Baseline Cost} - \text{Optimized Cost} - \text{Optimization Overhead}$$
   - Direct visibility into input tokens, output tokens, latency distributions, and audited dollar savings.

6. **Optimization Laboratory (Benchmarks)**
   - Run reproducible baseline-vs-optimized benchmark suites across standardized multi-task evaluation datasets.
   - Computes aggregate metrics: p95 latency, quality pass rate, fallback rate, cache hit rate, and exportable CSV audit logs.

7. **Developer Proxy Gateway (OpenAI Compatible)**
   - Exposes `POST /api/gateway/v1/chat/completions` accepting standard OpenAI client SDKs and LangChain/LlamaIndex agents.
   - Authorizes requests via `Authorization: Bearer aivg_live_...` API keys.

---

## ⚙️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Recharts, Lucide React
- **Backend:** Node.js (v22), Express, TypeScript (TSX)
- **Database & Persistence:** Transactional, ACID-compliant file-persisted JSON WAL engine (`.data/database.json`) with atomic write buffers and zero external dependencies
- **Authentication:** Bcrypt password hashing, secure HttpOnly session cookies (`aivg_session`), session revocation, and SHA-256 hashed API keys
- **AI Provider Integrations:** Native `@google/genai` TypeScript SDK (supporting `gemini-3.1-flash-lite`, `gemini-3.8-flash`, `gemini-4-argon`), plus OpenAI-compatible gateway adapters

---

## 🚦 Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Variables

Create `.env` using `.env.example`:

```bash
# GEMINI_API_KEY: Injected by AI Studio or set manually
GEMINI_API_KEY="your-google-gemini-api-key"

# Optional session secret
SESSION_SECRET="your-secure-session-secret"

# Server Port (default 3000)
PORT=3000
NODE_ENV="development"
```

### 3. Run Development Server

```bash
npm run dev
```

The application runs full-stack on **http://localhost:3000** (mounting Express API routes and Vite dev middlewares simultaneously).

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 🧪 Automated Testing

AIValueGuard includes a test suite covering cost calculations, task classification, routing algorithms, caching, context compression, quality checks, and auth:

```bash
npm test
```

### Test Suite Results:
- `✓ CostAccountingService: Exact pricing calculation per million tokens`
- `✓ CostAccountingService: Net Savings formula accounting for overhead`
- `✓ ModelRoutingEngine: Accurately classifies code prompts`
- `✓ ModelRoutingEngine: Accurately classifies structured extraction prompts`
- `✓ ModelRoutingEngine: Accurately classifies summarization prompts`
- `✓ ModelRoutingEngine: Routes to lowest-cost eligible model`
- `✓ CacheEngine: Normalizes whitespace and generates deterministic keys`
- `✓ CacheEngine: Enforces strict tenant isolation`
- `✓ ContextOptimizer: Safely removes redundant consecutive lines & collapses spaces`
- `✓ QualityValidator: Validates JSON structure requirements`
- `✓ QualityValidator: Detects model refusal strings`
- `✓ AuthService: Secure password hashing and verification`
- `✓ Database: Stores and retrieves models, providers, and request logs`

**Status:** 13/13 tests passing (100% success rate).

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate and receive session cookie
- `POST /api/auth/logout` - Invalidate session
- `GET  /api/auth/me` - Get current authenticated user
- `POST /api/auth/forgot-password` - Request password reset token
- `POST /api/auth/reset-password` - Set new password with reset token
- `GET  /api/auth/active-sessions` - Inspect active web sessions
- `POST /api/auth/revoke-session` - Invalidate remote session

### Dashboard & Analytics
- `GET  /api/dashboard/summary` - 6 KPI cards & recent activity
- `GET  /api/dashboard/cost-series` - Daily baseline vs. optimized spend
- `GET  /api/dashboard/model-usage` - Distribution of requests by model
- `GET  /api/dashboard/quality-metrics` - Quality pass rate and latency per task category
- `POST /api/dashboard/reset-demo` - Clear seeded demo data

### Playground
- `POST /api/playground/execute` - Execute prompt in Baseline or Optimized mode
- `POST /api/playground/compare` - Compare Baseline and Optimized side-by-side

### Model Routing & Providers
- `GET    /api/models` - List catalog models and pricing
- `POST   /api/models` - Register custom model
- `PATCH  /api/models/:id` - Update rates or toggle active status
- `DELETE /api/models/:id` - Delete custom model
- `GET    /api/providers` - Upstream provider configurations
- `POST   /api/providers/:id/test` - Test upstream connectivity handshake

### Cache Controls
- `GET    /api/cache/analytics` - Cache statistics and entries
- `DELETE /api/cache/entries` - Flush all cache entries
- `PATCH  /api/cache/settings` - Update TTL and enabled status

### Optimization Laboratory
- `GET    /api/experiments` - List experiments
- `POST   /api/experiments` - Create new benchmark
- `GET    /api/experiments/:id` - Get results & test cases
- `POST   /api/experiments/:id/run` - Execute benchmark
- `POST   /api/experiments/:id/cancel` - Cancel active job
- `GET    /api/experiments/:id/export/csv` - Export experiment results to CSV

### API Keys & Gateway
- `GET    /api/keys` - List active API keys
- `POST   /api/keys` - Generate new API key (shown once)
- `DELETE /api/keys/:id` - Revoke API key
- `POST   /api/gateway/v1/chat/completions` - OpenAI-compatible optimization gateway

---

## 👤 Default Demo Credentials

- **Email:** `demo@aivalueguard.com`
- **Password:** `Password123!`
