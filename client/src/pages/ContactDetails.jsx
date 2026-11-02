import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
} from 'lucide-react';
import CardPreview from '../components/CardPreview';
import ContactForm from '../components/ContactForm';
import { contactService } from '../services/contactService';
import { integrationService } from '../services/companyService';
import { formatDateTime } from '../utils/formatters';

export default function ContactDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const fetchContact = async () => {
    try {
      const res = await contactService.getContactById(id);
      if (res?.data?.contact) {
        setContact(res.data.contact);
      }
    } catch (err) {
      console.error('Error fetching contact', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
  }, [id]);

  const handleUpdate = async (updatedData) => {
    try {
      await contactService.updateContact(id, updatedData);
      setIsEditing(false);
      fetchContact();
    } catch (err) {
      console.error('Error updating contact', err);
      alert('Failed to update contact.');
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    try {
      const res = await integrationService.syncSingleContact(id);
      setSyncMessage(res?.message || 'Synchronized with Google Sheets successfully!');
      fetchContact();
    } catch (err) {
      setSyncMessage(err.response?.data?.message || 'Google Sheets sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to soft-delete ${contact?.fullName}?`)) {
      try {
        await contactService.deleteContact(id);
        navigate('/contacts', { state: { successMessage: 'Contact deleted successfully.' } });
      } catch (err) {
        alert('Failed to delete contact');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="content-wrapper">
        <p>Loading contact details...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="content-wrapper">
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <h3>Contact Not Found</h3>
          <button onClick={() => navigate('/contacts')} className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  const frontImage = contact.images?.find((img) => img.side === 'FRONT');
  const backImage = contact.images?.find((img) => img.side === 'BACK');
  const latestSync = contact.sheetsSyncs?.[0];

  return (
    <div className="content-wrapper">
      {/* Top Breadcrumb & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          onClick={() => navigate('/contacts')}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-secondary btn-sm"
          >
            <Edit size={15} />
            <span>{isEditing ? 'Cancel Editing' : 'Edit Contact'}</span>
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-danger btn-sm"
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            color: '#1e40af',
            fontSize: '0.88rem',
            marginBottom: '20px',
          }}
        >
          {syncMessage}
        </div>
      )}

      {/* Main Grid: Card Image vs Details */}
      <div className="review-grid">
        {/* Left Column: Original Card Images & Google Sheets Sync Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CardPreview
            frontUrl={frontImage?.secureUrl}
            backUrl={backImage?.secureUrl}
            title="Original Visiting Card Photo"
          />

          {/* Google Sheets Sync Card */}
          <div className="card" style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} style={{ color: '#0284c7' }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Google Sheets Synchronization
                </h4>
              </div>

              <span
                className={`badge ${
                  latestSync?.status === 'SYNCED'
                    ? 'badge-success'
                    : latestSync?.status === 'FAILED'
                    ? 'badge-danger'
                    : 'badge-warning'
                }`}
              >
                {latestSync?.status || 'PENDING'}
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.8 }}>
              <div>
                <strong>Sheet Row Reference:</strong>{' '}
                {latestSync?.sheetRowReference || 'Not yet allocated'}
              </div>
              <div>
                <strong>Last Attempt:</strong>{' '}
                {latestSync?.lastSyncedAt
                  ? formatDateTime(latestSync.lastSyncedAt)
                  : 'Pending worker execution'}
              </div>
              {latestSync?.lastError && (
                <div style={{ color: '#ef4444' }}>
                  <strong>Error:</strong> {latestSync.lastError}
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
              >
                <RotateCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Synchronizing...' : 'Sync to Google Sheets Now'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Details or Edit Form */}
        <div>
          {isEditing ? (
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>
                Edit Contact Details
              </h3>
              <ContactForm
                formData={{
                  fullName: contact.fullName,
                  company: contact.company?.name || '',
                  designation: contact.designation,
                  phone: contact.phone,
                  alternatePhone: contact.alternatePhone,
                  email: contact.email,
                  website: contact.website,
                  address: contact.address,
                  city: contact.city,
                  state: contact.state,
                  country: contact.country,
                  notes: contact.notes,
                }}
                onChange={() => {}}
                onSubmit={handleUpdate}
                submitLabel="Update Contact"
              />
            </div>
          ) : (
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                  {contact.fullName}
                </h1>
                {contact.designation && (
                  <p style={{ fontSize: '1rem', color: '#2563eb', fontWeight: 600 }}>
                    {contact.designation}
                  </p>
                )}
                {contact.company && (
                  <p style={{ fontSize: '0.95rem', color: '#475569', marginTop: '2px' }}>
                    {contact.company.name}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '20px',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <span className="stat-label">Mobile Number</span>
                  <p style={{ fontWeight: 600 }}>{contact.phone || '—'}</p>
                </div>
                <div>
                  <span className="stat-label">Alternate Phone</span>
                  <p style={{ fontWeight: 600 }}>{contact.alternatePhone || '—'}</p>
                </div>
                <div>
                  <span className="stat-label">Email Address</span>
                  <p style={{ fontWeight: 600 }}>{contact.email || '—'}</p>
                </div>
                <div>
                  <span className="stat-label">Website</span>
                  <p style={{ fontWeight: 600 }}>{contact.website || '—'}</p>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginBottom: '20px' }}>
                <span className="stat-label">Address</span>
                <p style={{ color: '#334155', marginTop: '4px' }}>
                  {contact.address || '—'}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  {[contact.city, contact.state, contact.country].filter(Boolean).join(', ') || '—'}
                </p>
              </div>

              {contact.notes && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <span className="stat-label">Notes & Social Links</span>
                  <p style={{ color: '#334155', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                    {contact.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

