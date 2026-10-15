import React, { useEffect, useState } from 'react';
import { api, CacheAnalytics } from '../api';
import {
  Database,
  Trash2,
  Clock,
  CheckCircle2,
  TrendingDown,
  Layers,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

export const CacheAnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<CacheAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [ttlHours, setTtlHours] = useState(24);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [savedSettings, setSavedSettings] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getCacheAnalytics();
      setAnalytics(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleClearCache = async () => {
    if (confirm('Flush all cached responses for your account? Subsequent identical requests will re-invoke models.')) {
      try {
        await api.clearCache();
        fetchAnalytics();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.updateCacheSettings({
        cacheTtlSeconds: ttlHours * 3600,
        cacheEnabled,
      });
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 4 Cache KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Stored Cache Entries</span>
            <Database className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {analytics?.totalEntries.toLocaleString() ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tenant-isolated entries</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Cache Hits Served</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {analytics?.totalHits.toLocaleString() ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Direct memory fulfillment</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
            <span>Avoided Provider Cost</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-950">
            ${analytics?.totalCostAvoided.toFixed(5) ?? '0.00000'}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">100% avoided inference fee</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Storage Footprint</span>
            <HardDrive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {analytics?.totalStorageKb ?? 0} KB
          </div>
          <div className="text-[11px] text-slate-500 mt-1">In-memory compressed storage</div>
        </div>
      </div>

      {/* Cache Policy Controls */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cache Eviction &amp; Invalidation Policy</h2>
            <p className="text-xs text-slate-500">Configure time-to-live (TTL) and flush memory caches</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Flush Cache Entries</span>
            </button>
            <button
              onClick={fetchAnalytics}
              className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Cache Status</label>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={cacheEnabled}
                onChange={(e) => setCacheEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <span className="font-medium text-slate-800">Enable Response Caching for Account</span>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Time-to-Live (TTL in Hours)</label>
            <input
              type="number"
              min={1}
              max={720}
              value={ttlHours}
              onChange={(e) => setTtlHours(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSaveSettings}
              className="w-full py-1.5 px-4 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
            >
              {savedSettings ? '✓ Policy Saved' : 'Update Cache Policy'}
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Cache Entries Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Active Cached Responses</h2>
          <p className="text-xs text-slate-500">
            Exact-match normalized entries ready for instantaneous sub-10ms fulfillment
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-3 px-4">Cache Key (SHA-256)</th>
                <th className="py-3 px-4">Prompt Preview</th>
                <th className="py-3 px-4">Associated Model</th>
                <th className="py-3 px-4">Hit Count</th>
                <th className="py-3 px-4">Cost Avoided</th>
                <th className="py-3 px-4">Expires At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics?.entries && analytics.entries.length > 0 ? (
                analytics.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 font-medium">
                      {entry.cacheKey.slice(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-slate-800 max-w-xs truncate">
                      {entry.normalizedPrompt}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{entry.modelId}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{entry.hitCount}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                      ${entry.costAvoided.toFixed(5)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(entry.expiresAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active cache entries. Requests executed in Playground or via API will populate this cache.
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
