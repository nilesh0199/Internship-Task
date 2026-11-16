import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Sparkles, ArrowRight, Menu, X } from 'lucide-react';
import { toast } from 'sonner';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#interactive-ai', label: 'Interactive AI' },
  { href: '#security', label: 'Security & Safety' },
];

export default function LandingNav() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Track scroll position to toggle blurred background & hairline border
  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 24) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track active section for anchor links
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection('#' + entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    NAV_LINKS.forEach((item) => {
      const el = document.querySelector(item.href);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  async function handleQuickDemo() {
    setLoading(true);
    try {
      await demoLogin('assistant');
      toast.success('Signed in as Assistant Maya Lin');
      navigate('/assistant');
    } catch (err) {
      toast.error('Failed to launch demo: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FAF8F5]/85 backdrop-blur-md border-b border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-xl p-1"
        >
          <div className="h-8 w-8 rounded-xl bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-sm shadow-soft group-hover:scale-105 transition-transform">
            D
          </div>
          <span className="font-serif font-bold text-lg text-ink-900 tracking-tight whitespace-nowrap">
            Daybook Mail
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav
          aria-label="Main Navigation"
          className="hidden lg:flex items-center gap-8 text-xs font-medium text-ink-600"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                className={`relative py-1 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-md px-1 ${
                  isActive ? 'text-ink-900 font-semibold' : 'text-ink-500'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-accent rounded-full animate-in fade-in duration-200" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/login"
            className="text-xs font-semibold text-ink-700 hover:text-ink-900 min-h-[44px] px-3.5 flex items-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-full"
          >
            Sign in
          </Link>
          <button
            onClick={handleQuickDemo}
            disabled={loading}
            className="min-h-[44px] px-4 py-2 rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center gap-1.5 shadow-soft transition active:scale-[0.98] disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{loading ? 'Booting...' : 'Try the demo'}</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={handleQuickDemo}
            disabled={loading}
            className="min-h-[40px] px-3 py-1.5 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center gap-1 shadow-soft"
          >
            <Sparkles className="h-3 w-3" />
            <span>Demo</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-2 text-ink-700 hover:text-ink-900 hover:bg-black/[0.04] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF8F5]/98 backdrop-blur-lg border-b border-black/[0.08] px-4 pt-3 pb-6 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-xl text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-black/[0.03] transition"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-black/[0.05] flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-[44px] flex items-center justify-center rounded-full border border-black/[0.08] text-xs font-semibold text-ink-800 hover:bg-black/[0.02]"
            >
              Sign in
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleQuickDemo();
              }}
              disabled={loading}
              className="min-h-[44px] flex items-center justify-center gap-2 rounded-full bg-accent text-white text-xs font-semibold shadow-soft"
            >
              <Sparkles className="h-4 w-4" />
              <span>{loading ? 'Booting...' : 'Launch Live Demo as Maya'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
