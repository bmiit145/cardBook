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
                value={formData.country || 'India'}
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

