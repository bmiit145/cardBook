import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => authService.getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (authService.isAuthenticated()) {
        try {
          const res = await authService.getMe();
          if (res?.data?.admin) {
            setAdmin(res.data.admin);
            setIsAuthenticated(true);
          }
        } catch {
          // Token expired or invalid
          setAdmin(null);
          setIsAuthenticated(false);
        }
      } else {
        setAdmin(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    }
    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res?.data?.admin) {
      setAdmin(res.data.admin);
      setIsAuthenticated(true);
    }
    return res;
  };

  const register = async (name, email, password) => {
    const res = await authService.register(name, email, password);
    if (res?.data?.admin) {
      setAdmin(res.data.admin);
      setIsAuthenticated(true);
    }
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setAdmin(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated,
        isLoading,
        login,
        register,
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

