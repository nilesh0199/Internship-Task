import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LandingNav() {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleQuickDemo() {
    setLoading(true);
    try {
      await loginDemo('assistant');
      toast.success('Signed in as Assistant Maya Lin');
      navigate('/assistant');
    } catch (err) {
      toast.error('Failed to launch demo: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF8F5]/85 backdrop-blur-md border-b border-black/[0.05] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-xl bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-sm shadow-soft group-hover:scale-105 transition">
            D
          </div>
          <span className="font-serif font-bold text-lg text-ink-900 tracking-tight">
            Daybook Mail
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-ink-600">
          <a href="#how-it-works" className="hover:text-ink-900 transition">
            How it works
          </a>
          <a href="#features" className="hover:text-ink-900 transition">
            Features
          </a>
          <a href="#interactive-ai" className="hover:text-ink-900 transition">
            Interactive AI
          </a>
          <a href="#security" className="hover:text-ink-900 transition">
            Security & Safety
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-xs font-semibold text-ink-700 hover:text-ink-900 px-3 py-1.5 transition"
          >
            Sign in
          </Link>
          <button
            onClick={handleQuickDemo}
            disabled={loading}
            className="px-4 py-2 rounded-full bg-accent hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-soft transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{loading ? 'Booting...' : 'Try the demo'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
