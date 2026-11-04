import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  SwitchCamera,
  Upload,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Video,
  Radio,
} from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

export default function CameraScanner({ onCapture, label = 'Front Side' }) {
  const [useUploadMode, setUseUploadMode] = useState(false);
  const fileInputRef = useRef(null);
  const {
    videoRef,
    isCameraActive,
    isStreamStalled,
    error,
    devices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    selectCamera,
    switchCamera,
    captureFrame,
  } = useCamera();

  // Run camera once on mount or when switching modes. Clean up on unmount gracefully.
  useEffect(() => {
    let isMounted = true;
    if (!useUploadMode) {
      startCamera();
    } else {
      stopCamera(true); // User explicitly chose upload mode
    }

    return () => {
      isMounted = false;
      stopCamera(false); // Graceful delayed stop: preserves stream during sibling re-renders
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

  const activeDeviceLabel =
    devices.find((d) => d.deviceId === selectedDeviceId)?.label || 'Webcam';

  return (
    <div className="card" style={{ padding: '24px' }}>
      {/* Header bar */}
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
            Align visiting card inside the frame, or upload an image file
          </p>
        </div>

        {/* Toggle Camera vs File Upload */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setUseUploadMode(false)}
            className={`btn btn-sm ${!useUploadMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Camera size={15} />
            <span>Camera Feed</span>
          </button>
          <button
            type="button"
            onClick={() => setUseUploadMode(true)}
            className={`btn btn-sm ${useUploadMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Upload size={15} />
            <span>Upload Image File</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
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
          {/* Multiple Cameras Selector (if 2 or more cameras detected) */}
          {devices.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Video size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                Camera Source:
              </span>
              <select
                className="form-select"
                style={{ padding: '4px 10px', fontSize: '0.82rem', flex: 1 }}
                value={selectedDeviceId}
                onChange={(e) => {
                  if (e.target.value && e.target.value !== selectedDeviceId) {
                    selectCamera(e.target.value);
                  }
                }}
              >
                {devices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label} {d.isIR ? '(IR sensor)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>Camera Access Notice</h4>
              <p
                style={{
                  fontSize: '0.88rem',
                  marginBottom: '16px',
                  maxWidth: '420px',
                  margin: '0 auto 16px',
                }}
              >
                {error}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw size={14} />
                  <span>Retry Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary btn-sm"
                >
                  <Upload size={14} />
                  <span>Upload Image File Instead</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Live Viewfinder Frame */}
              <div
                className="viewfinder-box"
                style={{
                  position: 'relative',
                  minHeight: '340px',
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="viewfinder-video"
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '340px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />

                {/* Live Stream Pulse Badge */}
                {isCameraActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backdropFilter: 'blur(4px)',
                      zIndex: 10,
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        boxShadow: '0 0 8px #10b981',
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.04em' }}>
                      LIVE CAMERA
                    </span>
                  </div>
                )}

                {/* Stalled feed recovery prompt overlay */}
                {isStreamStalled && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      zIndex: 20,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                      textAlign: 'center',
                      maxWidth: '320px',
                    }}
                  >
                    <AlertCircle size={28} style={{ color: '#f59e0b' }} />
                    <div style={{ color: '#ffffff', fontSize: '0.86rem', fontWeight: 600 }}>
                      Camera feed waiting for video signal
                    </div>
                    <button
                      type="button"
                      onClick={() => startCamera(selectedDeviceId)}
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '4px' }}
                    >
                      <RefreshCw size={14} />
                      <span>Reconnect Camera Feed</span>
                    </button>
                  </div>
                )}

                <div className="card-guide-overlay">
                  <span className="card-guide-hint">Align Card Edges Within Frame</span>
                </div>
              </div>

              {/* Action Buttons: Switch Camera, Snapshot, Restart Feed, Upload File */}
              <div className="camera-actions" style={{ marginTop: '18px' }}>
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="btn btn-secondary"
                    title={`Switch Camera (Currently: ${activeDeviceLabel})`}
                    style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0 }}
                  >
                    <SwitchCamera size={20} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCapture}
                  className="btn-capture"
                  title="Click to Snapshot Card"
                  style={{ width: '68px', height: '68px' }}
                >
                  <div className="btn-capture-inner" style={{ width: '48px', height: '48px' }} />
                </button>

                <button
                  type="button"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="btn btn-secondary"
                  title="Reconnect / Refresh Camera Feed"
                  style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0 }}
                >
                  <RefreshCw size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  title="Upload Card Photo from Computer"
                  style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0 }}
                >
                  <Upload size={20} />
                </button>
              </div>

              {/* Quick instructions callout */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  color: '#64748b',
                  textAlign: 'center',
                }}
              >
                Hold your visiting card up to the camera and click the <strong>Blue Circle</strong>
                , or click{' '}
                <strong
                  style={{ color: '#2563eb', cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Image File
                </strong>{' '}
                to select a card photo directly from your computer!
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Direct File Upload Dropzone Mode */
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: '#f8fafc',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#2563eb',
            }}
          >
            <ImageIcon size={28} />
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
            Upload {label} Image
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            Drag and drop card image file here, or click to browse (JPG, PNG, WebP)
          </p>
          <button type="button" className="btn btn-primary btn-sm">
            <Upload size={14} />
            <span>Select Card File</span>
          </button>
        </div>
      )}
    </div>
  );
}
