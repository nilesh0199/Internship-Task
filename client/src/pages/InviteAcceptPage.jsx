import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import {
  Lock,
  Mail,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);

  // Form inputs
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError('Missing invitation token.');
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/auth/invite/${token}`);
        if (res.ok && res.data) {
          setInviteData(res.data);
        } else {
          setError('Invalid or expired invitation link.');
        }
      } catch (err) {
        setError(err.message || 'This invitation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    }
    validateToken();
  }, [token]);

  // Password strength check
  const hasMinLength = password.length >= 10;
  const hasMixedChars = /[a-zA-Z]/.test(password) && /[0-9!@#$%^&*]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && passwordsMatch;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!hasMinLength) {
      setSubmitError('Password must be at least 10 characters long.');
      return;
    }
    if (!passwordsMatch) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await api.post(`/auth/invite/${token}/accept`, { password });
      if (res.ok) {
        toast.success('Account created! Welcome to your Decision Queue.');
        await refreshSession();
        navigate('/client', { replace: true });
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-12 select-none font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
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
              <span>Executive Client Invitation</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-ink-900 tracking-tight">
              Daybook Mail
            </h1>
          </Link>
          <p className="text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">
            Your personal assistant has set up your streamlined executive decision queue.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-black/[0.06] rounded-3xl p-8 md:p-10 shadow-card">
          {/* State 1: Loading Skeleton */}
          {loading && (
            <div className="space-y-4 py-6">
              <div className="flex items-center justify-center gap-2 text-ink-500 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span>Verifying secure invitation link...</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-ink-100 rounded-md animate-pulse w-3/4 mx-auto" />
                <div className="h-4 bg-ink-100 rounded-md animate-pulse w-1/2 mx-auto" />
              </div>
            </div>
          )}

          {/* State 2: Error State (Invalid / Expired / Already Used) */}
          {!loading && error && (
            <div className="space-y-5 text-center py-4">
              <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-serif font-bold text-ink-900">
                  Invitation Link Unavailable
                </h3>
                <p className="text-xs text-ink-600 leading-relaxed max-w-xs mx-auto">
                  {error}
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="w-full py-2.5 px-4 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold transition active:scale-95 shadow-soft"
                >
                  Go to Sign in
                </Link>
                <Link
                  to="/"
                  className="text-xs text-ink-500 hover:text-ink-800 transition"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}

          {/* State 3: Valid Invitation Form */}
          {!loading && !error && inviteData && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1 text-center pb-2 border-b border-borderMuted/60">
                <h2 className="text-xl font-serif font-bold text-ink-900">
                  Activate Your Account
                </h2>
                <p className="text-xs text-ink-500">
                  Set a secure password for your executive decision queue.
                </p>
              </div>

              {submitError && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Read-Only Client Details */}
              <div className="space-y-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-black/[0.05]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink-400 block tracking-wider">
                    Executive Profile
                  </span>
                  <div className="text-xs font-bold text-ink-900 flex items-center gap-1.5 mt-0.5">
                    <User className="h-3.5 w-3.5 text-accent" />
                    <span>{inviteData.name}</span>
                    {inviteData.title && (
                      <span className="text-[11px] font-normal text-ink-500">
                        · {inviteData.title}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-ink-400 block tracking-wider">
                    Sign-in Email
                  </span>
                  <div className="text-xs font-mono text-ink-700 flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5 text-ink-400" />
                    <span>{inviteData.email}</span>
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-ink-700">
                  Create Password (min. 10 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 10 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-borderMuted text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 cursor-pointer p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Hints */}
                <div className="flex items-center gap-3 pt-1 text-[11px]">
                  <span
                    className={`flex items-center gap-1 font-mono ${
                      hasMinLength ? 'text-emerald-700 font-semibold' : 'text-ink-400'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    10+ chars
                  </span>
                  <span
                    className={`flex items-center gap-1 font-mono ${
                      hasMixedChars ? 'text-emerald-700 font-semibold' : 'text-ink-400'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    letters & numbers
                  </span>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-ink-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-borderMuted text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-xs"
                  />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <span className="text-[11px] text-red-600 block">
                    Passwords do not match
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="w-full py-3 px-4 rounded-full bg-ink-900 hover:bg-ink-800 disabled:opacity-50 text-white text-xs font-semibold shadow-soft transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Decision Queue</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-[11px] text-ink-400">
                Single-use secure invitation · Expires in 7 days
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
