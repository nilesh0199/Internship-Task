import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../features/auth/AuthContext.jsx';
import { Login } from '../pages/Login.jsx';
import { Signup } from '../pages/Signup.jsx';
import { Onboarding } from '../pages/Onboarding.jsx';
import { RoleSwitcher } from '../components/RoleSwitcher.jsx';
import { AssistantDashboard } from '../pages/AssistantDashboard.jsx';
import { ClientQueue } from '../pages/ClientQueue.jsx';
import { AccountsPage } from '../pages/AccountsPage.jsx';
import { PrototypeHelpPopover } from '../components/PrototypeHelpPopover.jsx';
import { Landing } from '../pages/Landing.jsx';
import { AgentControlRoom } from '../pages/AgentControlRoom.jsx';

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

function RootRoute() {
  const { loading } = useAuth();
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
  return <Landing />;
}

function FloatingControls() {
  const { user } = useAuth();

  // Floating switcher & prototype disclosure available for active authenticated sessions
  if (!user) {
    return null;
  }

  return (
    <>
      <RoleSwitcher />
      <PrototypeHelpPopover />
    </>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRoute />} />
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
              <ProtectedRoute allowedRoles={['client']}>
                <ClientQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute allowedRoles={['assistant']}>
                <AgentControlRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant/agents"
            element={
              <ProtectedRoute allowedRoles={['assistant']}>
                <AgentControlRoom />
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
        <FloatingControls />
      </AuthProvider>
    </BrowserRouter>
  );
}
