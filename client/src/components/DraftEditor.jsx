import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import { Sparkles, Send, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function DraftEditor({
  thread,
  existingDraft,
  onDraftUpdated,
  onActionComplete,
  clientName = 'Client',
}) {
  const clientFirstName = (clientName || 'Client').split(' ')[0];
  const [subject, setSubject] = useState(existingDraft?.subject || `RE: ${thread.subject}`);
  const [bodyText, setBodyText] = useState(existingDraft?.bodyText || '');
  const [status, setStatus] = useState(existingDraft?.status || 'draft');
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // Lock body/background scroll while confirm send modal is open
  useBodyScrollLock(showConfirmSend);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && showConfirmSend) {
        setShowConfirmSend(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmSend]);

  useEffect(() => {
    setSubject(existingDraft?.subject || `RE: ${thread.subject}`);
    setBodyText(existingDraft?.bodyText || '');
    setStatus(existingDraft?.status || 'draft');
  }, [thread._id, thread.subject, existingDraft]);

  async function handleGenerateAIDraft(tone = 'direct') {
    setLoadingAI(true);
    try {
      const res = await api.post(`/ai/generate-draft/${thread._id}`, { tone });
      if (res.ok && res.data) {
        setBodyText(res.data.bodyText);
        setSubject(res.data.subject || `RE: ${thread.subject}`);
        const meta = res.data.aiMeta;
        if (meta?.byokError) {
          toast.warning(`API key fallback (${meta.byokError.code}): ${meta.byokError.message}`, {
            description: 'Used safe template draft instead. Check Settings → AI Provider & API Key.',
            duration: 6000,
          });
        } else if (meta?.provider && meta.provider !== 'template') {
          toast.success(`Generated ${tone} draft via ${meta.provider} (${meta.model})`);
        } else {
          toast.success(`Generated ${tone} AI response draft`);
        }
        onDraftUpdated?.(res.data);
      }
    } catch (err) {
      toast.error('Draft generation failed: ' + err.message);
    } finally {
      setLoadingAI(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const res = await api.post(`/threads/${thread._id}/draft`, {
        subject,
        bodyText,
        status: 'draft',
      });
      if (res.ok) {
        toast.success('Draft saved successfully');
        onDraftUpdated?.(res.data?.draft || res.data);
      }
    } catch (err) {
      toast.error('Failed to save draft: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestApproval() {
    if (!bodyText.trim()) {
      toast.error('Write a reply or click "AI Draft" before submitting for approval.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/threads/${thread._id}/draft`, {
        subject,
        bodyText,
        status: 'pending_client',
      });
      if (res.ok) {
        setStatus('pending_client');
        onDraftUpdated?.(res.data?.draft || res.data);
        if (onActionComplete) {
          onActionComplete({
            action: 'request_approval',
            thread: res.data?.thread || thread,
            draft: res.data?.draft || res.data,
            previousState: res.data?.previousState,
          });
        } else {
          toast.success(`Draft submitted! ${clientFirstName} will see this in their Decision Queue.`);
        }
      }
    } catch (err) {
      toast.error('Submission failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendNow() {
    if (!bodyText.trim()) {
      setShowConfirmSend(false);
      toast.error('Write a reply or click "AI Draft" before sending.');
      return;
    }
    setShowConfirmSend(false);
    setSaving(true);
    try {
      const res = await api.post(`/threads/${thread._id}/send`, {
        subject,
        bodyText,
      });
      if (res.ok) {
        setStatus('sent');
        onDraftUpdated?.(res.data?.draft);
        if (onActionComplete) {
          onActionComplete({
            action: 'send',
            thread: res.data?.thread || thread,
            draft: res.data?.draft,
            message: res.data?.message,
            simulated: Boolean(res.data?.simulated),
            previousState: res.data?.previousState,
          });
        } else {
          toast.success(
            res.data.simulated
              ? 'Simulated dispatch recorded in audit log (SEND_ENABLED=false)'
              : 'Email sent successfully!'
          );
        }
      }
    } catch (err) {
      toast.error('Send failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-black/[0.05] rounded-2xl p-3.5 sm:p-5 shadow-card space-y-4">
      {/* Draft Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-borderMuted/60">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-ink-900 tracking-tight">
            Reply Composer
          </span>
          {status === 'pending_client' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 font-medium">
              Awaiting {clientFirstName}'s Signoff
            </span>
          )}
          {status === 'approved' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Approved by {clientFirstName}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-ink-400 font-mono hidden sm:inline">Tone:</span>
          {[
            { id: 'direct', label: 'Direct', icon: '⚡' },
            { id: 'warm', label: 'Warm', icon: '🤝' },
            { id: 'formal', label: 'Formal', icon: '⚖️' },
            { id: 'decline', label: 'Decline', icon: '🚫' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleGenerateAIDraft(t.id)}
              disabled={loadingAI}
              className="px-2 py-1 rounded-lg bg-ink-50 hover:bg-ink-100 text-ink-700 text-[10px] font-medium transition cursor-pointer border border-black/5 disabled:opacity-50"
              title={`Draft in ${t.label} tone`}
            >
              <span>{t.icon}</span> <span className="ml-0.5">{t.label}</span>
            </button>
          ))}
          <button
            onClick={() => handleGenerateAIDraft('direct')}
            disabled={loadingAI}
            className="px-3 py-1.5 rounded-full bg-[#F0FDFA] hover:bg-[#CCFBF1] text-label-assistant border border-label-assistant/20 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 ml-1"
          >
            <Sparkles className={`h-3.5 w-3.5 ${loadingAI ? 'animate-spin' : ''}`} />
            <span>{loadingAI ? 'Drafting...' : 'AI Draft'}</span>
          </button>
        </div>
      </div>

      {/* Editor Inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-ink-500 mb-1 tracking-tight">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium text-ink-900"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-ink-500 mb-1 tracking-tight">
            Message Body
          </label>
          <textarea
            rows={5}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Compose your reply or generate a context-aware draft using AI..."
            className="w-full p-3.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 leading-relaxed font-sans text-ink-900 placeholder:text-ink-400"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="px-4 py-2 rounded-full border border-black/[0.08] hover:bg-ink-100 text-xs font-medium text-ink-700 transition cursor-pointer active:scale-95"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>

        <div className="flex items-center gap-2">
          {thread.currentLabel === 'CLIENT_TO_REPLY' || status === 'pending_client' ? (
            <button
              onClick={handleRequestApproval}
              disabled={saving}
              className="px-4 sm:px-5 py-2 rounded-full bg-label-client text-white text-xs font-semibold hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-soft active:scale-95"
            >
              <span>Submit for {clientFirstName}'s Approval</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmSend(true)}
              disabled={saving}
              className="px-5 py-2 rounded-full bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-soft active:scale-95"
            >
              <Send className="h-3 w-3" />
              <span>Approve & Send</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal (portaled onto body to prevent clipping) */}
      {showConfirmSend &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConfirmSend(false);
            }}
            onWheel={(e) => {
              if (e.target === e.currentTarget) e.preventDefault();
            }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-float border border-black/[0.06] space-y-4 overscroll-contain select-text"
            >
              <div className="flex items-center gap-2 text-ink-900">
                <ShieldCheck className="h-5 w-5 text-accent" />
                <h3 className="text-base font-serif font-bold">
                  Confirm Email Dispatch
                </h3>
              </div>

              <p className="text-xs text-ink-600 leading-relaxed">
                You are authorizing transmission to <strong>{thread.participants?.[0]?.email || 'recipient'}</strong>.
                <br />
                <span className="text-[11px] text-amber-800 block mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/70">
                  Safety gate active: Prototype simulates transmission, moves thread to Waiting on Others, and lets you Undo anytime.
                </span>
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowConfirmSend(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNow}
                  className="px-5 py-2 rounded-full bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition cursor-pointer shadow-soft active:scale-95"
                >
                  Confirm &amp; Send
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
