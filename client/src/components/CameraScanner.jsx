import React, { useState, useRef, useEffect } from 'react';
import { Camera, SwitchCamera, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

export default function CameraScanner({ onCapture, label = 'Front Side' }) {
  const [useUploadMode, setUseUploadMode] = useState(false);
  const fileInputRef = useRef(null);
  const {
    videoRef,
    isCameraActive,
    error,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
  } = useCamera();

  // Start camera when component mounts and not in file upload mode
  useEffect(() => {
    if (!useUploadMode) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [useUploadMode, startCamera, stopCamera]);

  const handleCapture = async () => {
    const result = await captureFrame();
    if (result && onCapture) {
      onCapture(result.file, result.previewUrl);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      onCapture(file, previewUrl);
    }
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            Capture {label}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Align visiting card inside the frame for best OCR readability
          </p>
        </div>

        {/* Toggle between Camera and Gallery Upload */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setUseUploadMode(false)}
            className={`btn btn-sm ${!useUploadMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Camera size={15} />
            <span>Camera</span>
          </button>
          <button
            onClick={() => setUseUploadMode(true)}
            className={`btn btn-sm ${useUploadMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Upload size={15} />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input with capture="environment" for native mobile camera fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!useUploadMode ? (
        <div>
          {error ? (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#991b1b',
              }}
            >
              <AlertCircle size={36} style={{ margin: '0 auto 12px', color: '#ef4444' }} />
              <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>Camera Access Required</h4>
              <p style={{ fontSize: '0.88rem', marginBottom: '16px', maxWidth: '420px', margin: '0 auto 16px' }}>
                {error}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={() => startCamera()} className="btn btn-secondary btn-sm">
                  <RefreshCw size={14} />
                  <span>Retry Camera</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm">
                  <Upload size={14} />
                  <span>Upload from Device</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Viewfinder frame */}
              <div className="viewfinder-box">
                <video ref={videoRef} autoPlay playsInline muted className="viewfinder-video" />
                <div className="card-guide-overlay">
                  <span className="card-guide-hint">Align Card Edges Within Frame</span>
                </div>
              </div>

              {/* Camera Action Buttons */}
              <div className="camera-actions">
                <button
                  type="button"
                  onClick={switchCamera}
                  className="btn btn-secondary"
                  title="Switch Camera"
                  style={{ borderRadius: '50%', width: '44px', height: '44px', padding: 0 }}
                >
                  <SwitchCamera size={20} />
                </button>

                <button
                  type="button"
                  onClick={handleCapture}
                  className="btn-capture"
                  title="Capture Card"
                >
                  <div className="btn-capture-inner" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  title="Upload from Gallery"
                  style={{ borderRadius: '50%', width: '44px', height: '44px', padding: 0 }}
                >
                  <Upload size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Direct Dropzone Upload Mode */
        <div
          className="upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="upload-icon" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            Click to upload {label} image
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Supports JPG, PNG, WebP up to 12MB
          </p>
        </div>
      )}
    </div>
  );
}

