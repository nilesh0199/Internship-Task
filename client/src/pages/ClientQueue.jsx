import React from 'react';
import { useAuth } from '../features/auth/AuthContext.jsx';

export function ClientQueue() {
  const { user } = useAuth();
  return (
    <div className="p-8">
      <h1 className="text-xl font-serif font-bold">Client Decision Queue</h1>
      <p className="text-sm text-ink-500">Welcome, {user?.name}. Distilled decisions.</p>
    </div>
  );
}
