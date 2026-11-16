import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import { X, Plus, Trash2, ShieldCheck, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PlaybookModal({ isOpen, onClose, onPlaybookUpdated, clientId, clientName = 'Client' }) {
  const [playbook, setPlaybook] = useState({
    vipSenders: [],
    vipDomains: [],
    topicRules: [],
    financialThresholds: { maxAssistantApprovalUsd: 1000 },
    customInstructions: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lock body/background scroll while playbook modal is open
  useBodyScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      loadPlaybook();
    }
  }, [isOpen, clientId]);

  async function loadPlaybook() {
    setLoading(true);
    try {
      const qParam = clientId ? `?clientId=${clientId}` : '';
      const res = await api.get(`/playbook${qParam}`);
      if (res.ok && res.data) {
        setPlaybook({
          vipSenders: res.data.vipSenders || [],
          vipDomains: res.data.vipDomains || [],
          topicRules: res.data.topicRules || [],
          financialThresholds: res.data.financialThresholds || { maxAssistantApprovalUsd: 1000 },
          customInstructions: res.data.customInstructions || '',
        });
      }
    } catch (err) {
      toast.error('Failed to load playbook: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const qParam = clientId ? `?clientId=${clientId}` : '';
      const res = await api.put(`/playbook${qParam}`, playbook);
      if (res.ok) {
        toast.success(`${clientName}'s Delegation Playbook saved and active in AI prompt`);
        onPlaybookUpdated?.(res.data);
        onClose();
      }
    } catch (err) {
      toast.error('Failed to save playbook: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function addTopicRule() {
    setPlaybook((prev) => ({
      ...prev,
      topicRules: [
        ...prev.topicRules,
        {
          topic: 'New Delegation Topic',
          disposition: 'ALWAYS_CLIENT',
          description: '',
        },
      ],
    }));
  }

  function removeTopicRule(index) {
    setPlaybook((prev) => ({
      ...prev,
      topicRules: prev.topicRules.filter((_, i) => i !== index),
    }));
  }

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-float border border-black/[0.06] max-h-[85vh] flex flex-col overscroll-contain select-text"
      >
        {/* Header */}
        <div className="p-6 border-b border-borderMuted/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-ink-900 leading-tight">
                Priya's Delegation Playbook
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Injected into every AI prompt & enforced by hard code guardrails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-400 hover:text-ink-900 rounded-full hover:bg-ink-100 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-xs text-ink-900">
          {loading ? (
            <div className="py-16 text-center text-xs text-ink-500 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span>Loading executive playbook...</span>
            </div>
          ) : (
            <>
              {/* VIP Senders */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase tracking-wider text-ink-500 text-[10px]">
                  VIP Senders (Immune to No-Reply Muting)
                </label>
                <input
                  type="text"
                  value={playbook.vipSenders.join(', ')}
                  onChange={(e) =>
                    setPlaybook({
                      ...playbook,
                      vipSenders: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                  placeholder="mark.suster@upfront.com, anjali.sharma@gmail.com"
                />
              </div>

              {/* VIP Domains */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase tracking-wider text-ink-500 text-[10px]">
                  VIP Organization Domains
                </label>
                <input
                  type="text"
                  value={playbook.vipDomains.join(', ')}
                  onChange={(e) =>
                    setPlaybook({
                      ...playbook,
                      vipDomains: e.target.value.split(',').map((d) => d.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                  placeholder="upfront.com, fenwick.com, sequoia.com"
                />
              </div>

              {/* Financial Limit */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase tracking-wider text-ink-500 text-[10px]">
                  Assistant Autonomous Spend Limit ($ USD)
                </label>
                <input
                  type="number"
                  value={playbook.financialThresholds.maxAssistantApprovalUsd}
                  onChange={(e) =>
                    setPlaybook({
                      ...playbook,
                      financialThresholds: {
                        maxAssistantApprovalUsd: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-40 px-3.5 py-2 bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                />
              </div>

              {/* Topic Rules */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold uppercase tracking-wider text-ink-500 text-[10px]">
                    Topic Delegation Directives ({playbook.topicRules.length})
                  </label>
                  <button
                    onClick={addTopicRule}
                    className="text-xs text-accent font-semibold flex items-center gap-1 hover:opacity-85 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Topic Rule</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {playbook.topicRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-black/[0.05] bg-[#FAF8F5]/80 flex items-center gap-3 shadow-2xs"
                    >
                      <input
                        type="text"
                        value={rule.topic}
                        onChange={(e) => {
                          const updated = [...playbook.topicRules];
                          updated[idx].topic = e.target.value;
                          setPlaybook({ ...playbook, topicRules: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-borderMuted rounded-xl text-xs font-medium"
                      />

                      <select
                        value={rule.disposition}
                        onChange={(e) => {
                          const updated = [...playbook.topicRules];
                          updated[idx].disposition = e.target.value;
                          setPlaybook({ ...playbook, topicRules: updated });
                        }}
                        className="px-3 py-1.5 bg-white border border-borderMuted rounded-xl font-medium text-xs text-ink-800"
                      >
                        <option value="ALWAYS_CLIENT">Always Client</option>
                        <option value="ASSISTANT_CAN_HANDLE">Assistant Can Handle</option>
                        <option value="NEVER_BOTHER_CLIENT">Never Bother Client</option>
                      </select>

                      <button
                        onClick={() => removeTopicRule(idx)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition cursor-pointer"
                        title="Remove rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase tracking-wider text-ink-500 text-[10px]">
                  Custom Executive Directives & Nuances
                </label>
                <textarea
                  rows={3}
                  value={playbook.customInstructions}
                  onChange={(e) =>
                    setPlaybook({ ...playbook, customInstructions: e.target.value })
                  }
                  className="w-full p-3.5 bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 leading-relaxed font-sans"
                  placeholder="e.g. 'Priya prefers dinners on Thursdays only. Never commit to morning meetings before 10 AM.'"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-5 border-t border-borderMuted/60 bg-ink-50/50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-full bg-ink-900 text-white font-semibold text-xs hover:bg-ink-800 transition flex items-center gap-1.5 cursor-pointer shadow-soft active:scale-95 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Saving...' : 'Save Playbook'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
