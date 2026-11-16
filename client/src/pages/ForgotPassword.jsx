import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Sparkles, HelpCircle } from 'lucide-react';

export function ForgotPassword() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <Link
            to="/"
            className="inline-flex flex-col items-center group hover:opacity-90 transition cursor-pointer"
            title="Daybook Mail — Return to home"
          >
            <div className="h-10 w-10 rounded-2xl bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-lg shadow-soft group-hover:scale-105 transition-transform mb-3">
              D
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/[0.06] shadow-2xs text-ink-700 text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>AI Executive Inbox Prototype</span>
            </div>
            <h1 className="text-4xl font-serif font-bold text-ink-900 tracking-tight group-hover:text-ink-700 transition-colors">
              Daybook Mail
            </h1>
          </Link>
          <p className="text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">
            A daybook for your inbox.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-8 md:p-10 shadow-card space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-900">Password Reset</h2>
              <p className="text-xs text-ink-500">Prototype Information</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-black/[0.06] space-y-2.5 text-xs text-ink-700 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-ink-900">
              <HelpCircle className="h-4 w-4 text-accent" />
              <span>Reset not supported in prototype</span>
            </div>
            <p>
              Password reset isn't supported in the prototype. In production this sends a signed reset link to your registered email address.
            </p>
            <p className="text-ink-500 pt-1 border-t border-black/[0.04]">
              If you're stuck, ask your assistant to resend your invite or re-seed the demo database using the seed options on the login screen.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="w-full py-3 px-4 bg-ink-900 hover:bg-ink-800 text-white rounded-full text-xs font-semibold transition-all shadow-soft flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
