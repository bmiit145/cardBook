import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import ContactReview from './pages/ContactReview';
import Contacts from './pages/Contacts';
import ContactDetails from './pages/ContactDetails';
import Companies from './pages/Companies';
import Settings from './pages/Settings';

import './styles/global.css';
import './styles/dashboard.css';
import './styles/scanner.css';

// Guard for protected admin routes
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          color: '#64748b',
        }}
      >
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Main Authenticated Layout
function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname === '/') return 'Admin Dashboard';
    if (pathname.startsWith('/scanner')) return 'Business Card Scanner';
    if (pathname.startsWith('/review')) return 'Extracted Contact Review';
    if (pathname === '/contacts') return 'Contacts Directory';
    if (pathname.startsWith('/contacts/')) return 'Contact Details';
    if (pathname.startsWith('/companies')) return 'Companies Directory';
    if (pathname.startsWith('/settings')) return 'Integrations & Settings';
    return 'Admin Portal';
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="main-content">
        <Header
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={getPageTitle(location.pathname)}
        />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/scanner"
            element={
              <ProtectedRoute>
                <Scanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute>
                <ContactReview />
              </ProtectedRoute>
            }
          />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetails />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

