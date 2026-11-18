import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Sparkles, ArrowRight, Github } from 'lucide-react';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'framer-motion';

export default function LandingFooter() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  async function handleDemo(role) {
    setLoadingRole(role);
    try {
      await demoLogin(role);
      navigate(role === 'client' ? '/client' : '/assistant');
    } catch (err) {
      toast.error('Failed to launch demo: ' + (err.message || 'Error'));
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <footer className="bg-white border-t border-black/[0.05] pt-16 pb-12 w-full max-w-full overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Final CTA Band with gentle animated floating blobs background */}
        <div className="p-8 sm:p-12 md:p-16 rounded-3xl bg-ink-900 text-white text-center space-y-6 shadow-card relative overflow-hidden">
          {/* Animated floating soft blobs */}
          {!shouldReduceMotion && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-float-blob"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-float-blob"
                style={{ animationDelay: '4s' }}
              />
            </>
          )}

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Ready for Review</span>
            </div>

            <h3 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight max-w-2xl mx-auto leading-tight">
              Ready to eliminate inbox paralysis?
            </h3>

            <p className="text-xs sm:text-sm text-ink-300 max-w-xl mx-auto leading-relaxed font-normal">
              Jump directly into the pre-seeded executive environment with 40 realistic conversations, live AI reclassifications, and draft approvals.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {/* Primary button with subtle 3-cycle pulse ring */}
              <div className="relative">
                <button
                  onClick={() => handleDemo('assistant')}
                  disabled={!!loadingRole}
                  className="min-h-[44px] px-6 py-3.5 rounded-full bg-white hover:bg-ink-100 text-ink-900 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-soft transition active:scale-[0.98] cursor-pointer disabled:opacity-50 relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <span>{loadingRole === 'assistant' ? 'Booting Maya...' : 'Launch as Assistant Maya'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                {!shouldReduceMotion && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-white/30 animate-ping opacity-75 pointer-events-none"
                    style={{ animationIterationCount: 3, animationDuration: '2s' }}
                  />
                )}
              </div>

              <button
                onClick={() => handleDemo('client')}
                disabled={!!loadingRole}
                className="min-h-[44px] px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <span>{loadingRole === 'client' ? 'Booting Priya...' : 'Launch as Client Priya'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <a
                href="https://github.com/nilesh0199/Internship-Task"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-5 py-3.5 rounded-full text-ink-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <Github className="h-4 w-4" />
                <span>GitHub Repository</span>
              </a>
            </div>
          </div>
        </div>

        {/* Small, honest "What's real vs simulated" note */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-black/[0.04] text-center text-xs text-ink-600 max-w-3xl mx-auto space-y-1">
          <div className="font-semibold text-ink-800 text-[11px] uppercase tracking-wider">
            Architecture Notice: What is Live vs. Simulated
          </div>
          <p className="text-[11px] text-ink-500 leading-relaxed">
            Demo mailbox is pre-seeded with 40 realistic executive conversations. Google Gmail and Microsoft Graph connectors are fully implemented for real OAuth2 sync when credentials are configured. Outbound email dispatch is gated by <code className="font-mono text-ink-700 bg-black/[0.04] px-1 py-0.5 rounded">SEND_ENABLED=false</code> by default for demonstration safety (simulated dispatch is written to the immutable activity log).
          </p>
        </div>

        {/* Bottom Footer Details */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-black/[0.05] text-xs text-ink-500">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 group hover:opacity-85 transition cursor-pointer"
            title="Daybook Mail — Return to top"
          >
            <div className="h-7 w-7 rounded-lg bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-xs group-hover:scale-105 transition-transform">
              D
            </div>
            <div>
              <span className="font-serif font-bold text-ink-900 text-sm group-hover:text-ink-700 transition-colors">Daybook Mail</span>
              <span className="ml-2 text-ink-400">— A daybook for your inbox.</span>
            </div>
          </Link>

          <div className="flex items-center gap-6 flex-wrap justify-center">
            <button
              onClick={() => handleDemo('assistant')}
              className="min-h-[44px] flex items-center hover:text-ink-900 transition cursor-pointer"
            >
              Assistant Workspace
            </button>
            <button
              onClick={() => handleDemo('client')}
              className="min-h-[44px] flex items-center hover:text-ink-900 transition cursor-pointer"
            >
              Client Queue
            </button>
            <Link to="/login" className="min-h-[44px] flex items-center hover:text-ink-900 transition">
              Sign In
            </Link>
            <a
              href="https://github.com/nilesh0199/Internship-Task"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] flex items-center hover:text-ink-900 transition"
            >
              Source Code
            </a>
          </div>
        </div>

        <div className="text-center text-[11px] text-ink-400">
          An internship assignment project by Nilesh. Prototype quality built for live demonstration.
        </div>
      </div>
    </footer>
  );
}
