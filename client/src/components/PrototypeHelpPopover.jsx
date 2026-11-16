import React, { useState, useEffect } from 'react';
import { HelpCircle, X, ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';

export function PrototypeHelpPopover() {
  const [isOpen, setIsOpen] = useState(false);

  // Lock body/background scroll while the prototype guide is open
  useBodyScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-black/[0.08] shadow-float text-xs font-semibold text-ink-700 hover:text-ink-900 transition-all cursor-pointer active:scale-95 select-none"
        title="Prototype Disclosure & Guide"
      >
        <HelpCircle className="h-3.5 w-3.5 text-accent" />
        <span>Prototype Guide</span>
      </button>

      {isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full shadow-float border border-black/[0.06] p-7 md:p-8 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain select-text"
          >
            <div className="flex items-center justify-between pb-3 border-b border-borderMuted/70">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-ink-900 leading-tight">
                    Daybook Mail Prototype Guide
                  </h3>
                  <span className="text-[10px] text-ink-400 font-medium uppercase tracking-wider">
                    Evaluation Architecture Disclosure
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-ink-400 hover:text-ink-900 rounded-full hover:bg-ink-100 transition cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-ink-600 leading-relaxed">
              This prototype is built for live evaluation and reviewer testing. Here is the operational status of each subsystem:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-[#F0FDFA] border border-emerald-200/70 shadow-2xs space-y-1">
                <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Real & Live Pipelines</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Live Gemini 2.0 Flash / Groq LLM pipelines; real OAuth2 redirects for Google Workspace & Microsoft Outlook; live in-memory and MongoDB state persistence with timeline updates.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFFBF0] border border-amber-200/70 shadow-2xs space-y-1.5">
                <div className="font-semibold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Safely Simulated Subsystems</span>
                </div>
                <ul className="text-[11px] text-amber-900 list-disc list-inside space-y-1 leading-relaxed">
                  <li>
                    <strong>Demo Mailbox</strong>: 40 realistic pre-seeded threads (prevents external rate limits during live evaluation).
                  </li>
                  <li>
                    <strong>Message Injector</strong>: Simulate incoming executive follow-ups on demand.
                  </li>
                  <li>
                    <strong>Email Dispatch Gate</strong>: <code className="font-mono text-[10px] bg-white/80 px-1 py-0.5 rounded border border-amber-200">SEND_ENABLED=false</code> simulates transmission and records audit in Activity Log.
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-borderMuted/70 text-xs">
              <a
                href="/settings/accounts"
                className="text-accent hover:underline font-semibold flex items-center gap-1"
              >
                <span>Manage Connected Accounts</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-full bg-ink-900 text-white font-semibold hover:bg-ink-800 transition cursor-pointer shadow-soft active:scale-95"
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
