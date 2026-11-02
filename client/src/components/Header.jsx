import React from 'react';
import { Menu, ShieldCheck, Database, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ onMenuClick, title = 'Dashboard' }) {
  const { admin } = useAuth();

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
        {/* System Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-success" title="Admin Authenticated">
            <ShieldCheck size={13} />
            <span>Admin Active</span>
          </span>
        </div>
      </div>
    </header>
  );
}

