import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import {
  Mail,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Zap,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

export function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await api.get('/accounts');
      if (res.ok) {
        setAccounts(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load connected accounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(account) {
    setSyncingId(account._id);
    try {
      const res = await api.post(`/accounts/${account._id}/sync`, {});
      if (res.ok) {
        toast.success(`Synced ${account.emailAddress} (${res.data.threadsCount} threads)`);
        await loadAccounts();
      }
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
      await loadAccounts();
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDisconnect(account, purge = false) {
    if (!confirm(`Are you sure you want to disconnect ${account.emailAddress}?`)) return;
    try {
      const res = await api.post(`/accounts/${account._id}/disconnect`, { purge });
      if (res.ok) {
        toast.success(`Disconnected ${account.emailAddress}`);
        await loadAccounts();
      }
    } catch (err) {
      toast.error('Disconnect failed: ' + err.message);
    }
  }

  async function handleSimulate(threadId, description) {
    setSimulating(true);
    try {
      const res = await api.post('/demo/simulate-message', { threadId });
      if (res.ok) {
        toast.success(
          `Simulated message injected: Thread reclassified from ${res.data.previousLabel} to ${res.data.newLabel}!`,
          {
            description: res.data.reason,
            duration: 6000,
          }
        );
      }
    } catch (err) {
      toast.error('Simulation failed: ' + err.message);
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink-900 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/assistant"
            className="inline-flex items-center gap-2 text-xs font-semibold text-ink-700 hover:text-ink-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Assistant Workspace</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink-100 text-ink-700 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span>AES-256-GCM Encrypted Token Storage</span>
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink-900">
            Connected Accounts & Mailbox Ingestion
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Manage live OAuth2 Google Workspace, Microsoft Outlook, and simulated demo mailboxes.
          </p>
        </div>

        {/* Connected Accounts Card List */}
        <div className="bg-white border border-borderMuted rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-borderMuted">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700">
              Active Mailboxes ({accounts.length})
            </h2>
            <button
              onClick={loadAccounts}
              disabled={loading}
              className="text-xs text-ink-500 hover:text-ink-900 flex items-center gap-1 transition"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-ink-500">Loading connected accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-500">No connected accounts found.</div>
          ) : (
            <div className="divide-y divide-borderMuted">
              {accounts.map((acc) => {
                const isSyncing = syncingId === acc._id || acc.status === 'syncing';
                const isError = acc.status === 'error';
                return (
                  <div key={acc._id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-ink-100 flex items-center justify-center text-ink-900 font-bold text-sm">
                        {acc.provider === 'gmail' ? 'G' : acc.provider === 'outlook' ? 'O' : 'D'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink-900">{acc.emailAddress}</span>
                          {/* Status Pill */}
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              isError
                                ? 'bg-red-50 text-red-700'
                                : isSyncing
                                ? 'bg-blue-50 text-accent animate-pulse'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isError ? 'bg-red-500' : isSyncing ? 'bg-accent' : 'bg-emerald-500'
                              }`}
                            />
                            <span>
                              {isError ? 'Sync Error' : isSyncing ? 'Syncing...' : 'Connected & Active'}
                            </span>
                          </span>
                        </div>
                        <div className="text-xs text-ink-500 mt-1 flex items-center gap-3">
                          <span className="capitalize">Provider: {acc.provider}</span>
                          <span>•</span>
                          <span>
                            Last Synced:{' '}
                            {acc.lastSyncedAt
                              ? new Date(acc.lastSyncedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Just now'}
                          </span>
                        </div>

                        {acc.error && (
                          <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{acc.error.message || 'Synchronization failed'}</span>
                            <button
                              onClick={() => handleSync(acc)}
                              className="ml-auto underline font-medium text-[11px]"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleSync(acc)}
                        disabled={isSyncing}
                        className="px-3 py-1.5 rounded-lg border border-borderMuted text-xs font-medium text-ink-700 hover:bg-ink-100 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>

                      {acc.provider !== 'demo' && (
                        <button
                          onClick={() => handleDisconnect(acc)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Disconnect</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Connect New Mailbox Actions */}
          <div className="pt-4 border-t border-borderMuted grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="/api/connect/google"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-borderMuted hover:bg-ink-100/50 text-xs font-semibold text-ink-900 transition"
            >
              <Mail className="h-4 w-4 text-red-500" />
              <span>Connect Google Workspace (Gmail)</span>
            </a>
            <a
              href="/api/connect/microsoft"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-borderMuted hover:bg-ink-100/50 text-xs font-semibold text-ink-900 transition"
            >
              <Mail className="h-4 w-4 text-blue-500" />
              <span>Connect Microsoft Outlook (365)</span>
            </a>
          </div>
        </div>

        {/* Live Demo Message Injection Panel */}
        <div className="bg-white border border-borderMuted rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-900">
              Live Demo: Simulate Inbound Message & Watch Reclassification
            </h2>
          </div>
          <p className="text-xs text-ink-500">
            Click any trigger below to simulate an incoming customer response. The AI pipeline will re-evaluate the thread, apply risk guardrails, update the timeline, and reclassify ownership in real time:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => handleSimulate('th_38', 'Acme Corp Discount Demand')}
              disabled={simulating}
              className="p-3 rounded-xl border border-borderMuted hover:border-accent hover:bg-accent/5 text-left transition group cursor-pointer"
            >
              <div className="text-xs font-semibold text-ink-900 group-hover:text-accent flex items-center justify-between">
                <span>Acme Corp Discount</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-label-clientBg text-label-client font-bold">
                  -&gt; CLIENT
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mt-1">
                Customer demands 20% discount before 4 PM. Triggers financial threshold & escalates to Priya.
              </p>
            </button>

            <button
              onClick={() => handleSimulate('th_39', 'Tahoe Hotel Confirmation')}
              disabled={simulating}
              className="p-3 rounded-xl border border-borderMuted hover:border-accent hover:bg-accent/5 text-left transition group cursor-pointer"
            >
              <div className="text-xs font-semibold text-ink-900 group-hover:text-accent flex items-center justify-between">
                <span>Hotel Reservation Paid</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-label-noReplyBg text-label-noReply font-bold">
                  -&gt; NO REPLY
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mt-1">
                Hotel sends receipt #884920. Resolves offsite thread and archives to Quiet Folder.
              </p>
            </button>

            <button
              onClick={() => handleSimulate('th_40', 'CFO Board Conflict')}
              disabled={simulating}
              className="p-3 rounded-xl border border-borderMuted hover:border-accent hover:bg-accent/5 text-left transition group cursor-pointer"
            >
              <div className="text-xs font-semibold text-ink-900 group-hover:text-accent flex items-center justify-between">
                <span>CFO Meeting Conflict</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-label-reviewBg text-label-review font-bold">
                  -&gt; NEEDS REVIEW
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mt-1">
                CFO locks Thursday 3 PM dry-run, conflicting with Investor Sync on Thread #5.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
