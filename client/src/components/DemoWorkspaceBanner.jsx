import React from 'react';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Sparkles } from 'lucide-react';

export function DemoWorkspaceBanner() {
  const { user } = useAuth();
  if (!user) return null;

  const isDemoAccount =
    user.email === 'maya@vortexdynamics.com' ||
    user.email === 'priya@vortexdynamics.com' ||
    user.orgId === 'org_vortex_001';

  if (!isDemoAccount) return null;

  return (
    <div className="bg-amber-50/90 border-b border-amber-200/60 px-3 sm:px-4 py-1 text-[11px] sm:text-xs text-amber-800 flex items-center justify-center select-none shadow-2xs">
      <div className="flex items-center gap-1.5 font-medium tracking-tight truncate">
        <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />
        <span className="sm:hidden truncate">
          <strong>Demo:</strong> {user.name} ({user.role === 'client' ? 'Client' : 'Assistant'})
        </span>
        <span className="hidden sm:inline">
          <strong>Demo Workspace:</strong> Viewing pre-seeded data for Vortex Dynamics ({user.name} · {user.role === 'client' ? 'Client' : 'Assistant'}). Dual-window actions sync live.
        </span>
      </div>
    </div>
  );
}
