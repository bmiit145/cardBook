import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Eye,
  Database,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { integrationService } from '../services/companyService';
import { authService } from '../services/authService';

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Change Password state
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState({ message: '', error: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await integrationService.getStatus();
      if (res?.data?.status) {
        setStatus(res.data.status);
      }
    } catch (err) {
      console.error('Error fetching integration status', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ message: '', error: false });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ message: 'New passwords do not match.', error: true });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordStatus({ message: 'New password must be at least 6 characters.', error: true });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordStatus({ message: 'Admin password changed successfully!', error: false });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      setPasswordStatus({ message: msg, error: true });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Settings & System Preferences</h1>
          <p>Manage cloud sync, card recognition preferences, and account security</p>
        </div>
      </div>

      {/* Grid of Service Status */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* Cloud Database */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#007aff' }}>
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Cloud Database</h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Automatic Contact Sync</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
            Sync Status: <strong>Connected & Active</strong>
          </p>
          <span className="badge badge-success">Operational</span>
        </div>

        {/* Card Recognition OCR */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706' }}>
              <Eye size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Card Recognition</h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Smart Text Extraction</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
            Status: <strong>High Accuracy Ready</strong>
          </p>
          <span className="badge badge-success">Active</span>
        </div>

        {/* Media Vault */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
              <Cloud size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Card Media Vault</h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Encrypted Cloud Storage</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
            Storage: <strong>Backed up securely</strong>
          </p>
          <span className="badge badge-success">Connected</span>
        </div>
      </div>

      {/* Admin Security: Change Password */}
      <div className="card" style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <KeyRound size={22} style={{ color: '#2563eb' }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Admin Security Settings</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Update your administrator account password</p>
          </div>
        </div>

        {passwordStatus.message && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              backgroundColor: passwordStatus.error ? '#fef2f2' : '#ecfdf5',
              color: passwordStatus.error ? '#991b1b' : '#065f46',
              border: `1px solid ${passwordStatus.error ? '#fecaca' : '#a7f3d0'}`,
            }}
          >
            {passwordStatus.message}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password (min 6 characters)</label>
            <input
              type="password"
              className="form-input"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="btn btn-primary"
          >
            <Lock size={16} />
            <span>{isChangingPassword ? 'Updating Password...' : 'Change Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

