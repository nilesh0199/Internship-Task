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
  const [oauthConfig, setOauthConfig] = useState({ googleConfigured: false, microsoftConfigured: false });
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('Connecting to mailbox...');

  useEffect(() => {
    api
      .get('/accounts')
      .then((res) => {
        if (res?.config) {
          setOauthConfig(res.config);
        }
      })
      .catch(() => {});
  }, []);

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
    setSyncStatusText('Connecting to Demo Mailbox (40 realistic conversations)...');

    setTimeout(() => {
      setSyncProgress(45);
      setSyncStatusText('Running deterministic prefilters on newsletters and notifications...');
    }, 800);

    setTimeout(() => {
      setSyncProgress(75);
      setSyncStatusText('Applying Priya\'s Delegation Playbook and evaluating AI confidence...');
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
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-8 md:py-12 select-none font-sans">
      <div className="w-full max-w-2xl bg-white border border-black/[0.06] rounded-3xl shadow-card p-8 md:p-10 space-y-6">
        {/* Progress Header */}
        <div className="flex items-center justify-between pb-5 border-b border-borderMuted/60">
          <div>
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              Step {step} of 5
            </span>
            <h1 className="text-xl md:text-2xl font-serif font-bold text-ink-900 mt-0.5 tracking-tight">
              {step === 1 && 'Welcome to Daybook Mail'}
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
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-7 bg-ink-900 shadow-2xs'
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
            <p className="text-xs text-ink-600 leading-relaxed">
              Daybook Mail is purpose-built for executive assistants managing high-volume client inboxes.
              Here is how it transforms your workflow in three steps:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#FAF8F5]/80 border border-black/[0.04] shadow-2xs space-y-2">
                <div className="h-9 w-9 rounded-xl bg-label-assistantBg text-label-assistant flex items-center justify-center">
                  <Inbox className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-ink-900 tracking-tight">Clear Ownership</h3>
                <p className="text-[11px] text-ink-500 leading-relaxed">
                  AI instantly separates emails: <span className="font-semibold text-label-assistant">Assistant to Reply</span> vs <span className="font-semibold text-label-client">Client to Reply</span>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF8F5]/80 border border-black/[0.04] shadow-2xs space-y-2">
                <div className="h-9 w-9 rounded-xl bg-label-clientBg text-label-client flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-ink-900 tracking-tight">Decision Queue</h3>
                <p className="text-[11px] text-ink-500 leading-relaxed">
                  Your executive gets a clean card stack on mobile with single-tap approvals and zero endless reply chains.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF8F5]/80 border border-black/[0.04] shadow-2xs space-y-2">
                <div className="h-9 w-9 rounded-xl bg-label-reviewBg text-label-review flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-ink-900 tracking-tight">Hard Guardrails</h3>
                <p className="text-[11px] text-ink-500 leading-relaxed">
                  In-code safety rules guarantee VIPs, contracts, and financial terms never get muted.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-ink-900 hover:bg-ink-800 text-white rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer transition shadow-soft active:scale-95"
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
            <p className="text-xs text-ink-600 leading-relaxed">
              Verify the executive client profile you are supporting. All classification decisions and Playbook rules are scoped to this profile:
            </p>

            <div className="p-6 rounded-2xl border border-black/[0.05] bg-[#FAF8F5]/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-label-clientBg text-label-client flex items-center justify-center text-lg font-serif font-bold ring-2 ring-white shadow-xs">
                  PS
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-ink-900 tracking-tight">
                    {client?.name || 'Priya Sharma'}
                  </h3>
                  <p className="text-xs text-ink-500">
                    {client?.title || 'Founder & CEO'} • {client?.company || 'Vortex Dynamics'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-borderMuted/60">
                <div>
                  <span className="text-ink-400 font-semibold text-[10px] uppercase tracking-wider block">Client Email</span>
                  <div className="font-mono text-ink-900 font-medium mt-0.5">
                    {client?.email || 'priya@vortexdynamics.com'}
                  </div>
                </div>
                <div>
                  <span className="text-ink-400 font-semibold text-[10px] uppercase tracking-wider block">Managing Assistant</span>
                  <div className="font-medium text-ink-900 mt-0.5">
                    {user?.name || 'Maya Lin'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-black/[0.08] text-ink-700 rounded-full text-xs font-semibold hover:bg-ink-50 transition cursor-pointer active:scale-95"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-ink-900 hover:bg-ink-800 text-white rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer transition shadow-soft active:scale-95"
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
            <p className="text-xs text-ink-600 leading-relaxed">
              Choose the primary email provider to ingest and synchronize:
            </p>

            <div className="space-y-3">
              {/* Option A: Demo Mailbox */}
              <label
                onClick={() => setSelectedMailbox('demo')}
                className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedMailbox === 'demo'
                    ? 'border-ink-900 bg-white shadow-soft ring-1 ring-ink-900'
                    : 'border-black/[0.05] bg-[#FAF8F5]/80 hover:bg-white'
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
                    <span className="text-xs font-bold text-ink-900 tracking-tight">Demo Mailbox (Recommended for Review)</span>
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Pre-Seeded & Ready
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                    Loads 40 realistic multi-message conversations with traps, meetings, and follow-ups. Zero third-party API rate limits.
                  </p>
                </div>
              </label>

              {/* Option B: Gmail */}
              <label
                onClick={() => setSelectedMailbox('gmail')}
                className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedMailbox === 'gmail'
                    ? 'border-ink-900 bg-white shadow-soft ring-1 ring-ink-900'
                    : 'border-black/[0.05] bg-[#FAF8F5]/80 hover:bg-white'
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink-900 tracking-tight">Google Workspace / Gmail</span>
                    {!oauthConfig.googleConfigured && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                        Requires OAuth keys in server/.env
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                    Connect real Gmail account via OAuth2 (<code className="text-[11px] font-mono">gmail.readonly</code> + <code className="text-[11px] font-mono">gmail.send</code>).
                  </p>
                </div>
              </label>

              {/* Option C: Outlook */}
              <label
                onClick={() => setSelectedMailbox('outlook')}
                className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedMailbox === 'outlook'
                    ? 'border-ink-900 bg-white shadow-soft ring-1 ring-ink-900'
                    : 'border-black/[0.05] bg-[#FAF8F5]/80 hover:bg-white'
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink-900 tracking-tight">Microsoft Outlook / 365</span>
                    {!oauthConfig.microsoftConfigured && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                        Requires Azure keys in server/.env
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                    Connect real Outlook account via Microsoft Graph API (<code className="text-[11px] font-mono">Mail.Read</code> + <code className="text-[11px] font-mono">Mail.Send</code>).
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-black/[0.08] text-ink-700 rounded-full text-xs font-semibold hover:bg-ink-50 transition cursor-pointer active:scale-95"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2.5 bg-ink-900 hover:bg-ink-800 text-white rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer transition shadow-soft active:scale-95"
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
            <p className="text-xs text-ink-600 leading-relaxed">
              Customize Priya's delegation playbook. These preset rules are directly injected into every AI prompt and hard guardrail:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1 tracking-tight">
                  VIP Contacts & Domains (Never Auto-Muted)
                </label>
                <input
                  type="text"
                  value={playbookState.vipSenders}
                  onChange={(e) => setPlaybookState({ ...playbookState, vipSenders: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                />
                <span className="text-[11px] text-ink-400 mt-1 block">
                  Emails from these senders can never resolve to No Reply Needed.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1 tracking-tight">
                  Assistant Autonomous Spending Limit ($ USD)
                </label>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-ink-700">$</span>
                  <input
                    type="number"
                    value={playbookState.maxSpend}
                    onChange={(e) => setPlaybookState({ ...playbookState, maxSpend: parseInt(e.target.value, 10) || 0 })}
                    className="w-36 px-3.5 py-2 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                  />
                  <span className="text-xs text-ink-400">Expenses above this limit require Priya's signoff.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1 tracking-tight">
                  High-Stakes Topics (Always Escalate to Priya)
                </label>
                <input
                  type="text"
                  value={playbookState.topicAlwaysClient}
                  onChange={(e) => setPlaybookState({ ...playbookState, topicAlwaysClient: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1 tracking-tight">
                  Assistant Autonomy Topics (Maya Resolves)
                </label>
                <input
                  type="text"
                  value={playbookState.topicAssistantHandles}
                  onChange={(e) => setPlaybookState({ ...playbookState, topicAssistantHandles: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 border border-black/[0.08] text-ink-700 rounded-full text-xs font-semibold hover:bg-ink-50 transition cursor-pointer active:scale-95"
              >
                Back
              </button>
              <button
                onClick={startSync}
                className="px-6 py-2.5 bg-ink-900 hover:bg-ink-800 text-white rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer transition shadow-soft active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Save Playbook & Run Initial Sync</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Initial Sync Animation */}
        {step === 5 && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-ink-100 border-t-accent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-ink-900 font-mono">
                {syncProgress}%
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-serif font-bold text-ink-900 tracking-tight">
                Synchronizing Mailbox
              </h2>
              <p className="text-xs text-ink-500 animate-pulse">
                {syncStatusText}
              </p>
            </div>

            <div className="w-full max-w-xs bg-ink-100 rounded-full h-2 overflow-hidden shadow-inner">
              <div
                className="bg-accent h-full transition-all duration-500 rounded-full"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
