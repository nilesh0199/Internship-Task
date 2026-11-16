import React from 'react';
import { useAuth } from '../features/auth/AuthContext.jsx';

export function AssistantDashboard() {
  const { user, client } = useAuth();
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Assistant Workspace</h1>
      <p className="text-sm text-ink-500">Welcome, {user?.name}. Managing {client?.name}'s inbox.</p>
    </div>
  );
}
