import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // default to rear camera on mobile
  const videoRef = useRef(null);

  const startCamera = useCallback(async (mode = facingMode) => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      // Stop existing stream if running
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => console.warn('Video play error', e));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let message = 'Unable to access camera.';
      if (err.name === 'NotAllowedError') {
        message = 'Camera permission was denied. Please allow camera permissions or upload an image file.';
      } else if (err.name === 'NotFoundError') {
        message = 'No camera device found on your system. Please upload from gallery.';
      } else {
        message = err.message || message;
      }
      setError(message);
      setIsCameraActive(false);
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [stream]);

  const switchCamera = useCallback(() => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `card-capture-${Date.now()}.jpg`, {
              type: 'image/jpeg',
            });
            const previewUrl = URL.createObjectURL(blob);
            resolve({ blob, file, previewUrl });
          } else {
            resolve(null);
          }
        },
        'image/jpeg',
        0.95
      );
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    isCameraActive,
    error,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
    facingMode,
  };
}

