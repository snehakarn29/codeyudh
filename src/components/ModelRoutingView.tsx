import React, { useEffect, useState } from 'react';
import { api, ModelConfig } from '../api';
import {
  GitBranch,
  CheckCircle2,
  Sliders,
  DollarSign,
  Cpu,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';

export const ModelRoutingView: React.FC = () => {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [routingPolicy, setRoutingPolicy] = useState<'cost_first' | 'balanced' | 'quality_first' | 'latency_first'>('balanced');

  // Simulator state
  const [testPrompt, setTestPrompt] = useState(
    'Extract invoice line items and tax amounts into JSON schema'
  );
  const [simulatedDecision, setSimulatedDecision] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Add custom model modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelIdentifier, setNewModelIdentifier] = useState('');
  const [newInputCost, setNewInputCost] = useState(0.20);
  const [newOutputCost, setNewOutputCost] = useState(0.80);
  const [newMaxContext, setNewMaxContext] = useState(128000);
  const [newQualityTier, setNewQualityTier] = useState<'standard' | 'balanced' | 'flagship'>('balanced');
  const [newQualityScore, setNewQualityScore] = useState(88);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const res = await api.getModels();
      setModels(res.models);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleToggleModelActive = async (model: ModelConfig) => {
    try {
      const updated = await api.updateModel(model.id, { isActive: !model.isActive });
      setModels((prev) => prev.map((m) => (m.id === model.id ? updated.model : m)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createModel({
        name: newModelName,
        modelIdentifier: newModelIdentifier,
        provider: 'custom',
        inputCostPerM: Number(newInputCost),
        outputCostPerM: Number(newOutputCost),
        maxContextTokens: Number(newMaxContext),
        qualityTier: newQualityTier,
        qualityScore: Number(newQualityScore),
        capabilities: ['general', 'code', 'structured'],
      });
      setModels((prev) => [...prev, res.model]);
      setShowAddModal(false);
      setNewModelName('');
      setNewModelIdentifier('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (confirm('Delete this custom model configuration?')) {
      try {
        await api.deleteModel(id);
        setModels((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSimulate = async () => {
    if (!testPrompt.trim()) return;
    setSimulating(true);
    try {
      // Execute routing check in simulation mode
      const res = await api.executePrompt({
        prompt: testPrompt,
        routingPolicy,
        maxOutputTokens: 300,
      });
      setSimulatedDecision(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Policy Selector Banner */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-600" />
            <span>Active Model Routing Policy</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Determines the multi-objective ranking algorithm across the Cost-Quality Frontier
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          {(['balanced', 'cost_first', 'quality_first', 'latency_first'] as const).map((pol) => (
            <button
              key={pol}
              onClick={() => setRoutingPolicy(pol)}
              className={`px-3 py-1.5 rounded-md transition-colors capitalize ${
                routingPolicy === pol
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {pol.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Model Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Configured Model Catalog &amp; Pricing</h2>
            <p className="text-xs text-slate-500">Live token rates used for cost estimation and strategy ranking</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Model</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-3 px-4">Model Name</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Input Rate ($/1M)</th>
                <th className="py-3 px-4">Output Rate ($/1M)</th>
                <th className="py-3 px-4">Max Context</th>
                <th className="py-3 px-4">Quality Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div>{m.name}</div>
                    <div className="font-mono text-[11px] text-slate-400 font-normal">{m.modelIdentifier}</div>
                  </td>
                  <td className="py-3 px-4 capitalize text-slate-600">{m.provider}</td>
                  <td className="py-3 px-4">
                    <span className="capitalize font-medium text-slate-700">{m.qualityTier}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    ${m.inputCostPerM.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    ${m.outputCostPerM.toFixed(3)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {(m.maxContextTokens / 1000).toLocaleString()}k
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700">{m.qualityScore}%</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleModelActive(m)}
                      className={`text-xs font-semibold cursor-pointer ${
                        m.isActive ? 'text-emerald-700 hover:text-emerald-800' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {m.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {m.isCustom && (
                      <button
                        onClick={() => handleDeleteModel(m.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Frontier Simulator */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Interactive Strategy Frontier Simulator</span>
          </h2>
          <p className="text-xs text-slate-500">
            Test how the routing engine categorizes tasks, enforces constraints, and ranks model candidates in real time.
          </p>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Type sample prompt to simulate routing decision..."
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors shrink-0"
          >
            {simulating ? 'Evaluating...' : 'Simulate Routing'}
          </button>
        </div>

        {simulatedDecision && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Selected Optimal Strategy</span>
                <span className="text-sm font-bold text-slate-900">{simulatedDecision.modelName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Estimated Spend</span>
                <span className="text-sm font-bold font-mono text-emerald-700">
                  ${simulatedDecision.cost.toFixed(6)}
                </span>
              </div>
            </div>

            <div className="text-slate-700">
              <span className="font-semibold text-slate-900">Decision Rationale: </span>
              <span>{simulatedDecision.routingDecision}</span>
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Model Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Custom Model Configuration</h3>
            <p className="text-xs text-slate-500 mb-4">Register a specialized model or custom endpoint</p>

            <form onSubmit={handleAddModel} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Llama 3.3 70B Turbo"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Model Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. meta/llama-3.3-70b-instruct"
                  value={newModelIdentifier}
                  onChange={(e) => setNewModelIdentifier(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Input Price ($/1M)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={newInputCost}
                    onChange={(e) => setNewInputCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Output Price ($/1M)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={newOutputCost}
                    onChange={(e) => setNewOutputCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quality Tier</label>
                  <select
                    value={newQualityTier}
                    onChange={(e) => setNewQualityTier(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="standard">Standard</option>
                    <option value="balanced">Balanced</option>
                    <option value="flagship">Flagship</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Benchmark Score (0-100)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={newQualityScore}
                    onChange={(e) => setNewQualityScore(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Save Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
