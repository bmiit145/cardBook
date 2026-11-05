import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Scan,
  Users,
  Building2,
  Settings,
  LogOut,
  CreditCard,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { admin, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Card Scanner', path: '/scanner', icon: Scan },
    { label: 'Contacts', path: '/contacts', icon: Users },
    { label: 'Companies', path: '/companies', icon: Building2 },
    { label: 'Integrations & Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside
        style={{
          width: '260px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
          transition: 'transform 0.3s ease',
          ...(window.innerWidth <= 768 && !isOpen
            ? { transform: 'translateX(-100%)', position: 'fixed' }
            : {}),
          ...(window.innerWidth <= 768 && isOpen
            ? { transform: 'translateX(0)', position: 'fixed' }
            : {}),
        }}
      >
        <div>
          {/* Logo Header */}
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CreditCard size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>CardBook</h2>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Admin Portal</span>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                style={{
                  display: window.innerWidth <= 768 ? 'block' : 'none',
                  color: '#64748b',
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Quick Scan Action */}
          <div style={{ padding: '16px 20px 8px' }}>
            <NavLink
              to="/scanner"
              onClick={onClose}
              className="btn btn-primary"
              style={{ width: '100%', textDecoration: 'none' }}
            >
              <Scan size={18} />
              <span>Scan Visiting Card</span>
            </NavLink>
          </div>

          {/* Nav Links */}
          <nav style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onClose}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: isActive ? '#2563eb' : '#475569',
                      backgroundColor: isActive ? '#eff6ff' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    })}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Footer Admin Info */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
          }}
        >
          {isAuthenticated ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {(admin?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {admin?.name || 'User'}
                  </p>
                  <p
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {admin?.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-sm"
              style={{
                width: '100%',
                backgroundColor: '#0f172a',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '8px',
                textAlign: 'center',
              }}
            >
              Sign In / Register
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

