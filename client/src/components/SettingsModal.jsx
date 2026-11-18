import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import { AiProviderSettingsTab } from './AiProviderSettingsTab.jsx';
import {
  Settings,
  Mail,
  Shield,
  Key,
  Users,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Sliders,
  CheckCircle2,
  X,
  Keyboard,
  ArrowRight,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { toast } from 'sonner';

export function SettingsModal({ isOpen, onClose, mode = 'assistant', activeClient = null }) {
  const { user, logout } = useAuth();
  useBodyScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState(mode === 'client' ? 'profile' : 'ai_provider');

  useEffect(() => {
    setActiveTab(mode === 'client' ? 'profile' : 'ai_provider');
  }, [mode]);
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Playbook state for active client (shared by assistant & client VIPs)
  const [playbook, setPlaybook] = useState(null);
  const [loadingPlaybook, setLoadingPlaybook] = useState(false);
  const [vipSenders, setVipSenders] = useState([]);
  const [vipDomains, setVipDomains] = useState([]);
  const [newVipEmail, setNewVipEmail] = useState('');
  const [newVipDomain, setNewVipDomain] = useState('');
  const [savingVips, setSavingVips] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load connected accounts / playbook when opening settings
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'assistant') {
      loadAccounts();
      if (activeClient?._id) {
        loadPlaybook(activeClient._id);
      }
    } else if (mode === 'client') {
      loadPlaybook();
    }
  }, [isOpen, mode, activeClient]);

  async function loadAccounts() {
    setLoadingAccounts(true);
    try {
      const res = await api.get('/accounts');
      if (res.ok && Array.isArray(res.data)) {
        setAccounts(res.data);
      }
    } catch (err) {
      // Fallback sample accounts if offline
      setAccounts([
        {
          _id: 'acc_demo_01',
          provider: 'google',
          email: 'priya@vortexdynamics.com',
          name: 'Priya Sharma (Google Workspace)',
          status: 'connected',
          lastSyncedAt: new Date(),
        },
        {
          _id: 'acc_demo_02',
          provider: 'microsoft',
          email: 'rohan@apexlogistics.com',
          name: 'Rohan Kapoor (Microsoft 365)',
          status: 'connected',
          lastSyncedAt: new Date(),
        },
      ]);
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function loadPlaybook(clientId = null) {
    setLoadingPlaybook(true);
    try {
      const url = clientId ? `/playbook?clientId=${clientId}` : '/playbook';
      const res = await api.get(url);
      if (res.ok && res.data) {
        setPlaybook(res.data);
        setVipSenders(Array.isArray(res.data.vipSenders) ? res.data.vipSenders : []);
        setVipDomains(Array.isArray(res.data.vipDomains) ? res.data.vipDomains : []);
      }
    } catch {
      // keep existing
    } finally {
      setLoadingPlaybook(false);
    }
  }

  async function saveVipLists(nextSenders, nextDomains, successMessage) {
    setSavingVips(true);
    try {
      const res = await api.put('/playbook/vips', {
        vipSenders: nextSenders,
        vipDomains: nextDomains,
      });
      if (res.ok && res.data) {
        setVipSenders(res.data.vipSenders || []);
        setVipDomains(res.data.vipDomains || []);
        toast.success(successMessage);
      }
    } catch (err) {
      toast.error(err.message || 'Could not update VIP contacts');
    } finally {
      setSavingVips(false);
    }
  }

  async function handleAddVipEmail(e) {
    e.preventDefault();
    const email = newVipEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address (e.g. partner@upfront.com)');
      return;
    }
    if (vipSenders.includes(email)) {
      toast.info(`${email} is already in your VIP list.`);
      setNewVipEmail('');
      return;
    }
    setNewVipEmail('');
    await saveVipLists([...vipSenders, email], vipDomains, `Added ${email} to VIP Priority Senders`);
  }

  async function handleRemoveVipEmail(email) {
    const next = vipSenders.filter((s) => s !== email);
    await saveVipLists(next, vipDomains, `Removed ${email} from VIP Priority Senders`);
  }

  async function handleAddVipDomain(e) {
    e.preventDefault();
    const domain = newVipDomain.trim().toLowerCase().replace(/^@/, '');
    if (!domain) return;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      toast.error('Please enter a valid domain (e.g. sequoia.com)');
      return;
    }
    if (vipDomains.includes(domain)) {
      toast.info(`${domain} is already a VIP domain.`);
      setNewVipDomain('');
      return;
    }
    setNewVipDomain('');
    await saveVipLists(vipSenders, [...vipDomains, domain], `Added @${domain} to VIP Priority Domains`);
  }

  async function handleRemoveVipDomain(domain) {
    const next = vipDomains.filter((d) => d !== domain);
    await saveVipLists(vipSenders, next, `Removed @${domain} from VIP Priority Domains`);
  }

  async function handleSyncAccount(accId) {
    setSyncingId(accId);
    try {
      const res = await api.post(`/accounts/${accId}/sync`, {});
      if (res.ok) {
        toast.success('Mailbox synced successfully (AES-256 encrypted)');
        await loadAccounts();
      }
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  }

  async function handleSimulateInbound() {
    setSimulating(true);
    try {
      const res = await api.post('/demo/simulate-inbound', {
        clientId: activeClient?._id || 'client_priya_001',
      });
      if (res.ok) {
        toast.success(res.message || 'Simulated incoming email received & triaged live!');
      }
    } catch (err) {
      toast.error('Simulation failed: ' + err.message);
    } finally {
      setSimulating(false);
    }
  }

  async function handleResetDemo() {
    if (!window.confirm('Reset all threads, drafts, and audit logs to the pristine demo dataset?')) {
      return;
    }
    setResetting(true);
    try {
      const res = await api.post('/demo/reset', {});
      if (res.ok) {
        toast.success('Workspace reset to pristine seed data (60 threads)!');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err) {
      toast.error('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  }

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white rounded-3xl border border-black/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-black/[0.08] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-ink-900 text-white">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-ink-900">
                {mode === 'client' ? 'Executive Settings & Preferences' : 'Workspace Operations & Settings'}
              </h2>
              <p className="text-[11px] text-ink-500">
                {mode === 'client'
                  ? 'Configure your executive attention boundaries, delegation defaults, and security.'
                  : 'Manage connected mailboxes, client delegation rules, safety guardrails, and demo tools.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-ink-500 hover:text-ink-900 transition cursor-pointer"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Layout: Sidebar Tabs + Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Navigation Rail */}
          <nav className="w-full md:w-52 border-b md:border-b-0 md:border-r border-black/[0.08] bg-[#FAF8F5]/50 p-3 space-y-1 flex-shrink-0">
            {mode === 'assistant' ? (
              <>
                {[
                  { id: 'ai_provider', label: 'AI Provider & API Key', icon: Key },
                  { id: 'accounts', label: 'Connected Mailboxes', icon: Mail },
                  { id: 'playbook', label: 'Client Playbooks', icon: Sliders },
                  { id: 'safety', label: 'AI & Safety Rules', icon: Shield },
                  { id: 'demo', label: 'Demo Tools & Reset', icon: Sparkles },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-ink-900 text-white shadow-soft font-semibold'
                          : 'text-ink-600 hover:bg-black/5 hover:text-ink-900'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {[
                  { id: 'profile', label: 'Executive Profile', icon: Users },
                  { id: 'priorities', label: 'VIP Contacts', icon: Shield },
                  { id: 'security', label: 'Security & Sign Out', icon: Key },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-ink-900 text-white shadow-soft font-semibold'
                          : 'text-ink-600 hover:bg-black/5 hover:text-ink-900'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          {/* Right Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {/* 0. ASSISTANT: AI Provider & API Key (BYOK) */}
            {mode === 'assistant' && activeTab === 'ai_provider' && (
              <AiProviderSettingsTab />
            )}

            {/* 1. ASSISTANT: Connected Accounts */}
            {mode === 'assistant' && activeTab === 'accounts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-sm text-ink-900">Connected Executive Mailboxes</h3>
                    <p className="text-xs text-ink-500">OAuth tokens are encrypted at rest using AES-256-GCM.</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-mono font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>AES-256-GCM</span>
                  </span>
                </div>

                <div className="space-y-2.5">
                  {accounts.map((acc) => (
                    <div
                      key={acc._id}
                      className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-white border border-black/10 flex items-center justify-center font-bold text-xs text-ink-700">
                          {acc.provider === 'google' ? 'G' : 'M'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-ink-900">{acc.name || acc.email}</p>
                          <p className="text-[11px] text-ink-500 font-mono">{acc.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                          Active Sync
                        </span>
                        <button
                          onClick={() => handleSyncAccount(acc._id)}
                          disabled={syncingId === acc._id}
                          className="p-1.5 rounded-lg bg-white border border-black/10 hover:bg-ink-100 text-ink-600 transition cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Trigger manual sync"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${syncingId === acc._id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 space-y-1">
                  <p className="font-semibold">Simulated Email Transmit Safety Gate</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Outbound sending is strictly simulated in demo mode (`SEND_ENABLED=false`). Human authorization is required before any email can be dispatched.
                  </p>
                </div>
              </div>
            )}

            {/* 2. ASSISTANT: Client Playbooks */}
            {mode === 'assistant' && activeTab === 'playbook' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif font-bold text-sm text-ink-900">
                    Client Delegation Rules — {activeClient?.name || 'Priya Sharma'}
                  </h3>
                  <p className="text-xs text-ink-500">
                    Defines what Maya Lin is authorized to handle autonomously vs what escalates.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-black/[0.08]">
                    <span className="text-[10px] font-mono text-ink-500 uppercase font-bold tracking-wider">
                      Spending Threshold
                    </span>
                    <p className="text-base font-bold text-ink-900 mt-1">$1,000 USD</p>
                    <p className="text-[11px] text-ink-500">Invoices above $1,000 always require executive signoff.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-black/[0.08]">
                    <span className="text-[10px] font-mono text-ink-500 uppercase font-bold tracking-wider">
                      VIP Protection
                    </span>
                    <p className="text-base font-bold text-ink-900 mt-1">Active</p>
                    <p className="text-[11px] text-ink-500">VIP senders can never be filed as No Reply Needed.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-ink-800">VIP Senders (Never Auto-Filed):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(playbook?.vipSenders || ['mark.suster@upfront.com', 'anjali.sharma@gmail.com', 'board@vortexdynamics.com']).map((v, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full bg-ink-100 text-ink-800 text-[11px] font-mono border border-black/5"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. ASSISTANT: AI & Safety Rules */}
            {mode === 'assistant' && activeTab === 'safety' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif font-bold text-sm text-ink-900">Autonomous Safety Guardrails</h3>
                  <p className="text-xs text-ink-500">Deterministic code-level invariants protecting executive clients.</p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] flex items-start gap-3">
                    <Shield className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-ink-900">Zero Email Send Autonomy</p>
                      <p className="text-ink-600 text-[11px] leading-relaxed">
                        AI agents only prepare drafts and proposals. Emails are never dispatched without explicit human click.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] flex items-start gap-3">
                    <Shield className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-ink-900">Guardian Reversal & Audit Engine</p>
                      <p className="text-ink-600 text-[11px] leading-relaxed">
                        A deterministic safety agent monitors all auto-handled threads for wires, contracts, and legal terms, automatically reversing misfiled emails.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] flex items-start gap-3">
                    <Shield className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-ink-900">Daily Agent Run Cap</p>
                      <p className="text-ink-600 text-[11px] leading-relaxed">
                        Enforced at 25 agent runs/day per client to prevent runaway loops or budget exhaustion.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ASSISTANT: Demo Tools & Reset */}
            {mode === 'assistant' && activeTab === 'demo' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-serif font-bold text-sm text-ink-900">Evaluator & Demo Toolkit</h3>
                  <p className="text-xs text-ink-500">Live tools for testing real-time ingestion, triage, and state reset.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleSimulateInbound}
                    disabled={simulating}
                    className="p-4 rounded-2xl bg-[#F0FDFA] hover:bg-[#CCFBF1] border border-label-assistant/20 text-left transition cursor-pointer active:scale-98 disabled:opacity-50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <Sparkles className="h-4 w-4 text-label-assistant" />
                      <span className="text-[10px] font-mono font-bold text-label-assistant uppercase">Demo Action</span>
                    </div>
                    <p className="text-xs font-bold text-ink-900">Simulate Inbound Email</p>
                    <p className="text-[11px] text-ink-600 leading-snug">
                      Triggers a live incoming executive message and runs the agent collective triage immediately.
                    </p>
                  </button>

                  <button
                    onClick={handleResetDemo}
                    disabled={resetting}
                    className="p-4 rounded-2xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200 text-left transition cursor-pointer active:scale-98 disabled:opacity-50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <RotateCcw className="h-4 w-4 text-amber-700" />
                      <span className="text-[10px] font-mono font-bold text-amber-800 uppercase">State Reset</span>
                    </div>
                    <p className="text-xs font-bold text-ink-900">Restore Pristine Demo Data</p>
                    <p className="text-[11px] text-ink-600 leading-snug">
                      Restores all 60 threads, fresh unread counts, and sample agent runs to their initial state.
                    </p>
                  </button>
                </div>

                {/* Keyboard Shortcuts Cheatsheet */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Keyboard className="h-4 w-4 text-ink-700" />
                    <span className="text-xs font-bold text-ink-900">Keyboard Shortcuts Cheatsheet</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-black/5">
                      <span className="text-ink-600">Command Palette</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-ink-900 text-[10px]">⌘K / Ctrl+K</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-black/5">
                      <span className="text-ink-600">Navigate Threads</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-ink-900 text-[10px]">j / k</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-black/5">
                      <span className="text-ink-600">Archive Thread</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-ink-900 text-[10px]">e</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-black/5">
                      <span className="text-ink-600">Close Modals</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-ink-900 text-[10px]">Esc</kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. CLIENT: Executive Profile */}
            {mode === 'client' && activeTab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif font-bold text-sm text-ink-900">Executive Identity</h3>
                  <p className="text-xs text-ink-500">Your profile details as visible to your assistant Maya Lin.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Full Name</span>
                    <span className="font-bold text-ink-900">{user?.name || 'Priya Sharma'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Role & Title</span>
                    <span className="font-bold text-ink-900">Founder & CEO</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Organization</span>
                    <span className="font-bold text-ink-900">Vortex Dynamics</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Executive Email</span>
                    <span className="font-mono text-ink-900">{user?.email || 'priya@vortexdynamics.com'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. CLIENT: VIP Priorities (Live Add & Remove) */}
            {mode === 'client' && activeTab === 'priorities' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif font-bold text-sm text-ink-900">VIP Priority Senders &amp; Domains</h3>
                  <p className="text-xs text-ink-500 leading-relaxed mt-0.5">
                    Protected by a hard safety guardrail: emails from these senders or domains can never be auto-muted or filed into the Quiet Folder, and are prioritized straight to your Decision Desk. Synced live with Maya's Playbook.
                  </p>
                </div>

                {loadingPlaybook ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-10 rounded-xl bg-black/[0.04]" />
                    <div className="h-10 rounded-xl bg-black/[0.04]" />
                  </div>
                ) : (
                  <>
                    {/* VIP Email Senders */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                        VIP Email Addresses ({vipSenders.length})
                      </label>
                      <form onSubmit={handleAddVipEmail} className="flex gap-2">
                        <input
                          type="email"
                          value={newVipEmail}
                          onChange={(e) => setNewVipEmail(e.target.value)}
                          placeholder="Add VIP email (e.g. partner@sequoia.com)"
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-black/[0.12] text-xs font-mono text-ink-900 placeholder:font-sans placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/20 select-text"
                        />
                        <button
                          type="submit"
                          disabled={savingVips || !newVipEmail.trim()}
                          className="px-3.5 py-2 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                        >
                          Add
                        </button>
                      </form>

                      <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] space-y-1.5">
                        {vipSenders.length === 0 ? (
                          <p className="text-xs text-ink-400 text-center py-2">
                            No individual VIP email addresses yet.
                          </p>
                        ) : (
                          vipSenders.map((email) => (
                            <div
                              key={email}
                              className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-white transition border-b border-black/[0.04] last:border-0"
                            >
                              <span className="font-mono text-ink-800 truncate mr-2">{email}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  VIP Guardrail
                                </span>
                                <button
                                  type="button"
                                  disabled={savingVips}
                                  onClick={() => handleRemoveVipEmail(email)}
                                  className="p-1 rounded-full text-ink-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40"
                                  title={`Remove ${email}`}
                                  aria-label={`Remove ${email}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* VIP Domains */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                        VIP Organization Domains ({vipDomains.length})
                      </label>
                      <form onSubmit={handleAddVipDomain} className="flex gap-2">
                        <input
                          type="text"
                          value={newVipDomain}
                          onChange={(e) => setNewVipDomain(e.target.value)}
                          placeholder="Add VIP domain (e.g. upfront.com, fenwick.com)"
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-black/[0.12] text-xs font-mono text-ink-900 placeholder:font-sans placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/20 select-text"
                        />
                        <button
                          type="submit"
                          disabled={savingVips || !newVipDomain.trim()}
                          className="px-3.5 py-2 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                        >
                          Add
                        </button>
                      </form>

                      <div className="flex flex-wrap gap-1.5">
                        {vipDomains.length === 0 ? (
                          <span className="text-xs text-ink-400">No VIP domains configured.</span>
                        ) : (
                          vipDomains.map((domain) => (
                            <span
                              key={domain}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-black/[0.1] text-xs font-mono text-ink-800"
                            >
                              <span>@{domain}</span>
                              <button
                                type="button"
                                disabled={savingVips}
                                onClick={() => handleRemoveVipDomain(domain)}
                                className="text-ink-400 hover:text-rose-700 cursor-pointer disabled:opacity-40"
                                title={`Remove @${domain}`}
                                aria-label={`Remove @${domain}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 7. CLIENT: Security & Sign Out */}
            {mode === 'client' && activeTab === 'security' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif font-bold text-sm text-ink-900">Session & Security</h3>
                  <p className="text-xs text-ink-500">Manage your active authentication session.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Session Mode</span>
                    <span className="font-mono font-bold text-emerald-700">Client Executive Portal</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Storage</span>
                    <span className="font-mono text-ink-700">httpOnly Lax Secure Cookie</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                >
                  Sign Out of Decision Desk
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-black/[0.08] bg-[#FAF8F5] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
