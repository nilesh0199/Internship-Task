import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import { LogOut, Mail, ChevronDown, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const isAssistant = user.role === 'assistant';

  async function handleLogout() {
    try {
      await logout();
      toast.info('Signed out of session');
      navigate('/');
    } catch (err) {
      toast.error('Logout failed: ' + (err.message || 'Unknown error'));
      navigate('/');
    }
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button: Avatar + Name + Role Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-black/[0.08] bg-white hover:bg-ink-50/80 shadow-2xs transition-all cursor-pointer active:scale-95 select-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Account & Session Settings"
      >
        <Avatar name={user.name || 'User'} email={user.email} size="xs" />
        <span className="text-xs font-semibold text-ink-900 max-w-[120px] truncate hidden sm:inline">
          {user.name}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            isAssistant
              ? 'bg-label-assistantBg text-label-assistant border-label-assistant/20'
              : 'bg-label-clientBg text-label-client border-label-client/20'
          }`}
        >
          {isAssistant ? 'Assistant' : 'Client'}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-ink-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-black/[0.08] shadow-float p-2 z-50 animate-in fade-in zoom-in-95 duration-100 select-none">
          {/* User Info Header */}
          <div className="px-3 py-2.5 border-b border-borderMuted/60">
            <div className="flex items-center gap-2.5">
              <Avatar name={user.name || 'User'} email={user.email} size="sm" />
              <div className="truncate">
                <div className="text-xs font-bold text-ink-900 truncate">
                  {user.name}
                </div>
                <div className="text-[11px] text-ink-500 font-mono truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-ink-400 font-medium">Role:</span>
              <span
                className={`font-semibold capitalize ${
                  isAssistant ? 'text-label-assistant' : 'text-label-client'
                }`}
              >
                {isAssistant ? 'Personal Assistant' : 'Executive Client'}
              </span>
            </div>
          </div>

          {/* Assistant-Specific Links */}
          <div className="py-1">
            {isAssistant && (
              <Link
                to="/settings/accounts"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink-700 hover:text-ink-900 hover:bg-ink-50 rounded-xl transition cursor-pointer font-medium"
              >
                <Mail className="h-4 w-4 text-ink-400" />
                <span>Connected Accounts</span>
              </Link>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="pt-1 border-t border-borderMuted/60">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50/70 rounded-xl transition cursor-pointer font-semibold"
            >
              <LogOut className="h-4 w-4 text-red-500" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
