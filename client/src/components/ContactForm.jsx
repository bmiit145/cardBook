import React from 'react';
import { User, Building, Phone, Mail, Globe, MapPin, FileText, CheckCircle2 } from 'lucide-react';
import { isValidEmail, isValidPhone } from '../utils/validators';

export default function ContactForm({
  formData,
  onChange,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save Contact',
  errors = {},
}) {
  const handleChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: Identity */}
        <div>
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.04em',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <User size={15} />
            <span>Personal & Company Information</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.fullName ? 'has-error' : ''}`}
                value={formData.fullName || ''}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="e.g. Harmish Patel"
                required
              />
              {errors.fullName && <div className="form-error">{errors.fullName}</div>}
              {formData.people && formData.people.length > 1 && (
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                  <span style={{ fontWeight: 600 }}>Detected Names: </span>
                  {formData.people.map((nm, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleChange('fullName', nm)}
                      style={{
                        margin: '2px 4px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        cursor: 'pointer',
                        fontSize: '0.76rem',
                      }}
                      title="Click to select this name"
                    >
                      {nm}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.company || ''}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="e.g. Spirit Infotech Pvt Ltd"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Designation / Title</label>
              <input
                type="text"
                className="form-input"
                value={formData.designation || ''}
                onChange={(e) => handleChange('designation', e.target.value)}
                placeholder="e.g. Chief Technology Officer"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div>
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.04em',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Phone size={15} />
            <span>Communication Details</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input
                type="tel"
                className={`form-input ${errors.phone ? 'has-error' : ''}`}
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
              {errors.phone && <div className="form-error">{errors.phone}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Alternate Phone / Landline</label>
              <input
                type="tel"
                className="form-input"
                value={formData.alternatePhone || ''}
                onChange={(e) => handleChange('alternatePhone', e.target.value)}
                placeholder="e.g. +91 261 2456789"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'has-error' : ''}`}
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. harmish@example.com"
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Website</label>
              <input
                type="text"
                className="form-input"
                value={formData.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="e.g. https://www.example.com"
              />
            </div>

            {formData.phones && formData.phones.length > 2 && (
              <div style={{ gridColumn: 'span 2', fontSize: '0.78rem', color: '#64748b' }}>
                <span style={{ fontWeight: 600 }}>All Detected Phones: </span>
                {formData.phones.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleChange('alternatePhone', p)}
                    style={{
                      margin: '2px 4px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                    }}
                    title="Click to set as alternate phone"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {formData.emails && formData.emails.length > 1 && (
              <div style={{ gridColumn: 'span 2', fontSize: '0.78rem', color: '#64748b' }}>
                <span style={{ fontWeight: 600 }}>All Detected Emails: </span>
                {formData.emails.map((em, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleChange('email', em)}
                    style={{
                      margin: '2px 4px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                    }}
                    title="Click to set as primary email"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Location */}
        <div>
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.04em',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <MapPin size={15} />
            <span>Address & Location</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Street Address / Suite</label>
              <input
                type="text"
                className="form-input"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="e.g. 402, Titanium City Center, Prahlad Nagar"
              />
              {formData.addresses && formData.addresses.length > 1 && (
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                  <span style={{ fontWeight: 600 }}>Detected Address Segments: </span>
                  {formData.addresses.map((addr, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        margin: '2px 4px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.76rem',
                      }}
                    >
                      {addr}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-input"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="e.g. Ahmedabad"
              />
            </div>

            <div className="form-group">
              <label className="form-label">State</label>
              <input
                type="text"
                className="form-input"
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="e.g. Gujarat"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <input
                type="text"
                className="form-input"
                value={formData.country || ''}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="e.g. India"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div>
          <div className="form-group">
            <label className="form-label">Notes & Social Media</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="e.g. Met at Tech Expo 2026. LinkedIn: linkedin.com/in/harmish"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: '10px' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
          >
            <CheckCircle2 size={18} />
            <span>{isSubmitting ? 'Saving Contact...' : submitLabel}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

