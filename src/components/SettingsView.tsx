import React, { useEffect, useState } from 'react';
import { api, User, UserSettings, ProviderConfig, ModelConfig } from '../api';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Shield,
  Server,
  DollarSign,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Power,
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User;
  onUpdateUser: (u: User) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'providers' | 'pricing' | 'optimization'>('profile');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  // Profile Form
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Provider Test
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, any>>({});

  // Optimization Form
  const [routingPolicy, setRoutingPolicy] = useState<string>('balanced');
  const [cacheTtl, setCacheTtl] = useState<number>(86400);
  const [qualityThreshold, setQualityThreshold] = useState<number>(85);
  const [maxRetries, setMaxRetries] = useState<number>(2);
  const [latencyLimit, setLatencyLimit] = useState<number>(2500);
  const [budgetLimit, setBudgetLimit] = useState<number>(0.05);
  const [optSaved, setOptSaved] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [setRes, provRes, modRes, sesRes] = await Promise.all([
          api.getSettings(),
          api.getProviders(),
          api.getModels(),
          api.getActiveSessions(),
        ]);
        setSettings(setRes.settings);
        setRoutingPolicy(setRes.settings.defaultRoutingPolicy);
        setCacheTtl(setRes.settings.cacheTtlSeconds);
        setQualityThreshold(setRes.settings.qualityThreshold);
        setMaxRetries(setRes.settings.maxRetries);
        setLatencyLimit(setRes.settings.latencyLimitMs);
        setBudgetLimit(setRes.settings.budgetLimitUsd);

        setProviders(provRes.providers);
        setModels(modRes.models);
        setSessions(sesRes.sessions);
      } catch (err) {
        console.error(err);
      }
    };
    loadAll();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateProfile(fullName);
      onUpdateUser(res.user);
      setProfileMsg('Profile updated successfully');
      setTimeout(() => setProfileMsg(null), 2500);
    } catch (err: unknown) {
      setProfileMsg(err instanceof Error ? err.message : 'Error updating profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setPasswordMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Password update failed');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      const res = await api.getActiveSessions();
      setSessions(res.sessions);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProviderId(providerId);
    try {
      const res = await api.testProvider(providerId);
      setTestResult((prev) => ({ ...prev, [providerId]: res }));
      const pRes = await api.getProviders();
      setProviders(pRes.providers);
    } catch (err) {
      console.error(err);
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleUpdatePricing = async (modelId: string, inputCost: number, outputCost: number) => {
    try {
      await api.updateModel(modelId, { inputCostPerM: inputCost, outputCostPerM: outputCost });
      const modRes = await api.getModels();
      setModels(modRes.models);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOptimizationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateSettings({
        defaultRoutingPolicy: routingPolicy as any,
        cacheTtlSeconds: Number(cacheTtl),
        qualityThreshold: Number(qualityThreshold),
        maxRetries: Number(maxRetries),
        latencyLimitMs: Number(latencyLimit),
        budgetLimitUsd: Number(budgetLimit),
      });
      setSettings(res.settings);
      setOptSaved(true);
      setTimeout(() => setOptSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-2 flex flex-wrap gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'security' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security &amp; Sessions</span>
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'providers' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Providers &amp; Credentials</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'pricing' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Pricing Table</span>
        </button>

        <button
          onClick={() => setActiveTab('optimization')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'optimization' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Optimization Defaults</span>
        </button>
      </div>

      {/* 1. PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 max-w-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900">User Profile Settings</h3>
          <p className="text-xs text-slate-500">Manage your identity and account attributes</p>

          {profileMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
              {profileMsg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Contact admin to modify email</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. SECURITY & SESSIONS TAB */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-3xl">
          {/* Password Form */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Update Password</h3>
            <p className="text-xs text-slate-500">Ensure passwords are at least 8 characters with letters and symbols</p>

            {passwordMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                {passwordMsg}
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs max-w-md">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password (8+ chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>

          {/* Active Sessions */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Active Web Sessions</h3>
            <p className="text-xs text-slate-500">Inspect device sessions and invalidate unrecognized logins</p>

            <div className="divide-y divide-slate-100 text-xs">
              {sessions.map((ses) => (
                <div key={ses.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>{ses.userAgent}</span>
                      {ses.isCurrent && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      IP: {ses.ipAddress} · Logged in: {new Date(ses.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {!ses.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(ses.id)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 p-1"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. PROVIDERS TAB */}
      {activeTab === 'providers' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Upstream AI Model Providers</h3>
          <p className="text-xs text-slate-500">
            Configure provider API credentials and test real upstream handshake connectivity
          </p>

          <div className="space-y-4 pt-2">
            {providers.map((prov) => {
              const test = testResult[prov.id];
              return (
                <div key={prov.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{prov.name}</h4>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Type: {prov.providerType} {prov.endpointUrl ? `· ${prov.endpointUrl}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                          prov.status === 'operational'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : prov.status === 'unconfigured'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {prov.status.toUpperCase()}
                      </span>

                      <button
                        onClick={() => handleTestProvider(prov.id)}
                        disabled={testingProviderId === prov.id}
                        className="px-3 py-1 font-semibold text-slate-700 hover:bg-white border border-slate-300 rounded-md shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        {testingProviderId === prov.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                        <span>Test Connection</span>
                      </button>
                    </div>
                  </div>

                  {test && (
                    <div
                      className={`p-2.5 rounded-lg text-[11px] font-medium ${
                        test.success ? 'bg-emerald-100/70 text-emerald-900' : 'bg-rose-100/70 text-rose-900'
                      }`}
                    >
                      {test.message} {test.latencyMs ? `(${test.latencyMs}ms)` : ''}
                    </div>
                  )}

                  {prov.errorMessage && (
                    <div className="text-rose-700 text-[11px]">Last Error: {prov.errorMessage}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. PRICING TABLE TAB */}
      {activeTab === 'pricing' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Customizable Pricing Configuration ($/1M Tokens)</h3>
            <p className="text-xs text-slate-500">
              Update unit pricing per million input and output tokens to match custom provider contracts
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Input Rate ($/1M)</th>
                  <th className="py-2.5 px-3">Output Rate ($/1M)</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {models.map((mod) => (
                  <tr key={mod.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{mod.name}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.001"
                        defaultValue={mod.inputCostPerM}
                        id={`inp_${mod.id}`}
                        className="w-24 px-2 py-1 border border-slate-300 rounded font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.001"
                        defaultValue={mod.outputCostPerM}
                        id={`out_${mod.id}`}
                        className="w-24 px-2 py-1 border border-slate-300 rounded font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          const inp = Number(
                            (document.getElementById(`inp_${mod.id}`) as HTMLInputElement)?.value
                          );
                          const out = Number(
                            (document.getElementById(`out_${mod.id}`) as HTMLInputElement)?.value
                          );
                          handleUpdatePricing(mod.id, inp, out);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Save Price
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. OPTIMIZATION DEFAULTS TAB */}
      {activeTab === 'optimization' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 max-w-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Optimization Engine Default Constraints</h3>
          <p className="text-xs text-slate-500">Default runtime parameters applied to requests and routing policies</p>

          {optSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
              ✓ Optimization settings updated successfully
            </div>
          )}

          <form onSubmit={handleSaveOptimizationSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Routing Strategy</label>
              <select
                value={routingPolicy}
                onChange={(e) => setRoutingPolicy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="balanced">Balanced (Optimal Quality-Cost Frontier)</option>
                <option value="cost_first">Cost First (Prioritize lowest dollar spend)</option>
                <option value="quality_first">Quality First (Prioritize flagship benchmark models)</option>
                <option value="latency_first">Latency First (Prioritize sub-500ms speed)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Quality Threshold (%)</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={qualityThreshold}
                  onChange={(e) => setQualityThreshold(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Retries / Fallbacks</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Acceptable Latency (ms)</label>
                <input
                  type="number"
                  step="100"
                  value={latencyLimit}
                  onChange={(e) => setLatencyLimit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Budget per Query ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
              >
                Save Engine Defaults
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
