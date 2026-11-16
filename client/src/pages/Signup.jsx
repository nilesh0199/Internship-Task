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
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ink-100 text-ink-700 text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Assistant Workspace Setup</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-ink-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Empower your executive with clear decision queues
          </p>
        </div>

        <div className="bg-white border border-borderMuted rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Your Full Name (Assistant)</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-500" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Maya Lin"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Your Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-ink-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="maya@company.com"
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
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-borderMuted">
              <h2 className="text-xs font-semibold text-ink-900 mb-3 uppercase tracking-wider">
                Client Boss Profile
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1">Client Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Priya Sharma"
                    className="w-full px-3 py-2 text-sm bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1">Company Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 h-4 w-4 text-ink-500" />
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Vortex Dynamics"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-borderMuted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-ink-900 hover:bg-ink-900/90 text-white rounded-lg text-sm font-medium transition cursor-pointer mt-2"
            >
              {loading ? 'Creating workspace...' : 'Start Onboarding Flow'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-ink-500">
            Already have an account?{' '}
            <Link to="/login" className="text-accent font-medium hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
