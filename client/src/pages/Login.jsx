import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Mail, Lock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export function Login() {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleStandardLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.data?.user?.role === 'client') {
        navigate('/client');
      } else {
        navigate('/assistant');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo(role) {
    setError(null);
    setLoading(true);
    try {
      const res = await demoLogin(role);
      if (role === 'client') {
        navigate('/client');
      } else {
        navigate('/assistant');
      }
    } catch (err) {
      setError(err.message || 'Demo initialization failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/[0.06] shadow-2xs text-ink-700 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>AI Executive Inbox Prototype</span>
          </div>
          <h1 className="text-4xl font-serif font-bold text-ink-900 tracking-tight">
            ReplyRight
          </h1>
          <p className="text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">
            Personal Assistant Inbox & Client Decision Queue
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-8 md:p-10 shadow-card">
          {/* Quick Demo Reviewer Lane */}
          <div className="mb-6 p-5 rounded-2xl bg-[#FAF8F5]/80 border border-black/[0.04] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Instant Reviewer Test Access</span>
            </div>
            <p className="text-xs text-ink-500 leading-relaxed">
              1-click instant login with 40 realistic pre-seeded conversations and risk guardrails:
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleDemo('assistant')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-label-assistantBg text-label-assistant hover:opacity-85 border border-label-assistant/20 text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <span>Maya (Assistant)</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDemo('client')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-label-clientBg text-label-client hover:opacity-85 border border-label-client/20 text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <span>Priya (Client)</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-borderMuted/60"></div>
            <span className="flex-shrink mx-4 text-xs font-medium text-ink-400">or sign in with password</span>
            <div className="flex-grow border-t border-borderMuted/60"></div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleStandardLogin} className="space-y-4 select-text">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1 tracking-tight">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maya@vortexdynamics.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1 tracking-tight">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-ink-900 hover:bg-ink-800 text-white rounded-full text-xs font-semibold transition-all shadow-soft flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-ink-500">
            <span>Don't have an account yet? </span>
            <Link to="/signup" className="text-accent font-semibold hover:underline">
              Create an Assistant Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
