import React from 'react';
import { AlertTriangle, UserCheck, ArrowRight, X } from 'lucide-react';

export default function DuplicateWarning({
  duplicates = [],
  onProceed,
  onCancel,
  isOpen = false,
}) {
  if (!isOpen || duplicates.length === 0) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div
          className="modal-header"
          style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #fef3c7' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#92400e' }}>
                Possible Duplicate Contact Detected
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#b45309' }}>
                We found matching contact records already in your database.
              </p>
            </div>
          </div>
          <button onClick={onCancel} style={{ color: '#92400e' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '16px' }}>
            The following contact(s) have matching telephone numbers, email addresses, or company information:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {duplicates.map((item, idx) => {
              const c = item.contact;
              return (
                <div
                  key={c.id || idx}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px 16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                      {c.fullName}
                    </span>
                    <span className="badge badge-warning">{item.matchReason}</span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
                    {c.company?.name && <div>Company: {c.company.name}</div>}
                    {c.phone && <div>Phone: {c.phone}</div>}
                    {c.email && <div>Email: {c.email}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Go Back & Edit
          </button>
          <button type="button" onClick={onProceed} className="btn btn-primary">
            <UserCheck size={16} />
            <span>Save as New Contact Anyway</span>
          </button>
        </div>
      </div>
    </div>
  );
}

