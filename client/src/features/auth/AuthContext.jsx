import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on boot
  useEffect(() => {
    refreshSession();
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

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      await refreshSession();
    }
    return res;
  }

  async function demoLogin(role = 'assistant') {
    setLoading(true);
    const res = await api.post('/auth/demo-login', { role });
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      await refreshSession();
    }
    setLoading(false);
    return res;
  }

  async function switchRole() {
    setLoading(true);
    const res = await api.post('/auth/switch-role', {});
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      await refreshSession();
    }
    setLoading(false);
    return res;
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
        login,
        demoLogin,
        switchRole,
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
