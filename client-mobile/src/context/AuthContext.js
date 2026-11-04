import React, { createContext, useState, useEffect, useContext } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuth() {
      try {
        const stored = await authService.getStoredAuth();
        if (stored.token) {
          setToken(stored.token);
          setAdmin(stored.admin);
        }
      } catch (err) {
        console.warn('Failed to load stored auth:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    setToken(res.token);
    setAdmin(res.admin);
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        admin,
        isAuthenticated: Boolean(token),
        loading,
        login,
        logout,
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

