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
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ink-100 text-ink-700 text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>AI Executive Inbox Prototype</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-ink-900 tracking-tight">
            ReplyRight
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Personal Assistant Inbox & Client Decision Queue
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-borderMuted rounded-2xl p-8 shadow-sm">
          {/* Quick Demo Reviewer Lane */}
          <div className="mb-6 p-4 rounded-xl bg-ink-100/60 border border-borderMuted/80">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-700 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Instant Reviewer Test Access</span>
            </div>
            <p className="text-xs text-ink-500 mb-3">
              One-click instant login with 40 realistic pre-seeded conversations and risk guardrails:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemo('assistant')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-label-assistantBg text-label-assistant hover:bg-label-assistant/10 border border-label-assistant/20 text-xs font-semibold transition"
              >
                <span>Maya (Assistant)</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDemo('client')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-label-clientBg text-label-client hover:bg-label-client/10 border border-label-client/20 text-xs font-semibold transition"
              >
                <span>Priya (Client)</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-borderMuted"></div>
            <span className="flex-shrink mx-4 text-xs font-medium text-ink-500">or sign in with password</span>
            <div className="flex-grow border-t border-borderMuted"></div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleStandardLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-ink-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maya@vortexdynamics.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-ink-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-ink-900 hover:bg-ink-900/90 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-ink-500">
            <span>Don't have an account yet? </span>
            <Link to="/signup" className="text-accent font-medium hover:underline">
              Create an Assistant Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
