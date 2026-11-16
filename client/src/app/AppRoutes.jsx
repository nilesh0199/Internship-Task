import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../features/auth/AuthContext.jsx';
import { Login } from '../pages/Login.jsx';
import { Signup } from '../pages/Signup.jsx';
import { Onboarding } from '../pages/Onboarding.jsx';
import { RoleSwitcher } from '../components/RoleSwitcher.jsx';
import { AssistantDashboard } from '../pages/AssistantDashboard.jsx';
import { ClientQueue } from '../pages/ClientQueue.jsx';
import { AccountsPage } from '../pages/AccountsPage.jsx';
import { PrototypeHelpPopover } from '../components/PrototypeHelpPopover.jsx';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-ink-300 border-t-accent animate-spin" />
          <span className="text-xs text-ink-500">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'client' ? '/client' : '/assistant'} replace />;
  }

  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'client' ? '/client' : '/assistant'} replace />;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowedRoles={['assistant']}>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant/*"
            element={
              <ProtectedRoute allowedRoles={['assistant']}>
                <AssistantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/*"
            element={
              <ProtectedRoute allowedRoles={['client', 'assistant']}>
                <ClientQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/accounts"
            element={
              <ProtectedRoute allowedRoles={['assistant']}>
                <AccountsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <RoleSwitcher />
        <PrototypeHelpPopover />
      </AuthProvider>
    </BrowserRouter>
  );
}
