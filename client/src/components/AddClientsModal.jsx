import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import Avatar from './Avatar.jsx';
import {
  X,
  UserPlus,
  Users,
  Mail,
  Building,
  Briefcase,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Send,
  ShieldCheck,
  Loader2,
  ArrowRight,
  ExternalLink,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';

function formatExpiry(expiresAt) {
  if (!expiresAt) return '';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Expires in ${days}d ${hours}h`;
  return `Expires in ${Math.max(1, hours)}h`;
}

export function AddClientsModal({
  isOpen,
  onClose,
  initialTab = 'add',
  initialFilter = 'all',
  onClientsChanged,
}) {
  const navigate = useNavigate();
  useBodyScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState(initialTab); // 'add' | 'roster'
  const [rosterFilter, setRosterFilter] = useState(initialFilter); // 'all' | 'pending' | 'active'
  const [clients, setClients] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // New client form
  const [form, setForm] = useState({
    name: '',
    email: '',
    title: '',
    company: '',
    maxAssistantApprovalUsd: '1000',
    sendInvite: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [createdResult, setCreatedResult] = useState(null); // { client, inviteUrl, expiresAt, inviteStatus }
  const [copiedId, setCopiedId] = useState(null);

  // Per-client roster invite actions
  const [busyClientId, setBusyClientId] = useState(null);
  const [rowInviteUrls, setRowInviteUrls] = useState({}); // clientId -> inviteUrl

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setRosterFilter(initialFilter);
      setFormError(null);
      loadRoster();
    }
  }, [isOpen, initialTab, initialFilter]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  async function loadRoster() {
    setLoadingRoster(true);
    try {
      const res = await api.get('/auth/clients');
      if (res.ok && Array.isArray(res.data?.clients)) {
        setClients(res.data.clients);
      }
    } catch {
      // keep existing
    } finally {
      setLoadingRoster(false);
    }
  }

  const pendingClients = useMemo(
    () => clients.filter((c) => c.inviteStatus === 'pending' || c.inviteStatus === 'expired'),
    [clients]
  );

  const activeClients = useMemo(
    () => clients.filter((c) => c.inviteStatus === 'active'),
    [clients]
  );

  const filteredClients = useMemo(() => {
    if (rosterFilter === 'pending') return pendingClients;
    if (rosterFilter === 'active') return activeClients;
    return clients;
  }, [clients, pendingClients, activeClients, rosterFilter]);

  async function handleCreateClient(e) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError('Please enter the executive’s full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Please enter a valid work email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/clients', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        title: form.title.trim() || 'Executive',
        company: form.company.trim() || 'Independent',
        maxAssistantApprovalUsd: Number(form.maxAssistantApprovalUsd) || 1000,
        sendInvite: form.sendInvite,
      });

      if (res.ok && res.data) {
        setCreatedResult(res.data);
        setForm({
          name: '',
          email: '',
          title: '',
          company: '',
          maxAssistantApprovalUsd: '1000',
          sendInvite: true,
        });
        toast.success(res.message || 'Executive client added!');
        await loadRoster();
        onClientsChanged?.();
      }
    } catch (err) {
      setFormError(err.message || 'Could not add client. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateOrResendInvite(client) {
    setBusyClientId(client._id);
    try {
      const endpoint = client.inviteStatus === 'pending' ? '/auth/resend-invite' : '/auth/invite-client';
      const res = await api.post(endpoint, {
        clientId: client._id,
        name: client.name,
        email: client.email,
        company: client.company,
        title: client.title,
      });
      if (res.ok && res.data?.inviteUrl) {
        setRowInviteUrls((prev) => ({ ...prev, [client._id]: res.data.inviteUrl }));
        toast.success(
          client.inviteStatus === 'pending'
            ? `Fresh invite link created for ${client.name} (old link invalidated)`
            : `Single-use invite link generated for ${client.name}`
        );
        await loadRoster();
        onClientsChanged?.();
      }
    } catch (err) {
      toast.error('Invite failed: ' + (err.message || 'Unknown error'));
    } finally {
      setBusyClientId(null);
    }
  }

  async function handleRevokeClientInvite(client) {
    setBusyClientId(client._id);
    try {
      const res = await api.post('/auth/revoke-invite', { clientId: client._id });
      if (res.ok) {
        setRowInviteUrls((prev) => {
          const next = { ...prev };
          delete next[client._id];
          return next;
        });
        toast.info(`Revoked pending invite for ${client.name}`);
        await loadRoster();
        onClientsChanged?.();
      }
    } catch (err) {
      toast.error('Revoke failed: ' + (err.message || 'Unknown error'));
    } finally {
      setBusyClientId(null);
    }
  }

  function handleCopy(url, idKey) {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(idKey);
    toast.success('Single-use invite link copied');
    setTimeout(() => setCopiedId(null), 2500);
  }

  function handleOpenClientWorkspace(clientId) {
    onClose();
    navigate(`/assistant/c/${clientId}/inbox`);
  }

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-ink-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-black/10 shadow-2xl overflow-hidden flex flex-col max-h-[86vh] select-text"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.08] bg-[#FAF8F5] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-ink-900 text-white">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-ink-900 leading-tight">
                Executive Clients &amp; Invitations
              </h2>
              <p className="text-[11px] text-ink-500">
                Onboard new executives, generate single-use invite links, and monitor pending access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-ink-500 hover:text-ink-900 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Top Switcher Tabs */}
        <div className="px-6 pt-3 pb-2.5 border-b border-black/[0.06] bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('add');
              setFormError(null);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'add'
                ? 'bg-ink-900 text-white shadow-soft'
                : 'bg-[#FAF8F5] text-ink-700 hover:bg-ink-100'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add New Client</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-ink-900 text-white shadow-soft'
                : 'bg-[#FAF8F5] text-ink-700 hover:bg-ink-100'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Clients &amp; Pending Invites</span>
            {pendingClients.length > 0 && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'roster'
                    ? 'bg-amber-400 text-ink-900'
                    : 'bg-amber-100 text-amber-900 border border-amber-300/60'
                }`}
              >
                {pendingClients.length} pending
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'add' ? (
            <div className="space-y-5">
              {/* Created Client Success Card with Invite Link */}
              {createdResult && (
                <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 space-y-3 animate-in fade-in">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        {createdResult.client.name} added to your executive roster!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreatedResult(null)}
                      className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {createdResult.inviteUrl && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-emerald-900">
                        <span className="font-semibold">Single-use invitation link (7-day expiry):</span>
                        <span className="font-mono text-[10px]">SHA-256 hashed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={createdResult.inviteUrl}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-[11px] font-mono text-ink-800 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy(createdResult.inviteUrl, 'created')}
                          className="px-3 py-1.5 rounded-xl bg-ink-900 text-white text-xs font-semibold flex items-center gap-1 hover:bg-ink-800 transition cursor-pointer"
                        >
                          {copiedId === 'created' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedId === 'created' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenClientWorkspace(createdResult.client._id)}
                      className="px-3.5 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-ink-800 transition cursor-pointer"
                    >
                      <span>Open {createdResult.client.name.split(' ')[0]}'s Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    {createdResult.inviteUrl && (
                      <a
                        href={createdResult.inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-full bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1 hover:bg-emerald-100/60 transition"
                      >
                        <span>Preview Invite Page</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* New Client Form */}
              <form onSubmit={handleCreateClient} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                      Executive Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Ananya Rao"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-black/[0.12] text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                      Work Email *
                    </label>
                    <div className="relative">
                      <Mail className="h-3.5 w-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="ananya@meridianlabs.io"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-black/[0.12] text-xs font-mono text-ink-900 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                      Role / Title
                    </label>
                    <div className="relative">
                      <Briefcase className="h-3.5 w-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Founder & CEO"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-black/[0.12] text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                      Company / Organization
                    </label>
                    <div className="relative">
                      <Building className="h-3.5 w-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        placeholder="Meridian Labs"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-black/[0.12] text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                      Initial Assistant Spend Limit (USD)
                    </label>
                    <div className="relative w-44">
                      <DollarSign className="h-3.5 w-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={form.maxAssistantApprovalUsd}
                        onChange={(e) => setForm({ ...form, maxAssistantApprovalUsd: e.target.value })}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-black/[0.12] text-xs font-mono text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium text-ink-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.sendInvite}
                      onChange={(e) => setForm({ ...form, sendInvite: e.target.checked })}
                      className="h-3.5 w-3.5 rounded accent-ink-900 cursor-pointer"
                    />
                    <span>Generate single-use client invite link</span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <span className="text-[11px] text-ink-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                    <span>Isolated workspace, playbook &amp; agent memory created automatically.</span>
                  </span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-2 shadow-soft transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                    <span>{submitting ? 'Creating...' : form.sendInvite ? 'Add Client & Create Invite' : 'Add Client'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* TAB 2: CLIENTS & PENDING INVITES ROSTER */
            <div className="space-y-4">
              {/* Filter Pills */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'all', label: `All Clients (${clients.length})` },
                    { id: 'pending', label: `Pending Invites (${pendingClients.length})` },
                    { id: 'active', label: `Active (${activeClients.length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setRosterFilter(f.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                        rosterFilter === f.id
                          ? 'bg-ink-900 text-white'
                          : 'bg-[#FAF8F5] text-ink-600 hover:text-ink-900 hover:bg-ink-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add another client</span>
                </button>
              </div>

              {/* Roster List */}
              {loadingRoster ? (
                <div className="space-y-2.5 animate-pulse">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-20 rounded-2xl bg-black/[0.04]" />
                  ))}
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#FAF8F5] border border-black/[0.06] text-center space-y-2">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold text-ink-900">
                    {rosterFilter === 'pending'
                      ? 'No pending client invitations.'
                      : 'No clients match this filter.'}
                  </p>
                  <p className="text-[11px] text-ink-500">
                    {rosterFilter === 'pending'
                      ? 'All invited executives have accepted their workspaces.'
                      : 'Use "Add New Client" to onboard an executive.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClients.map((c) => {
                    const isBusy = busyClientId === c._id;
                    const generatedUrl = rowInviteUrls[c._id];
                    return (
                      <div
                        key={c._id}
                        className="p-4 rounded-2xl bg-[#FAF8F5]/80 border border-black/[0.08] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={c.name} email={c.email} size="md" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-ink-900">{c.name}</span>
                                {c.inviteStatus === 'active' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    <span>Active</span>
                                  </span>
                                ) : c.inviteStatus === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300/80">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>Pending Invite · {formatExpiry(c.expiresAt)}</span>
                                  </span>
                                ) : c.inviteStatus === 'expired' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                                    <AlertCircle className="h-2.5 w-2.5" />
                                    <span>Invite Expired</span>
                                  </span>
                                ) : c.inviteStatus === 'revoked' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
                                    <span>Revoked</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-black/10 text-ink-600">
                                    <span>Not Invited</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-ink-500 truncate mt-0.5">
                                {c.title} · {c.company} · <span className="font-mono">{c.email}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenClientWorkspace(c._id)}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-ink-900 hover:text-white border border-black/[0.1] text-[11px] font-semibold text-ink-800 transition cursor-pointer flex items-center gap-1"
                            >
                              <span>Workspace</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>

                            {c.inviteStatus === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleGenerateOrResendInvite(c)}
                                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300/80 text-[11px] font-semibold text-amber-950 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                  title="Generate a fresh single-use link and invalidate the previous one"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>New Link</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRevokeClientInvite(c)}
                                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                  title="Revoke pending invitation"
                                >
                                  <Ban className="h-3 w-3" />
                                  <span>Revoke</span>
                                </button>
                              </>
                            )}

                            {(c.inviteStatus === 'not_invited' ||
                              c.inviteStatus === 'revoked' ||
                              c.inviteStatus === 'expired') && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleGenerateOrResendInvite(c)}
                                className="px-3 py-1.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                <Send className="h-3 w-3" />
                                <span>Send Invite</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline copyable freshly-generated link */}
                        {generatedUrl && (
                          <div className="pt-2 border-t border-black/[0.06] flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={generatedUrl}
                              className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-black/[0.1] text-[11px] font-mono text-ink-800 select-all"
                            />
                            <button
                              type="button"
                              onClick={() => handleCopy(generatedUrl, c._id)}
                              className="px-3 py-1.5 rounded-xl bg-ink-900 text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-ink-800 transition cursor-pointer"
                            >
                              {copiedId === c._id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedId === c._id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-black/[0.08] bg-[#FAF8F5] flex items-center justify-between text-[11px] text-ink-500">
          <span>
            {clients.length} executive{clients.length === 1 ? '' : 's'} · {pendingClients.length} pending invite{pendingClients.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
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
