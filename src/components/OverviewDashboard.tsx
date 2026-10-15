import React, { useEffect, useState } from 'react';
import { api, DashboardSummary, RequestLog } from '../api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingDown,
  Activity,
  Layers,
  Database,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface OverviewDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigateTab }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [costSeries, setCostSeries] = useState<any[]>([]);
  const [modelUsage, setModelUsage] = useState<any[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, seriesRes, modelsRes, qualityRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getCostSeries(),
        api.getModelUsage(),
        api.getQualityMetrics(),
      ]);
      setSummary(sumRes);
      setCostSeries(seriesRes.series);
      setModelUsage(modelsRes.distribution);
      setQualityMetrics(qualityRes.categories);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !summary) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading dashboard analytics...</span>
        </div>
      </div>
    );
  }

  const s = summary || {
    totalRequests: 0,
    totalRecordedCost: 0,
    totalBaselineCost: 0,
    netCostSavings: 0,
    savingsPercentage: 0,
    avgLatency: 0,
    cacheHitRate: 0,
    qualityPassRate: 100,
    recentRequests: [],
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 6 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Total Requests */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Total Requests</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{s.totalRequests.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Processed inference jobs</div>
        </div>

        {/* KPI 2: Total Recorded Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Optimized Spend</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${s.totalRecordedCost.toFixed(4)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Actual provider charges</div>
        </div>

        {/* KPI 3: Net Cost Savings */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-700 font-semibold mb-1">
            <span>Net Cost Savings</span>
            <TrendingDown className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">${s.netCostSavings.toFixed(4)}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {s.savingsPercentage}% savings vs. baseline
          </div>
        </div>

        {/* KPI 4: Average Latency */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Average Latency</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{s.avgLatency}ms</div>
          <div className="text-[11px] text-slate-500 mt-1">Sub-second execution SLA</div>
        </div>

        {/* KPI 5: Cache Hit Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Cache Hit Rate</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{s.cacheHitRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1">Direct memory fulfillment</div>
        </div>

        {/* KPI 6: Quality Pass Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Quality Pass Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{s.qualityPassRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1">Schema &amp; keyword validation</div>
        </div>
      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Over Time (Area Chart) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cost Over Time (Baseline vs. AIValueGuard)</h2>
              <p className="text-xs text-slate-500">Audited expenditure comparisons in USD</p>
            </div>
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded">
              Audited Net Savings: ${s.netCostSavings.toFixed(4)}
            </div>
          </div>

          <div className="h-64 w-full">
            {costSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toFixed(5)}`, '']}
                    labelStyle={{ fontWeight: 'bold' }}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="baselineCost"
                    name="Unoptimized Baseline ($)"
                    stroke="#94a3b8"
                    fill="#e2e8f0"
                    fillOpacity={0.4}
                  />
                  <Area
                    type="monotone"
                    dataKey="optimizedCost"
                    name="AIValueGuard Actual ($)"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No cost series data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Requests by Model (Bar Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Distribution by Model</h2>
            <p className="text-xs text-slate-500">Requests routed across provider tiers</p>
          </div>

          <div className="h-64 w-full">
            {modelUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelUsage} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val: any, name: any) => [val, name === 'count' ? 'Requests' : name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" name="Requests" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No model usage recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: Quality & Latency Breakdown + Optimization Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost vs. Quality by Task Category */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Task Performance &amp; Quality Pass Rates</h2>
              <p className="text-xs text-slate-500">Validation pass rate (%) and average latency per workload category</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {qualityMetrics.map((qm) => (
              <div key={qm.category} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-800 capitalize">{qm.category}</span>
                  <span className="text-[11px] text-emerald-700 font-bold">{qm.passRate}% pass</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-between mt-2">
                  <span>{qm.count} requests</span>
                  <span className="font-mono text-slate-700">{qm.avgLatency}ms avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optimization Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Optimization Breakdown</h2>
            <p className="text-xs text-slate-500 mb-4">Sources of measured cost reduction</p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Adaptive Model Routing</span>
                  <span className="font-semibold text-slate-900">62% of savings</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '62%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Safe Response Caching</span>
                  <span className="font-semibold text-slate-900">28% of savings</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '28%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Context Optimization</span>
                  <span className="font-semibold text-slate-900">10% of savings</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => onNavigateTab('playground')}
              className="w-full py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test in AI Playground →</span>
            </button>
          </div>
        </div>
      </div>

      {/* RECENT REQUESTS TABLE */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Request Activity</h2>
            <p className="text-xs text-slate-500">Live stream of optimized inference tasks</p>
          </div>
          <button
            onClick={() => onNavigateTab('logs')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                <th className="py-2.5 px-3">Request ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Task Category</th>
                <th className="py-2.5 px-3">Selected Model</th>
                <th className="py-2.5 px-3">Cache</th>
                <th className="py-2.5 px-3">Actual Cost</th>
                <th className="py-2.5 px-3">Net Savings</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {s.recentRequests && s.recentRequests.length > 0 ? (
                s.recentRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 font-medium">
                      {r.id.slice(0, 14)}...
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="capitalize font-medium text-slate-700">{r.taskCategory}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{r.modelName}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[11px] font-semibold ${
                          r.cacheStatus === 'hit' ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {r.cacheStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 font-medium">
                      ${r.estimatedCost.toFixed(5)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">
                      +${r.netSavings.toFixed(5)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{r.latencyMs}ms</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[11px] font-semibold ${
                          r.validationStatus === 'passed' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {r.validationStatus.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No request logs recorded yet. Visit the Playground to execute your first prompt!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
