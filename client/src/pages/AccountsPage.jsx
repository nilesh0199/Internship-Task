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
    <div className="min-h-screen bg-[#FAF8F5] text-ink-900 p-6 md:p-12 font-sans select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/assistant"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/[0.06] shadow-soft text-xs font-semibold text-ink-700 hover:text-ink-900 hover:bg-ink-50 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Assistant Workspace</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-black/[0.06] shadow-soft text-ink-700 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span>AES-256-GCM Encrypted Token Storage</span>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-bold text-ink-900 tracking-tight">
            Connected Accounts & Mailbox Ingestion
          </h1>
          <p className="text-xs text-ink-500 max-w-xl leading-relaxed">
            Manage live OAuth2 Google Workspace, Microsoft 365, and simulated demo mailboxes with real-time bidirectional synchronization.
          </p>
        </div>

        {/* Connected Accounts Card List */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-7 md:p-8 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-borderMuted/70">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">
              Active Mailboxes ({accounts.length})
            </h2>
            <button
              onClick={loadAccounts}
              disabled={loading}
              className="text-xs font-semibold text-ink-600 hover:text-ink-900 px-3 py-1 rounded-full bg-ink-50 hover:bg-ink-100 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-accent' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-ink-400">Loading connected accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-400">No connected accounts found.</div>
          ) : (
            <div className="divide-y divide-borderMuted/50">
              {accounts.map((acc) => {
                const isSyncing = syncingId === acc._id || acc.status === 'syncing';
                const isError = acc.status === 'error';
                return (
                  <div key={acc._id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="h-10 w-10 rounded-2xl bg-ink-100 flex items-center justify-center text-ink-900 font-bold text-sm shadow-2xs flex-shrink-0">
                        {acc.provider === 'gmail' ? 'G' : acc.provider === 'outlook' ? 'O' : 'D'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-ink-900 tracking-tight">{acc.emailAddress}</span>
                          {/* Status Pill */}
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                              isError
                                ? 'bg-red-50 text-red-700 border border-red-200/60'
                                : isSyncing
                                ? 'bg-blue-50 text-accent animate-pulse border border-blue-200/60'
                                : 'bg-[#F0FDFA] text-[#0F766E] border border-teal-200/60'
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
                          <span className="font-mono text-[11px]">
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
                          <div className="mt-2.5 p-3 rounded-2xl bg-red-50/90 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{acc.error.message || 'Synchronization failed'}</span>
                            <button
                              onClick={() => handleSync(acc)}
                              className="ml-auto underline font-semibold text-xs cursor-pointer"
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
                        className="px-4 py-2 rounded-full border border-black/[0.06] bg-white hover:bg-ink-50 text-xs font-semibold text-ink-700 hover:text-ink-900 flex items-center gap-1.5 transition shadow-soft cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>

                      {acc.provider !== 'demo' && (
                        <button
                          onClick={() => handleDisconnect(acc)}
                          className="px-4 py-2 rounded-full border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1 transition cursor-pointer active:scale-95"
                        >
                          <Trash2 className="h-3 w-3" />
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
          <div className="pt-4 border-t border-borderMuted/60 grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="/api/connect/google"
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl border border-black/[0.06] bg-white hover:bg-ink-50 text-xs font-semibold text-ink-900 transition shadow-soft active:scale-95"
            >
              <Mail className="h-4 w-4 text-red-500" />
              <span>Connect Google Workspace (Gmail)</span>
            </a>
            <a
              href="/api/connect/microsoft"
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl border border-black/[0.06] bg-white hover:bg-ink-50 text-xs font-semibold text-ink-900 transition shadow-soft active:scale-95"
            >
              <Mail className="h-4 w-4 text-blue-500" />
              <span>Connect Microsoft Outlook (365)</span>
            </a>
          </div>
        </div>

        {/* Live Demo Message Injection Panel */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-7 md:p-8 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-accent/10 text-accent flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-900">
              Live Demo: Simulate Inbound Message & Watch Reclassification
            </h2>
          </div>
          <p className="text-xs text-ink-500 leading-relaxed">
            Click any trigger below to simulate an incoming executive response. The AI pipeline will re-evaluate the thread, apply risk guardrails, update the timeline, and reclassify ownership in real time:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            <button
              onClick={() => handleSimulate('th_38', 'Acme Corp Discount Demand')}
              disabled={simulating}
              className="p-4 rounded-2xl border border-black/[0.05] bg-[#FAF8F5]/80 hover:bg-white hover:border-accent hover:shadow-card text-left transition-all duration-200 group cursor-pointer active:scale-95"
            >
              <div className="text-xs font-bold text-ink-900 group-hover:text-accent flex items-center justify-between mb-1.5">
                <span>Acme Corp Discount</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-label-clientBg text-label-client font-bold border border-label-client/20">
                  -&gt; CLIENT
                </span>
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                Customer demands 20% discount before 4 PM. Triggers financial threshold & escalates to Priya.
              </p>
            </button>

            <button
              onClick={() => handleSimulate('th_39', 'Tahoe Hotel Confirmation')}
              disabled={simulating}
              className="p-4 rounded-2xl border border-black/[0.05] bg-[#FAF8F5]/80 hover:bg-white hover:border-accent hover:shadow-card text-left transition-all duration-200 group cursor-pointer active:scale-95"
            >
              <div className="text-xs font-bold text-ink-900 group-hover:text-accent flex items-center justify-between mb-1.5">
                <span>Hotel Reservation Paid</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-label-noReplyBg text-label-noReply font-bold border border-label-noReply/20">
                  -&gt; NO REPLY
                </span>
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                Hotel sends receipt #884920. Resolves offsite thread and archives to Quiet Folder.
              </p>
            </button>

            <button
              onClick={() => handleSimulate('th_40', 'CFO Board Conflict')}
              disabled={simulating}
              className="p-4 rounded-2xl border border-black/[0.05] bg-[#FAF8F5]/80 hover:bg-white hover:border-accent hover:shadow-card text-left transition-all duration-200 group cursor-pointer active:scale-95"
            >
              <div className="text-xs font-bold text-ink-900 group-hover:text-accent flex items-center justify-between mb-1.5">
                <span>CFO Meeting Conflict</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-label-reviewBg text-label-review font-bold border border-label-review/20">
                  -&gt; NEEDS REVIEW
                </span>
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                CFO locks Thursday 3 PM dry-run, conflicting with Investor Sync on Thread #5.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
