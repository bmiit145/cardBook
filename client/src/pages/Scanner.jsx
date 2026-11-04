import React, { useState, useEffect } from 'react';
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

  // 50-Card Trained Benchmark Samples & 78 Examples Cards
  const [benchmarkCards, setBenchmarkCards] = useState([]);
  const [exampleCards, setExampleCards] = useState([]);
  const [sampleMode, setSampleMode] = useState('examples'); // 'examples' | 'benchmark'
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState('');
  const [selectedExampleId, setSelectedExampleId] = useState('');

  useEffect(() => {
    scanService.getBenchmarkCards()
      .then((res) => {
        if (res?.data) setBenchmarkCards(res.data);
      })
      .catch((err) => console.error('Failed to load benchmark cards', err));

    scanService.getExamplesCards()
      .then((res) => {
        if (res?.data) setExampleCards(res.data);
      })
      .catch((err) => console.error('Failed to load examples cards', err));
  }, []);

  const handleSelectExample = async (e) => {
    const cardId = e.target.value;
    setSelectedExampleId(cardId);
    if (!cardId) return;

    const card = exampleCards.find((c) => c.id === parseInt(cardId));
    if (!card) return;

    try {
      setIsProcessing(true);
      setError('');
      const imgUrl = `http://localhost:5000/examples-images/${card.filename}`;
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const file = new File([blob], card.filename, { type: blob.type || 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      setFrontCropped({ file, previewUrl });
      setFrontRaw({ file, previewUrl });
    } catch (err) {
      console.error('Error loading sample example card:', err);
      setError('Could not load sample card from examples');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectBenchmark = async (e) => {
    const cardId = e.target.value;
    setSelectedBenchmarkId(cardId);
    if (!cardId) return;

    const card = benchmarkCards.find((c) => c.id === parseInt(cardId));
    if (!card) return;

    try {
      setIsProcessing(true);
      setError('');
      const imgUrl = `http://localhost:5000/dataset-images/card_${String(card.id).padStart(2, '0')}.png`;
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const file = new File([blob], `card_${card.id}.png`, { type: 'image/png' });
      const previewUrl = URL.createObjectURL(blob);

      setFrontCropped({ file, previewUrl });
      setFrontRaw({ file, previewUrl });
    } catch (err) {
      console.error('Error loading sample benchmark card:', err);
      setError('Could not load sample benchmark card');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle capture of Front Side
  const handleFrontCapture = React.useCallback((file, previewUrl) => {
    setFrontRaw({ file, previewUrl });
    setIsFrontEditing(true);
  }, []);

  const handleFrontCroppedSave = React.useCallback((file, previewUrl) => {
    setFrontCropped({ file, previewUrl });
    setIsFrontEditing(false);
    if (isDoubleSided && !backCropped) {
      setActiveSide('back');
    }
  }, [isDoubleSided, backCropped]);

  // Handle capture of Back Side
  const handleBackCapture = React.useCallback((file, previewUrl) => {
    setBackRaw({ file, previewUrl });
    setIsBackEditing(true);
  }, []);

  const handleBackCroppedSave = React.useCallback((file, previewUrl) => {
    setBackCropped({ file, previewUrl });
    setIsBackEditing(false);
  }, []);

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
        const frontImgUrl = response.data?.uploadedImages?.find((i) => i.side === 'FRONT')?.secureUrl;
        const backImgUrl = response.data?.uploadedImages?.find((i) => i.side === 'BACK')?.secureUrl;

        // Navigate to review screen with extracted data and uploaded image references
        navigate('/review', {
          state: {
            extractedData: response.data,
            frontPreview: frontImgUrl || frontCropped?.previewUrl || frontRaw?.previewUrl,
            backPreview: backImgUrl || backCropped?.previewUrl || backRaw?.previewUrl,
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
          key="scanner-header-section"
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
              Capture or upload card photos. Offline Tesseract OCR (Gujarati, English &amp; Hindi) will extract contact fields locally.
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

        {/* Trained Sample Cards Quick-Tester */}
        {(exampleCards.length > 0 || benchmarkCards.length > 0) && (
          <div
            key="trained-sample-suite-section"
            style={{
              padding: '16px 20px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>🧪</span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534' }}>
                    Trained Cards Testing Suite
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                    Select any real sample card from your examples collection or the web benchmark suite.
                  </div>
                </div>
              </div>

              {/* Toggle Dataset Source */}
              <div style={{ display: 'flex', gap: '6px', background: '#dcfce7', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSampleMode('examples')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: sampleMode === 'examples' ? '#166534' : 'transparent',
                    color: sampleMode === 'examples' ? '#ffffff' : '#166534',
                  }}
                >
                  Real Examples ({exampleCards.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSampleMode('benchmark')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: sampleMode === 'benchmark' ? '#166534' : 'transparent',
                    color: sampleMode === 'benchmark' ? '#ffffff' : '#166534',
                  }}
                >
                  Benchmark Suite ({benchmarkCards.length})
                </button>
              </div>
            </div>

            {/* Selector Dropdown based on active dataset */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {sampleMode === 'examples' ? (
                <select
                  value={selectedExampleId}
                  onChange={handleSelectExample}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #86efac',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#14532d',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                    flex: 1,
                    minWidth: '280px',
                  }}
                >
                  <option value="">-- Choose Real Card from examples/ ({exampleCards.length} Cards) --</option>
                  <optgroup label="Gujarati Cards">
                    {exampleCards
                      .filter((c) => c.category === 'Gujarati')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.id} {c.title}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="English & Multilingual Cards">
                    {exampleCards
                      .filter((c) => c.category !== 'Gujarati')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.id} {c.title}
                        </option>
                      ))}
                  </optgroup>
                </select>
              ) : (
                <select
                  value={selectedBenchmarkId}
                  onChange={handleSelectBenchmark}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #86efac',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#14532d',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                    flex: 1,
                    minWidth: '280px',
                  }}
                >
                  <option value="">-- Choose Sample Card (50 Available) --</option>
                  <optgroup label="Gujarati Cards (20)">
                    {benchmarkCards
                      .filter((c) => c.category === 'Gujarati')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.id} {c.title}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="English Cards (20)">
                    {benchmarkCards
                      .filter((c) => c.category === 'English')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.id} {c.title}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Hindi Cards (10)">
                    {benchmarkCards
                      .filter((c) => c.category === 'Hindi')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.id} {c.title}
                        </option>
                      ))}
                  </optgroup>
                </select>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            key="scanner-error-section"
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
          <div key="scanner-side-tabs-section" className="side-selector">
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
            key="scanner-active-cropper"
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
            key="scanner-camera-feed"
            label={activeSide === 'front' ? 'Front Side' : 'Back Side'}
            onCapture={activeSide === 'front' ? handleFrontCapture : handleBackCapture}
          />
        ) : (
          /* Confirmed Preview Card */
          <div key="scanner-captured-preview" className="card" style={{ padding: '24px' }}>
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
                  : 'Image(s) ready. Auto-rotation and local Tesseract OCR will extract contact fields.'
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
                <span>Processing Card with Local Tesseract OCR...</span>
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

