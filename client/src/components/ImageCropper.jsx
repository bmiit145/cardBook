import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, RotateCcw, ZoomIn, ZoomOut, Check, ArrowLeft, RefreshCw } from 'lucide-react';

export default function ImageCropper({
  imageUrl,
  onSave,
  onRetake,
  label = 'Card Image',
}) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [zoom, setZoom] = useState(1);
  const [imageObj, setImageObj] = useState(null);

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImageObj(img);
    };
  }, [imageUrl]);

  // Render canvas whenever imageObj, rotation or zoom changes
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const isRotated90 = rotation === 90 || rotation === 270;
    const canvasWidth = isRotated90 ? imageObj.height : imageObj.width;
    const canvasHeight = isRotated90 ? imageObj.width : imageObj.height;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move to center of canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw image centered
    ctx.drawImage(
      imageObj,
      -imageObj.width / 2,
      -imageObj.height / 2,
      imageObj.width,
      imageObj.height
    );

    ctx.restore();
  }, [imageObj, rotation, zoom]);

  const handleRotateCw = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateCcw = () => {
    setRotation((prev) => (prev + 270) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.6));
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1);
  };

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], `processed-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          const previewUrl = URL.createObjectURL(blob);
          onSave(croppedFile, previewUrl);
        }
      },
      'image/jpeg',
      0.95
    );
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
            Adjust {label}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Rotate or zoom to align the text horizontally for accurate OCR
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="cropper-toolbar">
          <button
            type="button"
            onClick={handleRotateCcw}
            className="btn btn-secondary btn-sm"
            title="Rotate Left 90°"
          >
            <RotateCcw size={15} />
            <span>-90°</span>
          </button>
          <button
            type="button"
            onClick={handleRotateCw}
            className="btn btn-secondary btn-sm"
            title="Rotate Right 90°"
          >
            <RotateCw size={15} />
            <span>+90°</span>
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="btn btn-secondary btn-sm"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="btn btn-secondary btn-sm"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary btn-sm"
            title="Reset adjustments"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Canvas preview */}
      <div className="canvas-preview-wrapper" style={{ margin: '0 auto' }}>
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '440px',
            display: 'block',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button type="button" onClick={onRetake} className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Retake / Choose Another</span>
        </button>

        <button type="button" onClick={handleConfirm} className="btn btn-primary">
          <Check size={16} />
          <span>Confirm {label}</span>
        </button>
      </div>
    </div>
  );
}

