import React from 'react';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { ArrowLeftRight, UserCheck, ShieldAlert } from 'lucide-react';

export function RoleSwitcher() {
  const { user, switchRole, demoLogin } = useAuth();

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur border border-borderMuted shadow-lg rounded-full px-4 py-2 text-xs font-medium text-ink-700">
        <span className="text-ink-500">Quick Test:</span>
        <button
          onClick={() => demoLogin('assistant')}
          className="px-2.5 py-1 rounded-full bg-label-assistantBg text-label-assistant font-semibold hover:opacity-80 transition"
        >
          Maya (Assistant)
        </button>
        <button
          onClick={() => demoLogin('client')}
          className="px-2.5 py-1 rounded-full bg-label-clientBg text-label-client font-semibold hover:opacity-80 transition"
        >
          Priya (Client)
        </button>
      </div>
    );
  }

  const isAssistant = user.role === 'assistant';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur border border-borderMuted shadow-lg rounded-full pl-3 pr-2 py-1.5 text-xs text-ink-700">
      <div className="flex items-center gap-1.5">
        <div
          className={`h-2 w-2 rounded-full ${
            isAssistant ? 'bg-label-assistant' : 'bg-label-client'
          }`}
        />
        <span className="font-semibold text-ink-900">
          {user.name} ({isAssistant ? 'Assistant' : 'Client'})
        </span>
      </div>

      <button
        onClick={switchRole}
        className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-ink-100 hover:bg-ink-200 text-ink-900 font-medium transition cursor-pointer"
        title="Switch between Maya and Priya"
      >
        <ArrowLeftRight className="h-3 w-3" />
        <span>Switch to {isAssistant ? 'Priya' : 'Maya'}</span>
      </button>
    </div>
  );
}
