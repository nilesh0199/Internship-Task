import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Mail, Lock, User, Building, Sparkles } from 'lucide-react';

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    clientName: 'Priya Sharma',
    clientEmail: 'priya@vortexdynamics.com',
    company: 'Vortex Dynamics',
    role: 'assistant',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(formData);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/[0.06] shadow-2xs text-ink-700 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Assistant Workspace Setup</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-ink-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">
            Empower your executive with clear, high-trust decision queues
          </p>
        </div>

        <div className="bg-white border border-black/[0.06] rounded-3xl p-8 md:p-10 shadow-card">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 select-text">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1 tracking-tight">
                Your Full Name (Assistant)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Maya Lin"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1 tracking-tight">
                Your Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-borderMuted/60">
              <h2 className="text-xs font-bold text-ink-900 mb-3 uppercase tracking-wider">
                Client Boss Profile
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1 tracking-tight">
                    Client Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Priya Sharma"
                    className="w-full px-3.5 py-2.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1 tracking-tight">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3 h-4 w-4 text-ink-400" />
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Vortex Dynamics"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-ink-50/60 border border-borderMuted rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-ink-900 hover:bg-ink-800 text-white rounded-full text-xs font-semibold transition-all shadow-soft cursor-pointer mt-2 active:scale-95"
            >
              {loading ? 'Creating workspace...' : 'Start Guided Onboarding'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-ink-500">
            Already have an account?{' '}
            <Link to="/login" className="text-accent font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
