import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { X, Plus, Trash2, ShieldCheck, Save } from 'lucide-react';
import { toast } from 'sonner';

export function PlaybookModal({ isOpen, onClose, onPlaybookUpdated }) {
  const [playbook, setPlaybook] = useState({
    vipSenders: [],
    vipDomains: [],
    topicRules: [],
    financialThresholds: { maxAssistantApprovalUsd: 1000 },
    customInstructions: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlaybook();
    }
  }, [isOpen]);

  async function loadPlaybook() {
    setLoading(true);
    try {
      const res = await api.get('/playbook');
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
      const res = await api.put('/playbook', playbook);
      if (res.ok) {
        toast.success('Client Playbook successfully saved and active in AI prompt');
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-borderMuted max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-borderMuted flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-serif font-bold text-ink-900">
                Priya's Delegation Playbook
              </h2>
              <p className="text-xs text-ink-500">
                Injected into every AI prompt & enforced by hard code guardrails
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-ink-400 hover:text-ink-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-ink-900">
          {loading ? (
            <div className="py-12 text-center text-xs text-ink-500">Loading playbook...</div>
          ) : (
            <>
              {/* VIP Senders */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-ink-700 mb-1">
                  VIP Contacts (Immune to No-Reply Muting)
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
                  className="w-full px-3 py-2 bg-white border border-borderMuted rounded-lg"
                  placeholder="mark.suster@upfront.com, anjali.sharma@gmail.com"
                />
              </div>

              {/* VIP Domains */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-ink-700 mb-1">
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
                  className="w-full px-3 py-2 bg-white border border-borderMuted rounded-lg"
                  placeholder="upfront.com, fenwick.com, sequoia.com"
                />
              </div>

              {/* Financial Limit */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-ink-700 mb-1">
                  Assistant Autonomous Spend Approval Limit ($ USD)
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
                  className="w-36 px-3 py-1.5 bg-white border border-borderMuted rounded-lg"
                />
              </div>

              {/* Topic Rules */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-semibold uppercase tracking-wider text-ink-700">
                    Topic Delegation Rules ({playbook.topicRules.length})
                  </label>
                  <button
                    onClick={addTopicRule}
                    className="text-xs text-accent font-semibold flex items-center gap-1 hover:opacity-80 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Topic Rule</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {playbook.topicRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-borderMuted bg-ink-100/30 flex items-center gap-3"
                    >
                      <input
                        type="text"
                        value={rule.topic}
                        onChange={(e) => {
                          const updated = [...playbook.topicRules];
                          updated[idx].topic = e.target.value;
                          setPlaybook({ ...playbook, topicRules: updated });
                        }}
                        className="flex-1 px-2.5 py-1 bg-white border border-borderMuted rounded"
                      />

                      <select
                        value={rule.disposition}
                        onChange={(e) => {
                          const updated = [...playbook.topicRules];
                          updated[idx].disposition = e.target.value;
                          setPlaybook({ ...playbook, topicRules: updated });
                        }}
                        className="px-2.5 py-1 bg-white border border-borderMuted rounded font-medium"
                      >
                        <option value="ALWAYS_CLIENT">Always Client</option>
                        <option value="ASSISTANT_CAN_HANDLE">Assistant Can Handle</option>
                        <option value="NEVER_BOTHER_CLIENT">Never Bother Client</option>
                      </select>

                      <button
                        onClick={() => removeTopicRule(idx)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Instructions */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-ink-700 mb-1">
                  Custom Executive Nuances & Directives
                </label>
                <textarea
                  rows={3}
                  value={playbook.customInstructions}
                  onChange={(e) =>
                    setPlaybook({ ...playbook, customInstructions: e.target.value })
                  }
                  placeholder="e.g. If an email comes from my sister Anjali Sharma, always mark Client to Reply even if it's just family photos."
                  className="w-full p-2.5 bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-borderMuted flex items-center justify-end gap-2 bg-ink-100/30">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700 hover:bg-ink-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Saving...' : 'Save Playbook'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
