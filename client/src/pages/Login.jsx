import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import {
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check,
  Briefcase,
  UserCheck,
  ChevronLeft,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const { login, demoLogin, demoMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const nextParam = searchParams.get('next');
  const roleParam = searchParams.get('role'); // 'assistant' | 'client' | null

  // If role is provided in searchParams (?role=assistant|client), skip chooser directly
  const [chosenRole, setChosenRole] = useState(
    roleParam === 'assistant' || roleParam === 'client' ? roleParam : null
  );
  const [step, setStep] = useState(
    roleParam === 'assistant' || roleParam === 'client' ? 'form' : 'chooser'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState(null);
  const [mismatchNotice, setMismatchNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteInput, setInviteInput] = useState('');

  // Synchronize when query params change
  useEffect(() => {
    if (roleParam === 'assistant' || roleParam === 'client') {
      setChosenRole(roleParam);
      setStep('form');
    }
  }, [roleParam]);

  // Handle ESC key to dismiss modal and return to landing page
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (inviteModalOpen) {
          setInviteModalOpen(false);
        } else if (step === 'form' && !roleParam) {
          setStep('chooser');
        } else {
          navigate('/');
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, roleParam, inviteModalOpen, navigate]);

  function getRedirectPath(role) {
    if (nextParam) {
      try {
        const decoded = decodeURIComponent(nextParam);
        if (decoded.startsWith('/') && !decoded.startsWith('//')) {
          const isClientRoute = decoded.startsWith('/client');
          if (role === 'client' && isClientRoute) {
            return decoded;
          }
          if (role === 'assistant' && !isClientRoute) {
            return decoded;
          }
        }
      } catch {
        // Ignore malformed next param
      }
    }
    return role === 'client' ? '/client' : '/assistant/today';
  }

  function handleSelectRole(role) {
    setChosenRole(role);
    setStep('form');
    setError(null);
    setMismatchNotice(null);
  }

  function handleBackToChooser() {
    setStep('chooser');
    setChosenRole(null);
    setError(null);
    setMismatchNotice(null);
    if (roleParam) {
      searchParams.delete('role');
      setSearchParams(searchParams, { replace: true });
    }
  }

  function validateEmail(val) {
    if (!val) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  }

  function validatePassword(val) {
    if (!val) {
      setPasswordError('Password is required');
      return false;
    }
    setPasswordError('');
    return true;
  }

  async function handleStandardLogin(e) {
    e.preventDefault();
    setError(null);
    setMismatchNotice(null);

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    try {
      const res = await login(email, password, chosenRole);
      const userRole = res.data?.user?.role;
      navigate(getRedirectPath(userRole), { replace: true });
    } catch (err) {
      // Role mismatch: credentials valid, but chosen role doesn't match account role
      if (err.code === 'ROLE_MISMATCH' || err.status === 400 && err.message?.includes('account')) {
        const actualRole = err.actualRole || (chosenRole === 'assistant' ? 'client' : 'assistant');
        const roleMsg = err.message || `That account is a ${actualRole} account. Choose 'I\\'m a ${actualRole}'.`;
        setMismatchNotice(roleMsg);
        setChosenRole(actualRole);
        toast.info(roleMsg);
      } else {
        // Invariant: Generic error message on bad credentials (zero user enumeration)
        const msg =
          err.code === 'INVALID_CREDENTIALS' || err.status === 401
            ? 'Incorrect email or password'
            : err.message || 'Login failed. Please check credentials.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoAssistant() {
    setError(null);
    setMismatchNotice(null);
    setLoading(true);
    try {
      const res = await demoLogin('assistant');
      const userRole = res.data?.user?.role || 'assistant';
      toast.success('Signed in as Assistant Maya Lin');
      navigate(getRedirectPath(userRole), { replace: true });
    } catch (err) {
      setError(err.message || 'Demo initialization failed');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function fillCredentials(fillEmail, fillPassword) {
    setEmail(fillEmail);
    setPassword(fillPassword);
    setEmailError('');
    setPasswordError('');
    toast.info(`Filled credentials for ${fillEmail}`);
  }

  function handleOpenInvite() {
    if (!inviteInput.trim()) return;
    const clean = inviteInput.trim();
    if (clean.includes('/invite/')) {
      const parts = clean.split('/invite/');
      navigate(`/invite/${parts[1]}`);
    } else {
      navigate(`/invite/${clean}`);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-8 sm:py-12 select-none relative">
      {/* Background radial warmth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-100/30 via-transparent to-transparent pointer-events-none" />

      {/* Main Centered Sheet / Modal Container */}
      <div className="w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Floating Top Brand or Back Controls */}
        <div className="flex items-center justify-between mb-6 px-1">
          <Link
            to="/"
            className="flex items-center gap-2 group hover:opacity-90 transition cursor-pointer"
            title="Daybook Mail — Return to home"
          >
            <div className="h-8 w-8 rounded-xl bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-sm shadow-soft group-hover:scale-105 transition-transform">
              D
            </div>
            <span className="font-serif font-bold text-ink-900 text-base tracking-tight">
              Daybook Mail
            </span>
          </Link>

          <button
            onClick={() => navigate('/')}
            className="h-8 w-8 rounded-full border border-black/[0.08] bg-white hover:bg-ink-100 flex items-center justify-center text-ink-500 hover:text-ink-900 transition cursor-pointer"
            title="Close (ESC)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Window Card */}
        <div className="bg-white border border-black/[0.08] rounded-3xl p-6 sm:p-9 shadow-card hover:shadow-card-hover transition-shadow relative overflow-hidden">
          {/* STEP 1: ROLE CHOOSER */}
          {step === 'chooser' ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-1.5 pb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink-50 border border-black/[0.06] text-ink-700 text-xs font-semibold mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span>Welcome to Daybook Mail</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink-900 tracking-tight">
                  How are you signing in?
                </h1>
                <p className="text-xs text-ink-500 max-w-sm mx-auto leading-relaxed">
                  Select your role to access your personalized workspace and tools.
                </p>
              </div>

              {/* Two Choice Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assistant Card */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('assistant')}
                  className="group p-5 rounded-2xl border-2 border-black/[0.08] hover:border-ink-900 bg-[#FAF8F5]/60 hover:bg-white text-left transition-all duration-200 cursor-pointer active:scale-98 shadow-2xs hover:shadow-soft flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-ink-900"
                >
                  <div className="space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-serif font-bold text-ink-900 group-hover:text-teal-900 transition-colors">
                        I'm an assistant
                      </h2>
                      <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                        Manage clients' inboxes, oversee autonomous agents, and draft approvals.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center gap-1 text-xs font-semibold text-teal-800 group-hover:text-ink-900">
                    <span>Sign in as Assistant</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* Client Card */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('client')}
                  className="group p-5 rounded-2xl border-2 border-black/[0.08] hover:border-accent bg-[#FAF8F5]/60 hover:bg-white text-left transition-all duration-200 cursor-pointer active:scale-98 shadow-2xs hover:shadow-soft flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <div className="space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-[#FDF2E9] border border-amber-200/80 text-accent flex items-center justify-center group-hover:scale-105 transition-transform">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-serif font-bold text-ink-900 group-hover:text-accent transition-colors">
                        I'm a client
                      </h2>
                      <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                        See decisions that need you. Zero email noise, 1-tap approvals.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center gap-1 text-xs font-semibold text-accent group-hover:text-ink-900">
                    <span>Sign in as Client</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Demo Mode Instant Access Banner (Assistant only) */}
              {demoMode && (
                <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-ink-600">
                      Exploring the prototype? Jump straight in as Maya Lin.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoAssistant}
                    disabled={loading}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-ink-900 text-white font-semibold hover:bg-ink-800 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Booting...' : '1-Click Assistant Demo'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: LOGIN FORM FOR CHOSEN ROLE */
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Back to Chooser + Role Badge */}
              <div className="flex items-center justify-between pb-1 border-b border-black/[0.06]">
                <button
                  type="button"
                  onClick={handleBackToChooser}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 hover:text-ink-900 transition cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Choose another role</span>
                </button>

                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    chosenRole === 'assistant'
                      ? 'bg-teal-50 text-teal-800 border border-teal-200/60'
                      : 'bg-amber-50 text-amber-900 border border-amber-200/60'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      chosenRole === 'assistant' ? 'bg-teal-600' : 'bg-amber-600'
                    }`}
                  />
                  <span>{chosenRole === 'assistant' ? 'Assistant Sign In' : 'Client Sign In'}</span>
                </div>
              </div>

              {/* Friendly Role Mismatch Banner */}
              {mismatchNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium animate-in fade-in">
                  {mismatchNotice}
                </div>
              )}

              {/* Generic Error Banner */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium animate-in fade-in">
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
                      disabled={loading}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) validateEmail(e.target.value);
                      }}
                      onBlur={(e) => validateEmail(e.target.value)}
                      placeholder={
                        chosenRole === 'assistant'
                          ? 'maya@vortexdynamics.com'
                          : 'priya@vortexdynamics.com'
                      }
                      className={`w-full pl-10 pr-3.5 py-2.5 text-xs bg-ink-50/60 border ${
                        emailError
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-borderMuted focus:ring-accent/20'
                      } rounded-xl focus:outline-none focus:ring-2 font-medium disabled:opacity-50`}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium">{emailError}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-ink-700 tracking-tight">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-[11px] text-accent font-medium hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) validatePassword(e.target.value);
                      }}
                      onBlur={(e) => validatePassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 text-xs bg-ink-50/60 border ${
                        passwordError
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-borderMuted focus:ring-accent/20'
                      } rounded-xl focus:outline-none focus:ring-2 font-medium disabled:opacity-50`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 p-1 text-ink-400 hover:text-ink-700 transition cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium">{passwordError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-ink-900 hover:bg-ink-800 text-white rounded-full text-xs font-semibold transition-all shadow-soft flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{loading ? 'Authenticating...' : `Sign in as ${chosenRole === 'assistant' ? 'Assistant' : 'Client'}`}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              {/* Role-Specific Secondary Actions */}
              {chosenRole === 'assistant' ? (
                /* Assistant: Signup link + Try Demo Workspace button */
                <div className="space-y-4 pt-2 border-t border-black/[0.05]">
                  {demoMode && (
                    <button
                      type="button"
                      onClick={handleDemoAssistant}
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-full border border-black/[0.1] bg-[#FAF8F5] hover:bg-white text-ink-800 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      <span>Try the demo workspace (Maya Lin)</span>
                    </button>
                  )}

                  <div className="text-center text-xs text-ink-500">
                    <span>Don't have an assistant workspace? </span>
                    <Link to="/signup" className="text-accent font-semibold hover:underline">
                      Create assistant account
                    </Link>
                  </div>
                </div>
              ) : (
                /* Client: NO signup, Invitation helper text and link */
                <div className="space-y-3 pt-2 border-t border-black/[0.05] text-center">
                  <p className="text-xs text-ink-500 leading-relaxed">
                    Clients join by invitation from their assistant.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline cursor-pointer"
                  >
                    <span>Have an invite? Open your link</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* DEMO ACCOUNTS CARD FOR CHOSEN ROLE (Only when demoMode is active) */}
              {demoMode && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-black/[0.05] space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-ink-800">
                    <span>{chosenRole === 'assistant' ? 'Demo Assistant Account' : 'Demo Executive Account'}</span>
                    <button
                      type="button"
                      onClick={() =>
                        fillCredentials(
                          chosenRole === 'assistant' ? 'maya@vortexdynamics.com' : 'priya@vortexdynamics.com',
                          'password123'
                        )
                      }
                      className="text-[11px] text-accent font-semibold hover:underline cursor-pointer"
                    >
                      Fill
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-ink-600 font-mono text-[11px]">
                    <span>
                      {chosenRole === 'assistant'
                        ? 'maya@vortexdynamics.com'
                        : 'priya@vortexdynamics.com'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          chosenRole === 'assistant' ? 'maya@vortexdynamics.com' : 'priya@vortexdynamics.com',
                          'email-copy'
                        )
                      }
                      className="p-1 hover:bg-ink-100 rounded transition text-ink-400 hover:text-ink-700 cursor-pointer"
                      title="Copy email"
                    >
                      {copiedKey === 'email-copy' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-ink-500 font-mono text-[11px]">
                    <span>Password: password123</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('password123', 'pass-copy')}
                      className="p-1 hover:bg-ink-100 rounded transition text-ink-400 hover:text-ink-700 cursor-pointer"
                      title="Copy password"
                    >
                      {copiedKey === 'pass-copy' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Helper Dialog Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-black/10 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-ink-900">
                Client Invite Link
              </h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 text-ink-400 hover:text-ink-900 rounded-full cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-ink-600 leading-relaxed">
              If your assistant invited you to Daybook Mail, paste your invite link or token here:
            </p>
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="https://.../invite/token or token"
              className="w-full px-3.5 py-2.5 text-xs bg-ink-50 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-ink-500 hover:text-ink-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenInvite}
                disabled={!inviteInput.trim()}
                className="px-4 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Open Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}