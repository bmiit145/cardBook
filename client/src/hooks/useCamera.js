import { useState, useRef, useCallback, useEffect } from 'react';

// Persistent module-level references so camera hardware stream survives React
// component re-mounts, prop re-evaluations, and V8 garbage collection
let activeGlobalStream = null;
let activeGlobalDeviceId = null;
let teardownTimer = null;

export function useCamera() {
  const [stream, setStream] = useState(activeGlobalStream);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(Boolean(activeGlobalStream?.active));
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(activeGlobalDeviceId || '');
  const [isStreamStalled, setIsStreamStalled] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(activeGlobalStream);
  const isStartingRef = useRef(false);
  const selectedDeviceIdRef = useRef(activeGlobalDeviceId || '');
  const watchdogTimerRef = useRef(null);

  // Keep selectedDeviceIdRef in sync
  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId]);

  // Cleanly attach stream to a video element and ensure playback
  const attachStreamToVideo = useCallback((videoEl, mediaStream) => {
    if (!videoEl || !mediaStream) return;

    // Cancel any pending hardware teardown timer
    if (teardownTimer) {
      clearTimeout(teardownTimer);
      teardownTimer = null;
    }

    if (videoEl.srcObject !== mediaStream) {
      videoEl.srcObject = mediaStream;
    }

    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.playsInline = true;
    videoEl.setAttribute('playsinline', 'true');
    videoEl.setAttribute('muted', 'true');
    videoEl.setAttribute('autoplay', 'true');

    const tryPlay = () => {
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsStreamStalled(false);
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn('Video play caught:', err);
            }
          });
      }
    };

    videoEl.onpause = () => {
      if (activeGlobalStream && activeGlobalStream.active) {
        tryPlay();
      }
    };

    videoEl.onloadedmetadata = tryPlay;
    videoEl.oncanplay = tryPlay;
    videoEl.onplaying = () => setIsStreamStalled(false);

    tryPlay();

    // Watchdog to check if video frames are actually rendering
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    watchdogTimerRef.current = setTimeout(() => {
      if (videoEl && (!videoEl.videoWidth || videoEl.videoWidth === 0 || videoEl.paused)) {
        console.warn('Watchdog detected potential video stall, re-triggering play');
        tryPlay();
        if (!videoEl.videoWidth || videoEl.videoWidth === 0) {
          setIsStreamStalled(true);
        }
      }
    }, 1800);
  }, []);

  // Graceful stop tracks: if force=false, keep stream alive for 3.5s to bridge React re-renders
  const stopTracks = useCallback((force = false) => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }

    if (force) {
      if (teardownTimer) {
        clearTimeout(teardownTimer);
        teardownTimer = null;
      }
      if (activeGlobalStream) {
        activeGlobalStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        activeGlobalStream = null;
      }
      if (typeof window !== 'undefined') {
        window.__activeCameraStream = null;
      }
      if (streamRef.current) {
        streamRef.current = null;
      }
      activeGlobalDeviceId = null;
      setStream(null);
      setIsCameraActive(false);
      return;
    }

    // Graceful delayed teardown
    if (teardownTimer) clearTimeout(teardownTimer);
    teardownTimer = setTimeout(() => {
      if (activeGlobalStream) {
        activeGlobalStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        activeGlobalStream = null;
      }
      if (typeof window !== 'undefined') {
        window.__activeCameraStream = null;
      }
      streamRef.current = null;
      activeGlobalDeviceId = null;
      setStream(null);
      setIsCameraActive(false);
      teardownTimer = null;
    }, 3500);
  }, []);

  // Enumerate cameras
  const refreshDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const all = await navigator.mediaDevices.enumerateDevices();
        const vDevs = all.filter((d) => d.kind === 'videoinput');
        const formatted = vDevs.map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${idx + 1}`,
          isIR: /ir|infrared|hello/i.test(d.label),
        }));
        setDevices(formatted);
        return formatted;
      }
    } catch (e) {
      console.warn('Error enumerating cameras', e);
    }
    return [];
  }, []);

  const startCamera = useCallback(
    async (deviceIdToUse) => {
      // Cancel any pending hardware teardown
      if (teardownTimer) {
        clearTimeout(teardownTimer);
        teardownTimer = null;
      }

      if (isStartingRef.current) {
        return;
      }
      isStartingRef.current = true;
      setError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser.');
        }

        const targetId = deviceIdToUse || selectedDeviceIdRef.current;

        // Check if existing hardware stream is already live and healthy
        const isExistingStreamLive =
          activeGlobalStream &&
          activeGlobalStream.active &&
          activeGlobalStream.getVideoTracks().some((t) => t.readyState === 'live');

        // If existing stream matches target device, simply re-attach to video element
        if (isExistingStreamLive && (!targetId || targetId === activeGlobalDeviceId)) {
          streamRef.current = activeGlobalStream;
          setStream(activeGlobalStream);
          setIsCameraActive(true);
          if (videoRef.current) {
            attachStreamToVideo(videoRef.current, activeGlobalStream);
          }
          await refreshDevices();
          isStartingRef.current = false;
          return;
        }

        // Switching cameras or fresh start: stop previous tracks first
        if (activeGlobalStream) {
          activeGlobalStream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
          activeGlobalStream = null;
          // Generous pause to allow Windows camera driver to release handle
          await new Promise((resolve) => setTimeout(resolve, 80));
        }

        // Flexible constraints to avoid driver hard-faults
        const constraints = {
          video: targetId
            ? {
                deviceId: { ideal: targetId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
          audio: false,
        };

        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn('Constrained getUserMedia failed, retrying simple fallback:', err);
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        // Keep persistent reference to prevent Chrome garbage collection
        activeGlobalStream = mediaStream;
        streamRef.current = mediaStream;
        if (typeof window !== 'undefined') {
          window.__activeCameraStream = mediaStream;
        }

        // Wire track listeners to auto-recover on mute/unmute
        mediaStream.getVideoTracks().forEach((track) => {
          track.onunmute = () => {
            setIsStreamStalled(false);
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          };
          track.onmute = () => {
            console.warn('Active camera track was muted by OS/Chrome');
          };
          track.onended = () => {
            console.warn('Active camera track ended.');
          };
        });

        // Determine actual active device from stream settings
        const activeTrack = mediaStream.getVideoTracks()[0];
        const activeSettings = activeTrack?.getSettings?.();
        const resolvedDeviceId = activeSettings?.deviceId || targetId || '';
        activeGlobalDeviceId = resolvedDeviceId;

        if (resolvedDeviceId && resolvedDeviceId !== selectedDeviceIdRef.current) {
          setSelectedDeviceId(resolvedDeviceId);
          selectedDeviceIdRef.current = resolvedDeviceId;
        }

        setStream(mediaStream);
        setIsCameraActive(true);

        // Attach to video element
        if (videoRef.current) {
          attachStreamToVideo(videoRef.current, mediaStream);
        }

        // Refresh device list with populated labels now that permission is active
        const discovered = await refreshDevices();

        // If the initial device selected by OS happened to be an IR sensor, switch to color HD camera
        if (discovered.length > 1 && !deviceIdToUse) {
          const currentDevice = discovered.find((d) => d.deviceId === resolvedDeviceId);
          if (currentDevice?.isIR) {
            const colorCam =
              discovered.find((d) => !d.isIR && /wide vision|hd|webcam|integrated|front/i.test(d.label)) ||
              discovered.find((d) => !d.isIR);
            if (colorCam && colorCam.deviceId !== resolvedDeviceId) {
              isStartingRef.current = false;
              startCamera(colorCam.deviceId);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Camera access error:', err);
        let message = 'Unable to access camera.';
        if (err.name === 'NotAllowedError') {
          message = 'Camera permission was denied. Please allow camera permissions in Chrome.';
        } else if (err.name === 'NotFoundError') {
          message = 'No camera found. Please upload a card photo from your computer.';
        } else if (err.name === 'NotReadableError') {
          message =
            'Camera is currently in use by another app or system service. Please close it or upload a card image.';
        } else {
          message = err.message || message;
        }
        setError(message);
        setIsCameraActive(false);
      } finally {
        isStartingRef.current = false;
      }
    },
    [attachStreamToVideo, refreshDevices]
  );

  // Keep video element attached if videoRef renders or re-mounts
  useEffect(() => {
    if (videoRef.current && (activeGlobalStream || streamRef.current)) {
      const current = activeGlobalStream || streamRef.current;
      attachStreamToVideo(videoRef.current, current);
    }
  }, [stream, attachStreamToVideo]);

  const selectCamera = useCallback(
    (deviceId) => {
      setSelectedDeviceId(deviceId);
      selectedDeviceIdRef.current = deviceId;
      startCamera(deviceId);
    },
    [startCamera]
  );

  const switchCamera = useCallback(() => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(
        (d) => d.deviceId === (selectedDeviceIdRef.current || activeGlobalDeviceId)
      );
      const nextIndex = (currentIndex + 1) % devices.length;
      const nextId = devices[nextIndex].deviceId;
      selectCamera(nextId);
    }
  }, [devices, selectCamera]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

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

  return {
    videoRef,
    isCameraActive,
    isStreamStalled,
    error,
    devices,
    selectedDeviceId,
    startCamera,
    stopCamera: stopTracks,
    selectCamera,
    switchCamera,
    captureFrame,
  };
}
