import React, { useEffect, useState } from 'react';
import { api, RequestLog } from '../api';
import {
  FileText,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';

export const RequestLogsView: React.FC = () => {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCache, setSelectedCache] = useState('all');

  // Selected Log Modal
  const [activeLog, setActiveLog] = useState<RequestLog | null>(null);

  const fetchLogs = async (targetPage = 1) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: String(targetPage),
        limit: '15',
      };
      if (search) params.search = search;
      if (selectedModel !== 'all') params.model = selectedModel;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedCache !== 'all') params.cacheStatus = selectedCache;

      const res = await api.getRequests(params);
      setLogs(res.logs);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page, selectedModel, selectedCategory, selectedCache]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const handleExportCsv = () => {
    window.location.href = '/api/requests-export/csv';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Inference Audit Logs ({total.toLocaleString()} total entries)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Audited record of token usage, latency SLAs, routing policies, and net cost savings
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filter inputs */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search prompt, model, or Request ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Task Categories</option>
              <option value="general">General</option>
              <option value="code">Code</option>
              <option value="structured">Structured</option>
              <option value="summarization">Summarization</option>
              <option value="reasoning">Reasoning</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCache}
              onChange={(e) => {
                setSelectedCache(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Cache Statuses</option>
              <option value="hit">Cache HIT</option>
              <option value="miss">Cache MISS</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-1.5 px-3 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Filter Logs
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-3 px-3.5">Request ID</th>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Selected Model</th>
                <th className="py-3 px-3.5">Tokens (In/Out)</th>
                <th className="py-3 px-3.5">Actual Cost</th>
                <th className="py-3 px-3.5">Net Savings</th>
                <th className="py-3 px-3.5">Latency</th>
                <th className="py-3 px-3.5">Cache</th>
                <th className="py-3 px-3.5">Validation</th>
                <th className="py-3 px-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setActiveLog(log)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-800 font-medium">
                      {log.id.slice(0, 14)}...
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3.5 capitalize font-medium text-slate-700">
                      {log.taskCategory}
                    </td>
                    <td className="py-3 px-3.5 text-slate-800 font-semibold">{log.modelName}</td>
                    <td className="py-3 px-3.5 font-mono text-slate-600">
                      {log.inputTokens} / {log.outputTokens}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-medium text-slate-900">
                      ${log.estimatedCost.toFixed(5)}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-emerald-700">
                      +${log.netSavings.toFixed(5)}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-600">{log.latencyMs}ms</td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`text-[11px] font-semibold ${
                          log.cacheStatus === 'hit' ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {log.cacheStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`text-[11px] font-bold ${
                          log.validationStatus === 'passed' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {log.validationStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLog(log);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Eye className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No matching request logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Request Detail Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Inference Audit Detail</span>
                <h3 className="text-base font-bold text-slate-900 font-mono">{activeLog.id}</h3>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="text-slate-400 hover:text-slate-700 text-base p-1"
              >
                ✕
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="text-[10px] text-slate-400 block">Model</span>
                <span className="font-semibold text-slate-900">{activeLog.modelName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Actual Spend</span>
                <span className="font-semibold font-mono text-slate-900">
                  ${activeLog.estimatedCost.toFixed(6)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Baseline Spend</span>
                <span className="font-semibold font-mono text-slate-900">
                  ${activeLog.baselineCost.toFixed(6)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Net Cost Savings</span>
                <span className="font-semibold font-mono text-emerald-700">
                  +${activeLog.netSavings.toFixed(6)}
                </span>
              </div>
            </div>

            {/* Routing Decision Explanation */}
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
              <span className="font-semibold text-blue-900 block mb-1">Routing Rationale:</span>
              <p className="text-slate-700">{activeLog.routingDecision}</p>
            </div>

            {/* Context Optimization Status */}
            {activeLog.contextOptimizationApplied && (
              <div className="p-2.5 bg-cyan-50 border border-cyan-100 rounded-lg text-cyan-900">
                <span className="font-semibold">Context Compression Active: </span>
                <span>Saved ~{activeLog.tokensSavedContext} redundant tokens from payload.</span>
              </div>
            )}

            {/* Prompt Preview */}
            <div>
              <span className="font-semibold text-slate-700 block mb-1">Prompt:</span>
              <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto">
                {activeLog.promptPreview}
              </pre>
            </div>

            {/* Response Preview */}
            <div>
              <span className="font-semibold text-slate-700 block mb-1">Generated Output:</span>
              <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                {activeLog.responsePreview}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
