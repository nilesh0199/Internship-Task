import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Sparkles, Send, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function DraftEditor({ thread, existingDraft, onDraftUpdated }) {
  const [subject, setSubject] = useState(existingDraft?.subject || `RE: ${thread.subject}`);
  const [bodyText, setBodyText] = useState(existingDraft?.bodyText || '');
  const [status, setStatus] = useState(existingDraft?.status || 'draft');
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  useEffect(() => {
    if (existingDraft) {
      setSubject(existingDraft.subject);
      setBodyText(existingDraft.bodyText);
      setStatus(existingDraft.status);
    }
  }, [existingDraft]);

  async function handleGenerateAIDraft() {
    setLoadingAI(true);
    try {
      const res = await api.post(`/ai/generate-draft/${thread._id}`, {});
      if (res.ok && res.data) {
        setSubject(res.data.subject);
        setBodyText(res.data.bodyText);
        setStatus(res.data.status);
        onDraftUpdated?.(res.data);
        toast.success('AI draft generated referencing client tone profile');
      }
    } catch (err) {
      toast.error('Failed to generate draft: ' + err.message);
    } finally {
      setLoadingAI(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const res = await api.post('/drafts', {
        _id: existingDraft?._id,
        threadId: thread._id,
        subject,
        bodyText,
        bodyHtml: `<p>${bodyText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
        to: thread.participants?.[0]?.email ? [thread.participants[0].email] : ['recipient@example.com'],
        status,
      });
      if (res.ok) {
        toast.success('Draft saved');
        onDraftUpdated?.(res.data);
      }
    } catch (err) {
      toast.error('Failed to save draft: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestApproval() {
    setSaving(true);
    try {
      // First save content
      const draftRes = await api.post('/drafts', {
        _id: existingDraft?._id,
        threadId: thread._id,
        subject,
        bodyText,
        bodyHtml: `<p>${bodyText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
        to: thread.participants?.[0]?.email ? [thread.participants[0].email] : ['recipient@example.com'],
        status: 'pending_client',
      });

      if (draftRes.ok) {
        setStatus('pending_client');
        onDraftUpdated?.(draftRes.data);
        toast.success("Draft submitted to Priya's Decision Queue for 1-tap signoff!");
      }
    } catch (err) {
      toast.error('Failed to submit for approval: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendNow() {
    setShowConfirmSend(false);
    setSaving(true);
    try {
      const res = await api.post(`/drafts/${existingDraft?._id || 'new'}/send`, {
        threadId: thread._id,
        to: thread.participants?.[0]?.email ? [thread.participants[0].email] : ['recipient@example.com'],
        subject,
        bodyHtml: `<p>${bodyText}</p>`,
      });
      if (res.ok) {
        setStatus('sent');
        toast.success(
          res.isSimulated
            ? 'Email transmission simulated (SEND_ENABLED=false)'
            : 'Email dispatched successfully!'
        );
      }
    } catch (err) {
      toast.error('Send failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 rounded-xl border border-borderMuted bg-white space-y-4">
      {/* Draft Header */}
      <div className="flex items-center justify-between pb-2 border-b border-borderMuted">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-900">
            Assistant Reply Composer
          </span>
          {status === 'pending_client' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="h-2.5 w-2.5" />
              <span>Awaiting Priya's Approval</span>
            </span>
          )}
          {status === 'approved' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
              <span>Approved by Priya</span>
            </span>
          )}
          {status === 'sent' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              <span>Dispatched</span>
            </span>
          )}
        </div>

        <button
          onClick={handleGenerateAIDraft}
          disabled={loadingAI}
          className="text-xs font-medium text-accent hover:opacity-80 flex items-center gap-1 cursor-pointer transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{loadingAI ? 'Drafting...' : 'Generate AI Draft'}</span>
        </button>
      </div>

      {/* Editor Inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-ink-500 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-borderMuted rounded-lg"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-ink-500 mb-1">Message Body</label>
          <textarea
            rows={5}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Draft your reply here or click 'Generate AI Draft'..."
            className="w-full p-3 text-xs bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg border border-borderMuted text-xs font-medium text-ink-700 hover:bg-ink-100 transition cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>

        <div className="flex items-center gap-2">
          {thread.currentLabel === 'CLIENT_TO_REPLY' || status === 'pending_client' ? (
            <button
              onClick={handleRequestApproval}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-label-client text-white text-xs font-semibold hover:opacity-95 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Submit for Priya's Approval</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmSend(true)}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="h-3 w-3" />
              <span>Approve & Send</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmSend && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-borderMuted space-y-4">
            <h3 className="text-sm font-serif font-bold text-ink-900">
              Confirm Email Dispatch
            </h3>
            <p className="text-xs text-ink-600 leading-normal">
              You are authorizing dispatch to <strong>{thread.participants?.[0]?.email || 'recipient'}</strong>.
              <br />
              <span className="text-[11px] text-amber-700 block mt-2 p-2 rounded bg-amber-50 border border-amber-200">
                Safety gate active: Prototype simulates transmission and writes to Activity Log.
              </span>
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmSend(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNow}
                className="px-4 py-1.5 rounded-lg bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
