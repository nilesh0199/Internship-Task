import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import {
  X,
  Send,
  PenSquare,
  Save,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const QUICK_STARTERS = [
  {
    id: 'checkin',
    label: 'Quick Check-in',
    subject: 'Quick update & next steps',
    body: 'Hi,\n\nWanted to share a quick update and align on next steps for this week. Let me know if anything needs adjustment on your side.\n\nBest,',
  },
  {
    id: 'schedule',
    label: 'Schedule Call',
    subject: 'Finding 20 minutes to connect this week',
    body: 'Hi,\n\nWould love to find 20 minutes to connect this week. Are you available Tuesday afternoon or Thursday morning? Happy to work around your calendar.\n\nBest,',
  },
  {
    id: 'followup',
    label: 'Follow-up',
    subject: 'Following up on our last conversation',
    body: 'Hi,\n\nFloating this back to the top of your inbox in case it got buried. Let me know how you would like to proceed.\n\nBest,',
  },
];

/**
 * Reusable Compose New Email Modal for both Assistant and Executive Client views.
 * Portaled onto document.body to prevent backdrop-blur clipping across headers/drawers.
 */
export function ComposeEmailModal({
  isOpen,
  onClose,
  mode = 'assistant', // 'assistant' | 'client'
  clientId = null,
  clientName = '',
  clientEmail = '',
  onComposed,
}) {
  const { user } = useAuth();
  useBodyScrollLock(isOpen);

  const [to, setTo] = useState('');
  const [toName, setToName] = useState('');
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [submittingMode, setSubmittingMode] = useState(null); // 'send' | 'draft' | 'request_approval' | null
  const [error, setError] = useState(null);

  const isClientRole = mode === 'client' || user?.role === 'client';
  const execFirstName = (clientName || user?.name || 'Executive').split(' ')[0];
  const signoffName = isClientRole ? user?.name || execFirstName : clientName || user?.name || 'Maya Lin';

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !submittingMode) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submittingMode, onClose]);

  if (!isOpen) return null;

  function applyStarter(starter) {
    if (!subject.trim()) {
      setSubject(starter.subject);
    }
    setBodyText(`${starter.body}\n${signoffName}`);
  }

  function resetForm() {
    setTo('');
    setToName('');
    setCc('');
    setShowCc(false);
    setSubject('');
    setBodyText('');
    setError(null);
  }

  async function handleSubmit(dispatchMode) {
    setError(null);

    const cleanTo = to.trim();
    if (!cleanTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTo)) {
      setError('Please enter a valid recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter an email subject.');
      return;
    }
    if (!bodyText.trim()) {
      setError('Please write a message before continuing.');
      return;
    }

    setSubmittingMode(dispatchMode);
    try {
      const res = await api.post('/threads/compose', {
        to: cleanTo,
        toName: toName.trim(),
        cc: cc.trim(),
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        ...(clientId && !isClientRole ? { clientId } : {}),
        mode: dispatchMode,
      });

      if (res.ok && res.data) {
        if (dispatchMode === 'request_approval') {
          toast.success(`Submitted to ${execFirstName}'s Decision Desk for approval.`);
        } else if (dispatchMode === 'draft') {
          toast.success('New email saved to drafts.');
        } else if (res.data.simulated) {
          toast.success(`Email recorded for ${cleanTo} (simulated send · SEND_ENABLED=false)`);
        } else {
          toast.success(`Email sent to ${cleanTo}!`);
        }

        const createdThread = res.data.thread;
        resetForm();
        onComposed?.(createdThread, dispatchMode);
        onClose();
      } else {
        setError(res.error?.message || 'Could not compose email.');
      }
    } catch (err) {
      setError(err.message || 'Could not compose email.');
    } finally {
      setSubmittingMode(null);
    }
  }

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !submittingMode) onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overscroll-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92dvh] flex flex-col shadow-2xl border border-black/[0.08] overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#FAF8F5] border-b border-black/[0.06] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-ink-900 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <PenSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif font-bold text-base text-ink-900 tracking-tight truncate">
                Compose New Email
              </h2>
              <p className="text-[11px] text-ink-500 truncate">
                {isClientRole
                  ? `From: ${user?.name || 'Executive'} <${user?.email || ''}>`
                  : `Sending on behalf of ${clientName || 'Executive'}${clientEmail ? ` (${clientEmail})` : ''}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => !submittingMode && onClose()}
            className="p-2 rounded-full text-ink-500 hover:text-ink-900 hover:bg-black/[0.05] transition cursor-pointer flex-shrink-0"
            aria-label="Close compose email"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto app-pane-scroll p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Recipient Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-ink-700">
                  To <span className="text-red-500">*</span>
                </label>
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                  >
                    + Add Cc
                  </button>
                )}
              </div>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@company.com"
                autoFocus
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF8F5] border border-black/[0.08] focus:bg-white focus:border-accent outline-none font-sans text-ink-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink-700 block">
                Recipient Name <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF8F5] border border-black/[0.08] focus:bg-white focus:border-accent outline-none font-sans text-ink-900"
              />
            </div>
          </div>

          {/* Optional Cc Row */}
          {showCc && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-ink-700">Cc</label>
                <button
                  type="button"
                  onClick={() => {
                    setCc('');
                    setShowCc(false);
                  }}
                  className="text-[11px] text-ink-400 hover:text-ink-700 cursor-pointer"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Separate multiple emails with commas"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF8F5] border border-black/[0.08] focus:bg-white focus:border-accent outline-none font-sans text-ink-900"
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink-700 block">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Write a clear subject line..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF8F5] border border-black/[0.08] focus:bg-white focus:border-accent outline-none font-medium text-ink-900"
            />
          </div>

          {/* Quick Starters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-ink-400 mr-1">
              <Sparkles className="h-3 w-3 text-accent" />
              <span>Quick start:</span>
            </span>
            {QUICK_STARTERS.map((starter) => (
              <button
                key={starter.id}
                type="button"
                onClick={() => applyStarter(starter)}
                className="px-2.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-ink-100 border border-black/[0.07] text-[11px] font-medium text-ink-700 transition cursor-pointer"
              >
                {starter.label}
              </button>
            ))}
          </div>

          {/* Message Body */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink-700 block">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={7}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Write your email here..."
              className="w-full p-3.5 text-xs rounded-2xl bg-[#FAF8F5] border border-black/[0.08] focus:bg-white focus:border-accent outline-none leading-relaxed font-sans text-ink-900 placeholder:text-ink-400 resize-y min-h-[140px]"
            />
          </div>

          {/* Safety Gate Notice */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-2 text-[11px] text-amber-900">
            <ShieldCheck className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Human-authorized dispatch:</strong> Outbound messages are logged in the Activity Log and obey the workspace <code className="font-mono text-[10px] bg-white/80 px-1 rounded">SEND_ENABLED</code> safety gate.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#FAF8F5] border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <button
            type="button"
            disabled={!!submittingMode}
            onClick={() => handleSubmit('draft')}
            className="px-3.5 py-2 rounded-full border border-black/[0.1] bg-white hover:bg-ink-50 text-xs font-semibold text-ink-700 flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {submittingMode === 'draft' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save Draft</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {!isClientRole && (
              <button
                type="button"
                disabled={!!submittingMode}
                onClick={() => handleSubmit('request_approval')}
                className="px-3.5 py-2 rounded-full bg-[#FDF2E9] hover:bg-amber-100/80 border border-amber-300/80 text-accent text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {submittingMode === 'request_approval' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                <span>Ask {execFirstName} to Approve</span>
              </button>
            )}

            <button
              type="button"
              disabled={!!submittingMode}
              onClick={() => handleSubmit('send')}
              className="px-5 py-2 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-soft transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {submittingMode === 'send' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{submittingMode === 'send' ? 'Sending...' : 'Send Email'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
