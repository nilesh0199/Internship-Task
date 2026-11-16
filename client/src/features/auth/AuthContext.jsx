import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(true);

  // Check existing session and server config on boot
  useEffect(() => {
    refreshSession();
    api
      .get('/auth/status')
      .then((res) => {
        if (res?.ok && res.data?.demoMode !== undefined) {
          setDemoMode(res.data.demoMode);
        }
      })
      .catch(() => {});
  }, []);

  async function refreshSession() {
    try {
      const res = await api.get('/auth/me');
      if (res.ok && res.data?.user) {
        setUser(res.data.user);
        setClient(res.data.client || null);
      } else {
        setUser(null);
        setClient(null);
      }
    } catch {
      setUser(null);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password, expectedRole) {
    const payload = { email, password };
    if (expectedRole) payload.expectedRole = expectedRole;
    const res = await api.post('/auth/login', payload);
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      await refreshSession();
    }
    return res;
  }

  async function demoLogin(role = 'assistant') {
    setLoading(true);
    try {
      // In the new product model, 1-click demo login is only available for Assistant Maya
      const res = await api.post('/auth/demo-login', { role: 'assistant' });
      if (res.ok && res.data?.user) {
        setUser(res.data.user);
        try {
          const meRes = await api.get('/auth/me');
          if (meRes.ok && meRes.data?.user) {
            setUser(meRes.data.user);
            setClient(meRes.data.client || null);
          }
        } catch {
          // Keep user from demo login
        }
      }
      return res;
    } finally {
      setLoading(false);
    }
  }

  async function signup(payload) {
    const res = await api.post('/auth/signup', payload);
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      await refreshSession();
    }
    return res;
  }

  async function logout() {
    try {
      await api.post('/auth/logout', {});
    } finally {
      setUser(null);
      setClient(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        client,
        loading,
        demoMode,
        login,
        demoLogin,
        signup,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
