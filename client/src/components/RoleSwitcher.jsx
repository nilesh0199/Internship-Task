import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { ArrowLeftRight, LogOut, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function RoleSwitcher() {
  const { user, switchRole, demoLogin, logout } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  async function handleSwitch(targetRole) {
    if (switching) return;
    setSwitching(true);
    try {
      const res = await switchRole(targetRole);
      if (res?.ok && res.data?.user) {
        const nextRole = res.data.user.role;
        toast.info(
          nextRole === 'client'
            ? 'Switched to Priya Sharma (Client Decision Queue)'
            : 'Switched to Maya Lin (Assistant Workspace)'
        );
        if (nextRole === 'client') {
          navigate('/client');
        } else {
          navigate('/assistant');
        }
      }
    } catch (err) {
      // Fallback to demoLogin so reviewers are never stranded
      try {
        const demoRes = await demoLogin(targetRole);
        if (demoRes?.ok && demoRes.data?.user) {
          const nextRole = demoRes.data.user.role;
          toast.info(
            nextRole === 'client'
              ? 'Switched to Priya Sharma (Client Decision Queue)'
              : 'Switched to Maya Lin (Assistant Workspace)'
          );
          if (nextRole === 'client') {
            navigate('/client');
          } else {
            navigate('/assistant');
          }
          return;
        }
      } catch {
        // Fallback failed as well
      }
      toast.error('Failed to switch persona: ' + (err.message || 'Unknown error'));
    } finally {
      setSwitching(false);
    }
  }

  async function handleQuickDemo(role) {
    if (switching) return;
    setSwitching(true);
    try {
      const res = await demoLogin(role);
      if (res?.ok && res.data?.user) {
        const nextRole = res.data.user.role;
        toast.success(
          nextRole === 'client'
            ? 'Logged in as Priya Sharma (Client Decision Queue)'
            : 'Logged in as Maya Lin (Assistant Workspace)'
        );
        if (nextRole === 'client') {
          navigate('/client');
        } else {
          navigate('/assistant');
        }
      }
    } catch (err) {
      toast.error('Demo login failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSwitching(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      toast.info('Logged out of demo session');
      navigate('/login');
    } catch (err) {
      toast.error('Logout failed: ' + err.message);
    }
  }

  // Logged-out state: One-click instant login buttons with direct navigation
  if (!user) {
    return (
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-black/[0.08] shadow-float rounded-full px-4 py-2 text-xs font-medium text-ink-700 select-none">
        <div className="flex items-center gap-1.5 text-ink-500 font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>Quick Test:</span>
        </div>
        <button
          disabled={switching}
          onClick={() => handleQuickDemo('assistant')}
          className="px-3 py-1.5 rounded-full bg-label-assistantBg text-label-assistant font-semibold hover:opacity-85 transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
        >
          Maya (Assistant)
        </button>
        <button
          disabled={switching}
          onClick={() => handleQuickDemo('client')}
          className="px-3 py-1.5 rounded-full bg-label-clientBg text-label-client font-semibold hover:opacity-85 transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
        >
          Priya (Client)
        </button>
      </div>
    );
  }

  const isAssistant = user.role === 'assistant';

  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-black/[0.08] shadow-float rounded-full p-1.5 text-xs text-ink-700 select-none">
      <span className="text-[11px] font-semibold text-ink-400 pl-2.5 pr-1 uppercase tracking-wider hidden sm:inline">
        Persona:
      </span>

      {/* Maya (Assistant) Button */}
      <button
        type="button"
        disabled={switching}
        onClick={() => {
          if (!isAssistant) handleSwitch('assistant');
        }}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
          isAssistant
            ? 'bg-label-assistant text-white shadow-soft'
            : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100/70'
        } ${switching ? 'opacity-60 cursor-not-allowed' : ''}`}
        title="Maya Lin — Executive Assistant Workspace"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isAssistant ? 'bg-white ring-2 ring-white/30' : 'bg-label-assistant'
          }`}
        />
        <span>Maya (Assistant)</span>
      </button>

      {/* Priya (Client) Button */}
      <button
        type="button"
        disabled={switching}
        onClick={() => {
          if (isAssistant) handleSwitch('client');
        }}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
          !isAssistant
            ? 'bg-label-client text-white shadow-soft'
            : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100/70'
        } ${switching ? 'opacity-60 cursor-not-allowed' : ''}`}
        title="Priya Sharma — Executive Client Decision Queue"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            !isAssistant ? 'bg-white ring-2 ring-white/30' : 'bg-label-client'
          }`}
        />
        <span>Priya (Client)</span>
      </button>

      {/* Quick Toggle Action */}
      <button
        type="button"
        disabled={switching}
        onClick={() => handleSwitch(isAssistant ? 'client' : 'assistant')}
        className="p-1.5 text-ink-400 hover:text-ink-900 hover:bg-ink-100 rounded-full transition cursor-pointer disabled:opacity-50 active:scale-95"
        title={isAssistant ? 'Switch to Priya Sharma' : 'Switch to Maya Lin'}
      >
        {switching ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-700" />
        ) : (
          <ArrowLeftRight className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Sign Out */}
      <button
        type="button"
        onClick={handleLogout}
        className="p-1.5 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-full transition cursor-pointer border-l border-borderMuted/80 pl-2 active:scale-95"
        title="Sign out of prototype session"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
