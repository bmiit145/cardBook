import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
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
import { formatDateTime } from '../utils/formatters';

export default function ContactDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

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

      {/* Main Grid: Card Image vs Details */}
      <div className="review-grid">
        {/* Left Column: Original Card Images */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CardPreview
            frontUrl={frontImage?.secureUrl}
            backUrl={backImage?.secureUrl}
            title="Original Visiting Card Photo"
          />
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

