import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  Inbox,
  ShieldCheck,
  Zap,
  Mail,
  User,
  Sliders,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

export function Onboarding() {
  const { user, client } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedMailbox, setSelectedMailbox] = useState('demo');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('Connecting to mailbox...');

  // Playbook settings state with sensible defaults
  const [playbookState, setPlaybookState] = useState({
    vipSenders: 'mark.suster@upfront.com, anjali.sharma@gmail.com, s.jenkins@fenwick.com',
    maxSpend: 1000,
    topicAlwaysClient: 'Term Sheets, Equity Financing, Executive Hiring, Press Keynotes',
    topicAssistantHandles: 'Meeting Scheduling, Travel Itineraries, Office Facilities, Vendor Invoices',
  });

  function startSync() {
    setStep(5);
    setSyncProgress(15);
    setSyncStatusText('Connecting to Demo Mailbox (40 realistic threads)...');

    setTimeout(() => {
      setSyncProgress(45);
      setSyncStatusText('Running deterministic prefilters on newsletters and notifications...');
    }, 800);

    setTimeout(() => {
      setSyncProgress(75);
      setSyncStatusText('Applying Client Playbook and evaluating Gemini AI confidence...');
    }, 1600);

    setTimeout(() => {
      setSyncProgress(100);
      setSyncStatusText('Inbox ready! Redirecting to Assistant Workspace...');
      setTimeout(() => {
        navigate('/assistant');
      }, 700);
    }, 2400);
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-white border border-borderMuted rounded-2xl shadow-sm p-8">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-borderMuted">
          <div>
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              Step {step} of 5
            </span>
            <h1 className="text-xl font-serif font-bold text-ink-900 mt-0.5">
              {step === 1 && 'Welcome to ReplyRight'}
              {step === 2 && 'Confirm Executive Client Profile'}
              {step === 3 && 'Connect Mailbox'}
              {step === 4 && 'Configure Client Playbook'}
              {step === 5 && 'Initial Mailbox Synchronization'}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step
                    ? 'w-6 bg-ink-900'
                    : i < step
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-ink-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-sm text-ink-700 leading-relaxed">
              ReplyRight is purpose-built for executive assistants managing high-volume client inboxes.
              Here is how it transforms your workflow in three steps:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-ink-100/50 border border-borderMuted">
                <div className="h-8 w-8 rounded-lg bg-label-assistantBg text-label-assistant flex items-center justify-center mb-3">
                  <Inbox className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-ink-900 mb-1">Clear Ownership</h2>
                <p className="text-xs text-ink-500 leading-normal">
                  AI instantly separates emails: <span className="font-medium text-label-assistant">Assistant to Reply</span> vs <span className="font-medium text-label-client">Client to Reply</span>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-ink-100/50 border border-borderMuted">
                <div className="h-8 w-8 rounded-lg bg-label-clientBg text-label-client flex items-center justify-center mb-3">
                  <Zap className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-ink-900 mb-1">Decision Queue</h2>
                <p className="text-xs text-ink-500 leading-normal">
                  Your boss gets a clean card stack on mobile with single-tap approvals and no endless chains.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-ink-100/50 border border-borderMuted">
                <div className="h-8 w-8 rounded-lg bg-label-reviewBg text-label-review flex items-center justify-center mb-3">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-ink-900 mb-1">Hard Guardrails</h2>
                <p className="text-xs text-ink-500 leading-normal">
                  In-code safety rules guarantee VIPs, contracts, and money terms never slip through.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-ink-900 hover:bg-ink-900/90 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm Client */}
        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-ink-700">
              Verify the executive client profile you are supporting. All classification decisions and Playbook rules are scoped to this profile:
            </p>

            <div className="p-5 rounded-xl border border-borderMuted bg-white space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-label-clientBg text-label-client flex items-center justify-center text-lg font-serif font-bold">
                  PS
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink-900">
                    {client?.name || 'Priya Sharma'}
                  </h2>
                  <p className="text-xs text-ink-500">
                    {client?.title || 'Founder & CEO'} • {client?.company || 'Vortex Dynamics'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-borderMuted">
                <div>
                  <span className="text-ink-500">Client Email:</span>
                  <div className="font-mono text-ink-900 mt-0.5">
                    {client?.email || 'priya@vortexdynamics.com'}
                  </div>
                </div>
                <div>
                  <span className="text-ink-500">Managing Assistant:</span>
                  <div className="font-medium text-ink-900 mt-0.5">
                    {user?.name || 'Maya Lin'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-borderMuted text-ink-700 rounded-lg text-sm font-medium hover:bg-ink-100 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-ink-900 hover:bg-ink-900/90 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition"
              >
                <span>Confirm & Connect Mailbox</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Connect Mailbox */}
        {step === 3 && (
          <div className="space-y-6">
            <p className="text-sm text-ink-700">
              Choose the primary email provider to ingest and synchronize:
            </p>

            <div className="space-y-3">
              {/* Option A: Demo Mailbox */}
              <label
                onClick={() => setSelectedMailbox('demo')}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${
                  selectedMailbox === 'demo'
                    ? 'border-ink-900 bg-ink-100/50 ring-1 ring-ink-900'
                    : 'border-borderMuted hover:bg-ink-100/20'
                }`}
              >
                <input
                  type="radio"
                  name="mailbox"
                  checked={selectedMailbox === 'demo'}
                  onChange={() => setSelectedMailbox('demo')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900">Demo Mailbox (Recommended for Review)</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Pre-Seeded & Ready
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">
                    Loads 40 realistic multi-message conversations with traps, meetings, and follow-ups. Zero API quota limits.
                  </p>
                </div>
              </label>

              {/* Option B: Gmail */}
              <label
                onClick={() => setSelectedMailbox('gmail')}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${
                  selectedMailbox === 'gmail'
                    ? 'border-ink-900 bg-ink-100/50 ring-1 ring-ink-900'
                    : 'border-borderMuted hover:bg-ink-100/20'
                }`}
              >
                <input
                  type="radio"
                  name="mailbox"
                  checked={selectedMailbox === 'gmail'}
                  onChange={() => setSelectedMailbox('gmail')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-ink-900">Google Workspace / Gmail</span>
                  <p className="text-xs text-ink-500 mt-1">
                    Connect real Gmail account via OAuth2 (<code className="text-[11px]">gmail.readonly</code> + <code className="text-[11px]">gmail.send</code>).
                  </p>
                </div>
              </label>

              {/* Option C: Outlook */}
              <label
                onClick={() => setSelectedMailbox('outlook')}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition ${
                  selectedMailbox === 'outlook'
                    ? 'border-ink-900 bg-ink-100/50 ring-1 ring-ink-900'
                    : 'border-borderMuted hover:bg-ink-100/20'
                }`}
              >
                <input
                  type="radio"
                  name="mailbox"
                  checked={selectedMailbox === 'outlook'}
                  onChange={() => setSelectedMailbox('outlook')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-ink-900">Microsoft Outlook / 365</span>
                  <p className="text-xs text-ink-500 mt-1">
                    Connect real Outlook account via Microsoft Graph API (<code className="text-[11px]">Mail.Read</code> + <code className="text-[11px]">Mail.Send</code>).
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-borderMuted text-ink-700 rounded-lg text-sm font-medium hover:bg-ink-100 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-5 py-2.5 bg-ink-900 hover:bg-ink-900/90 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition"
              >
                <span>Continue to Playbook</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Playbook Configuration */}
        {step === 4 && (
          <div className="space-y-6">
            <p className="text-sm text-ink-700">
              Customize Priya's delegation playbook. These preset rules are directly injected into every AI prompt and hard guardrail:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  VIP Contacts & Domains (Never Auto-Muted)
                </label>
                <input
                  type="text"
                  value={playbookState.vipSenders}
                  onChange={(e) => setPlaybookState({ ...playbookState, vipSenders: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <span className="text-[11px] text-ink-500 mt-0.5 block">
                  Emails from these senders can never resolve to No Reply Needed.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  Assistant Autonomous Spending Limit ($ USD)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-700">$</span>
                  <input
                    type="number"
                    value={playbookState.maxSpend}
                    onChange={(e) => setPlaybookState({ ...playbookState, maxSpend: parseInt(e.target.value, 10) || 0 })}
                    className="w-32 px-3 py-1.5 text-xs bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  <span className="text-xs text-ink-500">Expenses above this limit require Priya's signoff.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  High-Stakes Topics (Always Escalate to Priya)
                </label>
                <input
                  type="text"
                  value={playbookState.topicAlwaysClient}
                  onChange={(e) => setPlaybookState({ ...playbookState, topicAlwaysClient: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  Assistant Autonomy Topics (Maya Resolves)
                </label>
                <input
                  type="text"
                  value={playbookState.topicAssistantHandles}
                  onChange={(e) => setPlaybookState({ ...playbookState, topicAssistantHandles: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-borderMuted text-ink-700 rounded-lg text-sm font-medium hover:bg-ink-100 transition"
              >
                Back
              </button>
              <button
                onClick={startSync}
                className="px-5 py-2.5 bg-ink-900 hover:bg-ink-900/90 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Save Playbook & Run Initial Sync</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Initial Sync Animation */}
        {step === 5 && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-ink-100 border-t-accent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-ink-900">
                {syncProgress}%
              </div>
            </div>

            <div>
              <h2 className="text-lg font-serif font-bold text-ink-900">
                Synchronizing Mailbox
              </h2>
              <p className="text-xs text-ink-500 mt-1 animate-pulse">
                {syncStatusText}
              </p>
            </div>

            <div className="w-full max-w-xs bg-ink-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-500"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
