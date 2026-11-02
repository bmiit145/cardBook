import React, { useState } from 'react';
import { Eye, Layers, ZoomIn, X } from 'lucide-react';

export default function CardPreview({
  frontUrl,
  backUrl,
  title = 'Original Business Card',
}) {
  const [activeSide, setActiveSide] = useState('front');
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const currentUrl = activeSide === 'front' ? frontUrl : backUrl;

  if (!frontUrl && !backUrl) {
    return (
      <div
        className="card"
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#94a3b8',
          backgroundColor: '#f8fafc',
        }}
      >
        <Layers size={36} style={{ margin: '0 auto 10px', color: '#cbd5e1' }} />
        <p style={{ fontSize: '0.88rem' }}>No card image available</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          {title}
        </h4>

        {/* Side Toggle buttons if double-sided */}
        {backUrl && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`btn btn-sm ${activeSide === 'front' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`btn btn-sm ${activeSide === 'back' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Back
            </button>
          </div>
        )}
      </div>

      {/* Image container */}
      <div
        style={{
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '220px',
        }}
      >
        {currentUrl ? (
          <>
            <img
              src={currentUrl}
              alt={`${activeSide} business card`}
              style={{
                width: '100%',
                maxHeight: '360px',
                objectFit: 'contain',
                display: 'block',
              }}
            />

            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(4px)',
              }}
            >
              <ZoomIn size={14} />
              <span>Full View</span>
            </button>
          </>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No image for this side</p>
        )}
      </div>

      {/* Zoom Modal */}
      {isZoomOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomOpen(false)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                color: '#ffffff',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <X size={24} />
            </button>

            <img
              src={currentUrl}
              alt="Zoomed card"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

