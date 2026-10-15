import React, { useEffect, useState } from 'react';
import { api, ApiKeyItem } from '../api';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Code2,
  Terminal,
  ExternalLink,
} from 'lucide-react';

export const ApiKeysView: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState('Production Microservice Gateway');

  // Once-revealed secret modal
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await api.getApiKeys();
      setKeys(res.keys);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      const res = await api.createApiKey(keyName.trim());
      setRevealedKey(res.apiKey.secretKey);
      setShowCreateModal(false);
      setKeyName('');
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirm('Revoke this API key? External applications using this key will immediately receive 401 Unauthorized.')) {
      try {
        await api.revokeApiKey(id);
        fetchKeys();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const copySecret = () => {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-600" />
            <span>AIValueGuard Gateway API Keys</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Authenticate external backend services and applications through the AIValueGuard optimization proxy
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Key</span>
        </button>
      </div>

      {/* Keys Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900">Active API Keys</h3>
          <p className="text-[11px] text-slate-500">Only SHA-256 hashes are stored. Plain keys are never retained.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-3 px-4">Key Name</th>
                <th className="py-3 px-4">Key Prefix</th>
                <th className="py-3 px-4">Scopes</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Last Used</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.length > 0 ? (
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{k.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-medium">{k.keyPrefix}...</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-slate-600 font-mono">
                        {k.scopes.join(', ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never used'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active API keys found. Generate a key to connect external apps.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Documentation / Code Snippets */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-600" />
            <span>Developer Integration Guide (OpenAI-Compatible Drop-In Proxy)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Connect any LangChain, LlamaIndex, Python OpenAI SDK, or curl client by pointing base URL to AIValueGuard:
          </p>
        </div>

        {/* cURL Example */}
        <div>
          <span className="text-xs font-bold text-slate-700 block mb-1">cURL Gateway Call:</span>
          <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
{`curl -X POST http://localhost:3000/api/gateway/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_AIVG_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "system", "content": "You are a customer assistant."},
      {"role": "user", "content": "Summarize my support ticket."}
    ],
    "temperature": 0.7,
    "max_tokens": 400
  }'`}
          </pre>
        </div>

        {/* Python Example */}
        <div>
          <span className="text-xs font-bold text-slate-700 block mb-1">Python (OpenAI Client drop-in):</span>
          <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
{`from openai import OpenAI

client = OpenAI(
    api_key="YOUR_AIVG_KEY",
    base_url="http://localhost:3000/api/gateway/v1"
)

response = client.chat.completions.create(
    model="aivalueguard-auto",  # Dynamically routed across Cost-Quality Frontier
    messages=[{"role": "user", "content": "Extract items from receipt."}]
)

print(response.choices[0].message.content)`}
          </pre>
        </div>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create Gateway API Key</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter a descriptive label for the consuming application or microservice.
            </p>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Key Name / Environment</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backend Production Lambda"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revealed Secret Key Modal (Shown once!) */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl border border-amber-300 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold">Copy Your AIValueGuard Secret Key</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This secret key is only displayed once. Store it in a secure environment variable or vault. It cannot be retrieved again.
            </p>

            <div className="flex items-center gap-2 p-2.5 bg-slate-100 border border-slate-200 rounded-lg">
              <code className="text-xs font-mono font-bold text-slate-900 break-all select-all flex-1">
                {revealedKey}
              </code>
              <button
                onClick={copySecret}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-1 shrink-0"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setRevealedKey(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                I have saved this key safely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
