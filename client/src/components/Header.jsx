import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ShieldCheck, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ onMenuClick, title = 'Dashboard' }) {
  const { admin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onMenuClick}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
          }}
        >
          <Menu size={18} />
        </button>

        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
            {title}
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-success" title="Authenticated User">
              <ShieldCheck size={13} />
              <span>{admin?.name || admin?.email?.split('@')[0] || 'Active User'}</span>
            </span>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '6px 14px',
            }}
          >
            <LogIn size={14} />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </header>
  );
}

