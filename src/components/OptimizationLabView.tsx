import React, { useEffect, useState } from 'react';
import { api, Experiment } from '../api';
import {
  FlaskConical,
  Play,
  XCircle,
  Download,
  Plus,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const OptimizationLabView: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [experimentResults, setExperimentResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);

  // New experiment modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExpName, setNewExpName] = useState('Enterprise Workload Cost Audit');
  const [newExpDesc, setNewExpDesc] = useState('Benchmark Gemini Flash-Lite and Adaptive Routing vs GPT-4o Flagship');
  const [datasetCategory, setDatasetCategory] = useState('Representative Multi-Task Benchmark (5 Tasks)');
  const [baselineModel, setBaselineModel] = useState('gpt-4o');
  const [qualityThreshold, setQualityThreshold] = useState(85);
  const [maxLatency, setMaxLatency] = useState(2500);

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      const res = await api.getExperiments();
      setExperiments(res.experiments);
      if (res.experiments.length > 0 && !selectedExperiment) {
        loadExperimentDetails(res.experiments[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadExperimentDetails = async (id: string) => {
    try {
      setResultsLoading(true);
      const res = await api.getExperimentById(id);
      setSelectedExperiment(res.experiment);
      setExperimentResults(res.results);
    } catch (err) {
      console.error(err);
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createExperiment({
        name: newExpName,
        description: newExpDesc,
        datasetCategory,
        baselineModelId: baselineModel,
        qualityThreshold: Number(qualityThreshold),
        maxLatencyMs: Number(maxLatency),
      });
      setExperiments((prev) => [res.experiment, ...prev]);
      setShowCreateModal(false);
      loadExperimentDetails(res.experiment.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunExperiment = async (id: string) => {
    try {
      await api.runExperiment(id);
      // Poll progress every 1s
      const interval = setInterval(async () => {
        const details = await api.getExperimentById(id);
        setSelectedExperiment(details.experiment);
        setExperimentResults(details.results);
        setExperiments((prev) => prev.map((e) => (e.id === id ? details.experiment : e)));

        if (details.experiment.status === 'completed' || details.experiment.status === 'cancelled') {
          clearInterval(interval);
        }
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelExperiment = async (id: string) => {
    try {
      await api.cancelExperiment(id);
      if (selectedExperiment) {
        setSelectedExperiment({ ...selectedExperiment, status: 'cancelled' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCsv = (id: string) => {
    window.location.href = `/api/experiments/${id}/export/csv`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-600" />
            <span>Optimization Laboratory &amp; Benchmarks</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Execute reproducible test suites comparing baseline unoptimized models against AIValueGuard
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Experiment</span>
        </button>
      </div>

      {/* Experiments Selection List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {experiments.map((exp) => {
          const isSelected = selectedExperiment?.id === exp.id;
          return (
            <div
              key={exp.id}
              onClick={() => loadExperimentDetails(exp.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/30 shadow-xs ring-1 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {exp.datasetCategory}
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    exp.status === 'completed'
                      ? 'text-emerald-700'
                      : exp.status === 'running'
                      ? 'text-blue-700 animate-pulse'
                      : 'text-slate-500'
                  }`}
                >
                  {exp.status.toUpperCase()}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mb-1">{exp.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-3">{exp.description}</p>

              {exp.resultsSummary && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 font-medium">
                  <span className="text-emerald-700 font-bold">
                    +{exp.resultsSummary.savingsPercentage}% Net Savings
                  </span>
                  <span className="text-slate-500">{exp.resultsSummary.totalTestCases} Test Cases</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Experiment Dashboard */}
      {selectedExperiment && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-slate-900">{selectedExperiment.name}</h2>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    selectedExperiment.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : selectedExperiment.status === 'running'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedExperiment.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500">{selectedExperiment.description}</p>
            </div>

            <div className="flex items-center gap-2.5">
              {selectedExperiment.status === 'running' ? (
                <button
                  onClick={() => handleCancelExperiment(selectedExperiment.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Job</span>
                </button>
              ) : (
                <button
                  onClick={() => handleRunExperiment(selectedExperiment.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Benchmark</span>
                </button>
              )}

              <button
                onClick={() => handleExportCsv(selectedExperiment.id)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Running Progress Bar */}
          {selectedExperiment.status === 'running' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex justify-between text-xs font-semibold text-blue-900">
                <span>Executing test suite against live endpoints...</span>
                <span>{selectedExperiment.progressPercentage}%</span>
              </div>
              <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${selectedExperiment.progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Summary KPIs */}
          {selectedExperiment.resultsSummary ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Baseline Spend</span>
                <span className="text-base font-bold font-mono text-slate-800">
                  ${selectedExperiment.resultsSummary.totalBaselineCost.toFixed(5)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Optimized Spend</span>
                <span className="text-base font-bold font-mono text-slate-800">
                  ${selectedExperiment.resultsSummary.totalOptimizedCost.toFixed(5)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[11px] text-emerald-700 font-semibold block">Net Savings</span>
                <span className="text-base font-bold font-mono text-emerald-950">
                  +${selectedExperiment.resultsSummary.netSavings.toFixed(5)}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                  {selectedExperiment.resultsSummary.savingsPercentage}% reduction
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Latency SLA</span>
                <span className="text-base font-bold font-mono text-slate-800">
                  {selectedExperiment.resultsSummary.avgOptimizedLatencyMs}ms
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  p95: {selectedExperiment.resultsSummary.p95LatencyMs}ms
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Validation Pass Rate</span>
                <span className="text-base font-bold text-emerald-700">
                  {selectedExperiment.resultsSummary.validationPassRate}%
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 block">Fallback Rate</span>
                <span className="text-base font-bold text-slate-700">
                  {selectedExperiment.resultsSummary.fallbackRate}%
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
              This experiment has not been executed yet. Click "Run Benchmark" above to start evaluation.
            </div>
          )}

          {/* Test Case Breakdown Table */}
          {experimentResults.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-800">Granular Test Case Results</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-white">
                      <th className="py-2.5 px-3">Test Case ID</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Prompt Excerpt</th>
                      <th className="py-2.5 px-3">Baseline</th>
                      <th className="py-2.5 px-3">Optimized</th>
                      <th className="py-2.5 px-3">Net Savings</th>
                      <th className="py-2.5 px-3">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {experimentResults.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 font-medium">
                          {row.testCaseId}
                        </td>
                        <td className="py-2.5 px-3 capitalize text-slate-600">{row.category}</td>
                        <td className="py-2.5 px-3 text-slate-800 max-w-xs truncate">{row.prompt}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          <div>${row.baselineCost.toFixed(5)}</div>
                          <div className="text-[10px] text-slate-400">{row.baselineLatencyMs}ms</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          <div className="font-semibold text-emerald-800">${row.optimizedCost.toFixed(5)}</div>
                          <div className="text-[10px] text-slate-400">{row.optimizedLatencyMs}ms ({row.optimizedModel})</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">
                          +${row.netSavings.toFixed(5)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-semibold text-[11px] ${
                              row.qualityPassed ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {row.qualityPassed ? 'PASSED' : 'FAILED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Experiment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create Optimization Experiment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Set up a controlled benchmark comparing baseline models against AIValueGuard
            </p>

            <form onSubmit={handleCreateExperiment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Experiment Name</label>
                <input
                  type="text"
                  required
                  value={newExpName}
                  onChange={(e) => setNewExpName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Hypothesis</label>
                <textarea
                  rows={2}
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Test Dataset</label>
                <select
                  value={datasetCategory}
                  onChange={(e) => setDatasetCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-medium"
                >
                  <option value="Representative Multi-Task Benchmark (5 Tasks)">
                    Representative Multi-Task Benchmark (5 Tasks: Code, Logic, Extraction, Support, Summary)
                  </option>
                  <option value="Customer Support & Extraction">Customer Support &amp; Extraction Only</option>
                  <option value="Code & Reasoning Intensive">Code &amp; Reasoning Intensive</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baseline Model</label>
                  <select
                    value={baselineModel}
                    onChange={(e) => setBaselineModel(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="gpt-4o">GPT-4o (Flagship)</option>
                    <option value="gemini-4-argon">Gemini 4 Argon</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quality Threshold (%)</label>
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={qualityThreshold}
                    onChange={(e) => setQualityThreshold(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Create Experiment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
