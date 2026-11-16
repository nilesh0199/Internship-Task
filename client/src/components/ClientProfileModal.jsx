import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import Avatar from './Avatar.jsx';
import {
  X,
  User,
  Mail,
  Building,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Send,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export function ClientProfileModal({ isOpen, onClose, onClientUpdated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [clientData, setClientData] = useState({
    name: 'Priya Sharma',
    email: 'priya@vortexdynamics.com',
    title: 'Founder & CEO',
    company: 'Vortex Dynamics',
  });
  const [inviteStatus, setInviteStatus] = useState('not_invited');
  const [expiresAt, setExpiresAt] = useState(null);
  const [lastLoginAt, setLastLoginAt] = useState(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClientProfile();
    }
  }, [isOpen]);

  async function loadClientProfile() {
    setLoading(true);
    try {
      const res = await api.get('/auth/client-profile');
      if (res.ok && res.data) {
        if (res.data.client) {
          setClientData({
            name: res.data.client.name || 'Priya Sharma',
            email: res.data.client.email || 'priya@vortexdynamics.com',
            title: res.data.client.title || 'Founder & CEO',
            company: res.data.client.company || 'Vortex Dynamics',
          });
        }
        setInviteStatus(res.data.inviteStatus || 'not_invited');
        setExpiresAt(res.data.expiresAt || null);
        setLastLoginAt(res.data.lastLoginAt || null);
      }
    } catch {
      // Default to demo data
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/client-profile', clientData);
      if (res.ok) {
        toast.success('Client profile updated');
        onClientUpdated?.(res.data.client);
      }
    } catch (err) {
      toast.error('Failed to update profile: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleInviteClient() {
    setInviting(true);
    setCopied(false);
    try {
      const res = await api.post('/auth/invite-client', clientData);
      if (res.ok && res.data) {
        setGeneratedInviteUrl(res.data.inviteUrl);
        setInviteStatus('pending');
        setExpiresAt(res.data.expiresAt);
        toast.success('Single-use client invitation generated');
        onClientUpdated?.(res.data.client);
      }
    } catch (err) {
      toast.error('Failed to generate invite: ' + (err.message || 'Unknown error'));
    } finally {
      setInviting(false);
    }
  }

  async function handleResendInvite() {
    setInviting(true);
    setCopied(false);
    try {
      const res = await api.post('/auth/resend-invite', clientData);
      if (res.ok && res.data) {
        setGeneratedInviteUrl(res.data.inviteUrl);
        setInviteStatus('pending');
        setExpiresAt(res.data.expiresAt);
        toast.info('New invitation link generated (prior link invalidated)');
      }
    } catch (err) {
      toast.error('Failed to resend invite: ' + (err.message || 'Unknown error'));
    } finally {
      setInviting(false);
    }
  }

  async function handleRevokeInvite() {
    try {
      await api.post('/auth/revoke-invite', {});
      setInviteStatus('revoked');
      setGeneratedInviteUrl(null);
      toast.info('Client invitation revoked');
    } catch (err) {
      toast.error('Failed to revoke invite: ' + (err.message || 'Unknown error'));
    }
  }

  function handleCopyLink() {
    if (!generatedInviteUrl) return;
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopied(true);
    toast.success('Invitation link copied to clipboard');
    setTimeout(() => setCopied(false), 3000);
  }

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full shadow-float border border-black/[0.08] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto overscroll-contain select-text font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-borderMuted/60">
          <div className="flex items-center gap-3">
            <Avatar name={clientData.name} email={clientData.email} size="md" />
            <div>
              <h3 className="text-lg font-serif font-bold text-ink-900 leading-tight">
                Client Profile & Access
              </h3>
              <p className="text-xs text-ink-500 font-medium">
                Executive client profile and secure invitation link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-400 hover:text-ink-900 rounded-full hover:bg-ink-100 transition cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Invite Status Strip */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-black/[0.05] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-400">
              Account Status
            </span>
            {inviteStatus === 'active' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Active Account</span>
              </span>
            )}
            {inviteStatus === 'pending' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span>Invite Pending</span>
              </span>
            )}
            {inviteStatus === 'not_invited' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-ink-100 text-ink-600 border border-borderMuted">
                <span>Not Invited</span>
              </span>
            )}
            {inviteStatus === 'revoked' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                <span>Revoked</span>
              </span>
            )}
            {inviteStatus === 'expired' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                <span>Expired</span>
              </span>
            )}
          </div>

          <div className="text-xs text-ink-600">
            {inviteStatus === 'active' && (
              <p>
                {clientData.name} has signed in.{' '}
                {lastLoginAt ? `Last active: ${new Date(lastLoginAt).toLocaleDateString()}` : ''}
              </p>
            )}
            {inviteStatus === 'pending' && (
              <p>
                Invitation pending.{' '}
                {expiresAt
                  ? `Expires: ${new Date(expiresAt).toLocaleDateString()}`
                  : 'Valid for 7 days.'}
              </p>
            )}
            {inviteStatus === 'not_invited' && (
              <p>
                No active invitation for this executive. Generate an invitation link below so Priya can access her Decision Queue.
              </p>
            )}
          </div>

          {/* Action Buttons for Invite */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {inviteStatus === 'not_invited' && (
              <button
                type="button"
                onClick={handleInviteClient}
                disabled={inviting}
                className="px-3.5 py-1.5 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft transition cursor-pointer flex items-center gap-1.5"
              >
                {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Invite Client</span>
              </button>
            )}

            {inviteStatus === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={handleResendInvite}
                  disabled={inviting}
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-ink-50 border border-borderMuted text-ink-700 text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Regenerate Link</span>
                </button>
                <button
                  type="button"
                  onClick={handleRevokeInvite}
                  className="px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition cursor-pointer"
                >
                  Revoke
                </button>
              </>
            )}

            {inviteStatus === 'active' && (
              <button
                type="button"
                onClick={handleResendInvite}
                disabled={inviting}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-ink-50 border border-borderMuted text-ink-700 text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Send Password Reset Invite
              </button>
            )}
          </div>
        </div>

        {/* Generated Invite Link Box */}
        {generatedInviteUrl && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif font-bold text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>Single-Use Client Invitation Link</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-800 font-semibold">
                Expires in 7 days
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              When email sending is in simulated mode (SEND_ENABLED=false), copy this secure link and share it directly with Priya:
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={generatedInviteUrl}
                className="flex-1 bg-white px-3 py-2 rounded-xl border border-emerald-300 text-xs font-mono text-ink-800 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Editable Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-serif font-bold text-ink-900 block">
              Profile Information
            </span>
            <p className="text-[11px] text-ink-500">
              These details customize the executive decision queue and AI voice.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-ink-700">
                Client Name
              </label>
              <input
                type="text"
                required
                value={clientData.name}
                onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-borderMuted text-xs bg-white text-ink-900 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-ink-700">
                Client Email
              </label>
              <input
                type="email"
                required
                value={clientData.email}
                onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-borderMuted text-xs bg-white text-ink-900 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-ink-700">
                Title / Role
              </label>
              <input
                type="text"
                value={clientData.title}
                onChange={(e) => setClientData({ ...clientData, title: e.target.value })}
                placeholder="e.g. Founder & CEO"
                className="w-full px-3 py-2 rounded-xl border border-borderMuted text-xs bg-white text-ink-900 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-ink-700">
                Company Name
              </label>
              <input
                type="text"
                value={clientData.company}
                onChange={(e) => setClientData({ ...clientData, company: e.target.value })}
                placeholder="e.g. Vortex Dynamics"
                className="w-full px-3 py-2 rounded-xl border border-borderMuted text-xs bg-white text-ink-900 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-borderMuted/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-borderMuted text-xs font-semibold text-ink-600 hover:bg-ink-50 transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft transition active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
