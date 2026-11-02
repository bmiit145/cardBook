import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scan,
  RotateCw,
  Layers,
  ArrowRight,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import CameraScanner from '../components/CameraScanner';
import ImageCropper from '../components/ImageCropper';
import { scanService } from '../services/scanService';

export default function Scanner() {
  const navigate = useNavigate();

  // Mode: single-sided vs double-sided
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [activeSide, setActiveSide] = useState('front'); // 'front' | 'back'

  // Front Image States
  const [frontRaw, setFrontRaw] = useState(null); // { file, previewUrl }
  const [frontCropped, setFrontCropped] = useState(null); // { file, previewUrl }
  const [isFrontEditing, setIsFrontEditing] = useState(false);

  // Back Image States
  const [backRaw, setBackRaw] = useState(null);
  const [backCropped, setBackCropped] = useState(null);
  const [isBackEditing, setIsBackEditing] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Handle capture of Front Side
  const handleFrontCapture = (file, previewUrl) => {
    setFrontRaw({ file, previewUrl });
    setIsFrontEditing(true);
  };

  const handleFrontCroppedSave = (file, previewUrl) => {
    setFrontCropped({ file, previewUrl });
    setIsFrontEditing(false);
    // If double sided, prompt to capture back side next
    if (isDoubleSided && !backCropped) {
      setActiveSide('back');
    }
  };

  // Handle capture of Back Side
  const handleBackCapture = (file, previewUrl) => {
    setBackRaw({ file, previewUrl });
    setIsBackEditing(true);
  };

  const handleBackCroppedSave = (file, previewUrl) => {
    setBackCropped({ file, previewUrl });
    setIsBackEditing(false);
  };

  // Process Card with OCR
  const handleProcessOcr = async () => {
    if (!frontCropped && !frontRaw) {
      setError('Please capture or upload the front of the business card.');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      const formData = new FormData();
      const frontFile = frontCropped?.file || frontRaw?.file;
      formData.append('frontImage', frontFile);

      if (isDoubleSided && (backCropped?.file || backRaw?.file)) {
        const backFile = backCropped?.file || backRaw?.file;
        formData.append('backImage', backFile);
      }

      const response = await scanService.processOcr(formData);

      if (response?.data) {
        // Navigate to review screen with extracted data and uploaded image references
        navigate('/review', {
          state: {
            extractedData: response.data,
            frontPreview: frontCropped?.previewUrl || frontRaw?.previewUrl,
            backPreview: backCropped?.previewUrl || backRaw?.previewUrl,
          },
        });
      }
    } catch (err) {
      console.error('Scan error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to process card OCR';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentCropped = activeSide === 'front' ? frontCropped : backCropped;
  const isCurrentlyEditing = activeSide === 'front' ? isFrontEditing : isBackEditing;
  const currentRawUrl = activeSide === 'front' ? frontRaw?.previewUrl : backRaw?.previewUrl;

  return (
    <div className="content-wrapper">
      <div className="scanner-container">
        {/* Header & Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Business Card Scanner
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
              Capture or upload card photos. Google Vision will extract contact fields automatically.
            </p>
          </div>

          {/* Single-Sided vs Double-Sided Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
              Card Sides:
            </span>
            <div className="scanner-mode-tabs">
              <button
                type="button"
                onClick={() => {
                  setIsDoubleSided(false);
                  setActiveSide('front');
                }}
                className={`mode-tab ${!isDoubleSided ? 'active' : ''}`}
              >
                Single-Sided
              </button>
              <button
                type="button"
                onClick={() => setIsDoubleSided(true)}
                className={`mode-tab ${isDoubleSided ? 'active' : ''}`}
              >
                Double-Sided
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              color: '#991b1b',
              fontSize: '0.88rem',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Side Selector Tabs (if double-sided) */}
        {isDoubleSided && (
          <div className="side-selector">
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`side-tab-btn ${activeSide === 'front' ? 'active' : ''}`}
            >
              <span>1. Front Side</span>
              <span className={`side-badge ${frontCropped ? 'captured' : ''}`}>
                {frontCropped ? 'Ready' : 'Pending'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`side-tab-btn ${activeSide === 'back' ? 'active' : ''}`}
            >
              <span>2. Back Side</span>
              <span className={`side-badge ${backCropped ? 'captured' : ''}`}>
                {backCropped ? 'Ready' : 'Pending'}
              </span>
            </button>
          </div>
        )}

        {/* Stage 1: Camera Scanner or Image Cropper for Active Side */}
        {isCurrentlyEditing && currentRawUrl ? (
          <ImageCropper
            imageUrl={currentRawUrl}
            label={activeSide === 'front' ? 'Front Side' : 'Back Side'}
            onSave={activeSide === 'front' ? handleFrontCroppedSave : handleBackCroppedSave}
            onRetake={() => {
              if (activeSide === 'front') {
                setFrontRaw(null);
                setFrontCropped(null);
                setIsFrontEditing(false);
              } else {
                setBackRaw(null);
                setBackCropped(null);
                setIsBackEditing(false);
              }
            }}
          />
        ) : !currentCropped ? (
          <CameraScanner
            label={activeSide === 'front' ? 'Front Side' : 'Back Side'}
            onCapture={activeSide === 'front' ? handleFrontCapture : handleBackCapture}
          />
        ) : (
          /* Confirmed Preview Card */
          <div className="card" style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  {activeSide === 'front' ? 'Front Side' : 'Back Side'} Captured
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeSide === 'front') {
                    setIsFrontEditing(true);
                  } else {
                    setIsBackEditing(true);
                  }
                }}
                className="btn btn-secondary btn-sm"
              >
                <RotateCw size={14} />
                <span>Adjust / Re-crop</span>
              </button>
            </div>

            <div
              style={{
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#0f172a',
                maxHeight: '340px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={currentCropped.previewUrl}
                alt="Captured side"
                style={{
                  maxWidth: '100%',
                  maxHeight: '340px',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
        )}

        {/* Global Action Bar: Process Card */}
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            backgroundColor: '#ffffff',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              Ready to Extract Contact Data?
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {frontCropped
                ? isDoubleSided && !backCropped
                  ? 'Front card ready. Add back side or proceed with single side.'
                  : 'Image(s) ready. Sharp will optimize and Google Vision will extract contact fields.'
                : 'Please capture or upload card image first.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleProcessOcr}
            disabled={!frontCropped || isProcessing}
            className="btn btn-primary btn-lg"
          >
            {isProcessing ? (
              <>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid #ffffff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Processing Card with Vision OCR...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Process Card with OCR</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

