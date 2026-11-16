import React, { useState } from 'react';
import { HelpCircle, X, ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

export function PrototypeHelpPopover() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur border border-borderMuted shadow-md text-xs font-semibold text-ink-700 hover:text-ink-900 transition cursor-pointer"
        title="Prototype Disclosure & Guide"
      >
        <HelpCircle className="h-3.5 w-3.5 text-accent" />
        <span>Prototype Guide</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-borderMuted p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-borderMuted">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent" />
                <h3 className="text-sm font-serif font-bold text-ink-900">
                  ReplyRight Prototype Disclosure
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-ink-400 hover:text-ink-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-ink-600 leading-relaxed">
              This prototype is built for live evaluation. Here is the exact status of each subsystem:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="font-semibold text-emerald-950 flex items-center gap-1.5 mb-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Real & Live Pipelines</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-normal">
                  Live Gemini 2.0 Flash / Groq LLM pipelines; real OAuth2 redirects for Gmail & Outlook; live MongoDB state persistence and timeline updates.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="font-semibold text-amber-950 flex items-center gap-1.5 mb-0.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Safely Simulated Subsystems</span>
                </div>
                <ul className="text-[11px] text-amber-900 list-disc list-inside space-y-0.5 leading-normal">
                  <li>
                    <strong>Demo Mailbox</strong>: 40 realistic pre-seeded threads (avoids third-party rate limits).
                  </li>
                  <li>
                    <strong>Message Injector</strong>: Simulate incoming customer follow-ups on demand.
                  </li>
                  <li>
                    <strong>Email Dispatch Gate</strong>: <code className="font-mono text-[10px]">SEND_ENABLED=false</code> records simulated sends in Activity Log.
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-borderMuted text-xs">
              <a
                href="/settings/accounts"
                className="text-accent hover:underline font-medium flex items-center gap-1"
              >
                <span>Manage Accounts</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-ink-900 text-white font-medium hover:bg-ink-800 cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
