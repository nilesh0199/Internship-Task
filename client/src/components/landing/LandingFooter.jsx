import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Sparkles, ArrowRight, Github, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function LandingFooter() {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();

  async function handleDemo(role) {
    try {
      await loginDemo(role);
      navigate(role === 'client' ? '/client' : '/assistant');
    } catch (err) {
      toast.error('Failed to launch demo: ' + err.message);
    }
  }

  return (
    <footer className="bg-white border-t border-black/[0.05] pt-16 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Final CTA Band */}
        <div className="p-8 sm:p-12 md:p-16 rounded-3xl bg-ink-900 text-white text-center space-y-6 shadow-card relative overflow-hidden">
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

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleDemo('assistant')}
              className="px-6 py-3.5 rounded-full bg-white hover:bg-ink-100 text-ink-900 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-soft transition active:scale-95 cursor-pointer"
            >
              <span>Launch as Assistant Maya</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDemo('client')}
              className="px-6 py-3.5 rounded-full bg-white/15 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer"
            >
              <span>Launch as Founder Priya</span>
            </button>
            <a
              href="https://github.com/nilesh0199/Internship-Task"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3.5 rounded-full text-ink-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Github className="h-4 w-4" />
              <span>GitHub Repository</span>
            </a>
          </div>
        </div>

        {/* Bottom Footer Details */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-black/[0.05] text-xs text-ink-500">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-xs">
              D
            </div>
            <div>
              <span className="font-serif font-bold text-ink-900 text-sm">Daybook Mail</span>
              <span className="ml-2 text-ink-400">— A daybook for your inbox.</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => handleDemo('assistant')} className="hover:text-ink-900 transition cursor-pointer">
              Assistant Workspace
            </button>
            <button onClick={() => handleDemo('client')} className="hover:text-ink-900 transition cursor-pointer">
              Client Queue
            </button>
            <Link to="/login" className="hover:text-ink-900 transition">
              Sign In
            </Link>
            <a
              href="https://github.com/nilesh0199/Internship-Task"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink-900 transition"
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
