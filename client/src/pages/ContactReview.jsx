import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Eye,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import CardPreview from '../components/CardPreview';
import ContactForm from '../components/ContactForm';
import DuplicateWarning from '../components/DuplicateWarning';
import { contactService } from '../services/contactService';

export default function ContactReview() {
  const location = useLocation();
  const navigate = useNavigate();

  const stateData = location.state;
  const extractedData = stateData?.extractedData;
  const frontPreview = stateData?.frontPreview;
  const backPreview = stateData?.backPreview;

  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    designation: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    notes: '',
  });

  const [rawOcrText, setRawOcrText] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Duplicate warning modal state
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  useEffect(() => {
    if (!extractedData) {
      // If accessed directly without scan data, redirect to scanner
      navigate('/scanner');
      return;
    }

    if (extractedData.extractedFields) {
      setFormData((prev) => ({
        ...prev,
        ...extractedData.extractedFields,
      }));
    }

    if (extractedData.rawText) {
      setRawOcrText(extractedData.rawText);
    }

    if (extractedData.uploadedImages) {
      setUploadedImages(extractedData.uploadedImages);
    }
  }, [extractedData, navigate]);

  const validate = () => {
    const errors = {};
    if (!formData.fullName || !formData.fullName.trim()) {
      errors.fullName = 'Full Name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAttempt = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      // Check duplicates first
      const dupRes = await contactService.checkDuplicate({
        fullName: formData.fullName,
        company: formData.company,
        phone: formData.phone,
        email: formData.email,
      });

      if (dupRes?.data?.isDuplicate && dupRes.data.duplicates?.length > 0) {
        setDuplicateMatches(dupRes.data.duplicates);
        setIsDuplicateModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      // Proceed directly if no duplicates found
      await commitContactSave();
    } catch (err) {
      console.error('Error during pre-save validation', err);
      setIsSubmitting(false);
    }
  };

  const commitContactSave = async () => {
    try {
      setIsSubmitting(true);

      const frontImg = uploadedImages.find((img) => img.side === 'FRONT');
      const backImg = uploadedImages.find((img) => img.side === 'BACK');

      const payload = {
        ...formData,
        frontImagePublicId: frontImg?.publicId || null,
        frontImageSecureUrl: frontImg?.secureUrl || null,
        backImagePublicId: backImg?.publicId || null,
        backImageSecureUrl: backImg?.secureUrl || null,
        originalOcrText: rawOcrText,
      };

      await contactService.createContact(payload);
      navigate('/contacts', { state: { successMessage: 'Contact saved and enqueued for Google Sheets sync!' } });
    } catch (err) {
      console.error('Failed to save contact', err);
      const msg = err.response?.data?.message || err.message || 'Error saving contact';
      alert(msg);
    } finally {
      setIsSubmitting(false);
      setIsDuplicateModalOpen(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => navigate('/scanner')}
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '12px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Scanner</span>
        </button>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
          Review & Confirm Extracted Contact
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
          Verify and edit the fields recognized from the card. The original card photo is displayed on the left.
        </p>
      </div>

      {/* Split Review Layout */}
      <div className="review-grid">
        {/* Left: Original Card Preview & Raw OCR Text */}
        <div className="card-preview-panel">
          <CardPreview
            frontUrl={frontPreview || uploadedImages.find((i) => i.side === 'FRONT')?.secureUrl}
            backUrl={backPreview || uploadedImages.find((i) => i.side === 'BACK')?.secureUrl}
            title="Card Image Preview"
          />

          {/* Raw OCR Text Collapsible Box */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div
              onClick={() => setShowRawOcr(!showRawOcr)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                  Raw OCR Text Recognized ({rawOcrText.length} characters)
                </span>
              </div>
              {showRawOcr ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {showRawOcr && (
              <pre
                style={{
                  marginTop: '14px',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#334155',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {rawOcrText || 'No text extracted'}
              </pre>
            )}
          </div>
        </div>

        {/* Right: Editable Contact Form */}
        <div className="card">
          <ContactForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleSaveAttempt}
            isSubmitting={isSubmitting}
            submitLabel="Save Contact & Sync"
            errors={formErrors}
          />
        </div>
      </div>

      {/* Duplicate Warning Dialog */}
      <DuplicateWarning
        isOpen={isDuplicateModalOpen}
        duplicates={duplicateMatches}
        onProceed={commitContactSave}
        onCancel={() => setIsDuplicateModalOpen(false)}
      />
    </div>
  );
}

