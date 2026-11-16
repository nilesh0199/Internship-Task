import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import { DecisionCard } from '../components/DecisionCard.jsx';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Inbox,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export function ClientQueue() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHandled, setShowHandled] = useState(false);

  useEffect(() => {
    loadClientQueue();
    // 10-second polling for live sync between Assistant and Client
    const interval = setInterval(loadClientQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadClientQueue() {
    try {
      const res = await api.get('/threads?segment=client');
      if (res.ok) {
        setThreads(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load client decision queue:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecisionAction(threadId, action, extra = {}) {
    try {
      const res = await api.post(`/threads/${threadId}/client-decision`, {
        action,
        ...extra,
      });

      if (res.ok) {
        if (action === 'approve') {
          toast.success("Draft approved! Maya notified in Assistant Workspace.");
        } else if (action === 'hand_to_assistant') {
          toast.success('Delegated to Maya with your instructions.');
        } else if (action === 'snooze') {
          toast.success('Snoozed for 24 hours.');
        } else if (action === 'handled') {
          toast.success('Marked as handled.');
        }
        await loadClientQueue();
      }
    } catch (err) {
      toast.error('Action failed: ' + err.message);
    }
  }

  const pendingThreads = threads.filter(
    (t) => t.clientStatus !== 'handled' && t.currentLabel === 'CLIENT_TO_REPLY'
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink-900 pb-28 font-sans">
      {/* Top Floating Client Header */}
      <header className="h-16 bg-white/85 backdrop-blur-md border-b border-borderMuted/70 px-6 md:px-12 flex items-center justify-between sticky top-0 z-20 select-none">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-label-clientBg text-label-client flex items-center justify-center font-serif font-bold text-sm ring-2 ring-white shadow-xs">
            PS
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-ink-900 leading-tight tracking-tight">
              Priya Sharma
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider text-label-client">
              Decision Queue
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadClientQueue}
            className="p-2 rounded-full border border-black/[0.06] bg-white hover:bg-ink-50 text-ink-500 hover:text-ink-900 shadow-soft transition cursor-pointer active:scale-95"
            title="Refresh decision queue"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 pt-8 md:pt-12 space-y-8">
        {/* Morning Brief Editorial Card */}
        <div className="p-8 md:p-10 rounded-3xl bg-white border border-black/[0.06] shadow-card space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDF2E9] text-[#C25E38] text-xs font-semibold uppercase tracking-wider border border-[#C25E38]/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Executive Morning Brief</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-serif font-bold text-ink-900 tracking-tight leading-tight">
            Good morning, Priya.
          </h2>

          <p className="text-xs text-ink-600 leading-relaxed max-w-xl">
            Maya Lin and the AI safety engine triaged incoming traffic according to your delegation playbook. Here is your distilled daily decision stack:
          </p>

          {/* Stat Pill Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDF2E9] text-[#C25E38] border border-[#C25E38]/20 text-xs font-semibold shadow-2xs">
              <span className="font-bold">{pendingThreads.length}</span>
              <span>Decisions Requiring Signoff</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0FDFA] text-[#0F766E] border border-[#0F766E]/20 text-xs font-semibold shadow-2xs">
              <span className="font-bold">14</span>
              <span>Resolved Autonomously by Maya</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-semibold shadow-2xs">
              <span className="font-bold">5</span>
              <span>Waiting on Partners</span>
            </div>
          </div>
        </div>

        {/* Active Decision Stack */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">
              Decisions Requiring You ({pendingThreads.length})
            </h3>
            <span className="text-xs font-medium text-ink-400">Distilled by Maya & AI</span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-8 bg-white rounded-3xl border border-black/[0.04] shadow-card animate-pulse space-y-4">
                  <div className="h-3 bg-ink-200 rounded-full w-1/4" />
                  <div className="h-6 bg-ink-200 rounded-full w-3/4" />
                  <div className="h-20 bg-ink-100 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : pendingThreads.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-black/[0.06] shadow-card p-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-xl font-serif font-bold text-ink-900 tracking-tight">
                You're all clear!
              </h4>
              <p className="text-xs text-ink-500 max-w-sm mx-auto leading-relaxed">
                Zero emails require your personal input right now. Maya Lin and the AI safety engine resolved all routine inquiries.
              </p>
            </div>
          ) : (
            pendingThreads.map((thread) => (
              <DecisionCard
                key={thread._id}
                thread={thread}
                draft={thread._id === 'th_10' ? { bodyText: "Hi Alex, Priya and I have confirmed the keynote terms with Fenwick. We look forward to the fireside chat!", _id: 'draft_001' } : null}
                onAction={(action, extra) => handleDecisionAction(thread._id, action, extra)}
              />
            ))
          )}
        </section>

        {/* Collapsed Section: Handled Autonomously by Assistant */}
        <section className="bg-white rounded-3xl border border-black/[0.06] shadow-card overflow-hidden">
          <button
            onClick={() => setShowHandled(!showHandled)}
            className="w-full p-5 flex items-center justify-between text-xs font-semibold text-ink-800 hover:bg-ink-50 transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="font-bold tracking-tight">Resolved Autonomously by Maya Lin (14)</span>
            </div>
            {showHandled ? <ChevronUp className="h-4 w-4 text-ink-400" /> : <ChevronDown className="h-4 w-4 text-ink-400" />}
          </button>

          {showHandled && (
            <div className="p-5 pt-0 border-t border-borderMuted/60 divide-y divide-borderMuted/40 text-xs">
              {[
                { subject: 'Flight & Hotel: SF to NYC Tech Week', action: 'Flight UA 1890 ticketed' },
                { subject: 'Catering Menu Selection for Friday All-Hands', action: 'Mediterranean Bowl approved' },
                { subject: 'DHL Customs Clearance - UK Sensor Shipment', action: 'Commercial invoice uploaded' },
                { subject: 'Boardroom Zoom Rooms AV Diagnostics', action: 'Tech access granted for Thursday 8 AM' },
              ].map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-900 tracking-tight">{item.subject}</span>
                  <span className="text-[11px] font-medium text-ink-600 bg-ink-100/80 px-2.5 py-1 rounded-full border border-black/[0.04]">
                    {item.action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
