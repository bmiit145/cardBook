const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

/**
 * Image processing service using Sharp + OpenCV
 */

let cvAvailable = null;

/**
 * Checks whether Python and OpenCV (cv2) are available in the local environment
 */
async function checkOpenCvAvailable() {
  if (cvAvailable !== null) return cvAvailable;
  return new Promise((resolve) => {
    const proc = spawn('python', ['-c', 'import cv2, numpy; print(cv2.__version__)']);
    let out = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.on('close', (code) => {
      cvAvailable = (code === 0 && out.trim().length > 0);
      if (cvAvailable) {
        logger.info(`OpenCV accelerated preprocessing active (OpenCV ${out.trim()})`);
      } else {
        logger.info('OpenCV python module not found; using high-performance Sharp pipeline');
      }
      resolve(cvAvailable);
    });
    proc.on('error', () => {
      cvAvailable = false;
      resolve(false);
    });
  });
}

/**
 * Runs OpenCV adaptive preprocessing (boundary detection, perspective warp, deskewing, shadows)
 * 
 * @param {Buffer} inputBuffer
 * @returns {Promise<{buffer: Buffer, steps: Array<string>, isDarkTheme: boolean}|null>}
 */
async function processWithOpenCv(inputBuffer) {
  const isAvailable = await checkOpenCvAvailable();
  if (!isAvailable) return null;

  const tempDir = path.resolve(__dirname, '../../uploads/temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const timestamp = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const inPath = path.join(tempDir, `cv_in_${timestamp}.jpg`);
  const outPath = path.join(tempDir, `cv_out_${timestamp}.jpg`);

  try {
    fs.writeFileSync(inPath, inputBuffer);
    const scriptPath = path.resolve(__dirname, '../utils/cvPreprocessor.py');

    const result = await new Promise((resolve) => {
      const proc = spawn('python', [scriptPath, inPath, outPath]);
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
          try {
            const parsed = JSON.parse(stdout);
            resolve({ success: true, meta: parsed, outBuffer: fs.readFileSync(outPath) });
          } catch (_) {
            resolve({ success: true, meta: {}, outBuffer: fs.readFileSync(outPath) });
          }
        } else {
          resolve({ success: false, error: stderr });
        }
      });
      proc.on('error', (err) => resolve({ success: false, error: err.message }));
    });

    try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch (_) {}
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}

    if (result.success && result.meta?.status !== 'no_quad' && result.outBuffer) {
      return {
        buffer: result.outBuffer,
        steps: result.meta?.steps || ['opencv_preprocessed'],
        isDarkTheme: Boolean(result.meta?.isDarkTheme),
      };
    }
    return null;
  } catch (err) {
    logger.warn('Error in OpenCV preprocessor, falling back to Sharp', err);
    try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch (_) {}
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
    return null;
  }
}

/**
 * Preprocess image buffer with adaptive pipeline
 * - Auto-rotates using EXIF orientation or explicit angle (90, 180, 270)
 * - Detects card boundary and perspective distortion
 * - Corrects skew and rotation
 * - Corrects uneven lighting and shadows via CLAHE & morphological division
 * - Normalizes aspect ratio & dimensions (caps max dimension to 1800px, upscales tiny text)
 * - Detects dark background / light text polarity and inverts when beneficial
 * - Preserves original image copy
 * 
 * @param {Buffer} inputBuffer - Original image buffer
 * @param {number} angle - Additional rotation angle (0, 90, 180, 270)
 * @returns {Promise<{ocrBuffer: Buffer, originalBuffer: Buffer, metadata: object, steps: Array<string>}>}
 */
async function preprocessForOcr(inputBuffer, angle = 0) {
  const steps = [];

  try {
    // 1. Normalize EXIF orientation to physical pixels
    let exifOriented = await sharp(inputBuffer).rotate().toBuffer();
    steps.push('exif_orientation_normalized');

    if (angle && angle !== 0) {
      exifOriented = await sharp(exifOriented).rotate(angle).toBuffer();
      steps.push(`angle_rotated_${angle}deg`);
    }

    // 2. Try OpenCV adaptive perspective warp & boundary detection first
    const cvResult = await processWithOpenCv(exifOriented);
    if (cvResult && cvResult.buffer) {
      const meta = await sharp(cvResult.buffer).metadata().catch(() => ({}));
      return {
        ocrBuffer: cvResult.buffer,
        originalBuffer: inputBuffer,
        metadata: {
          width: meta.width,
          height: meta.height,
          format: meta.format,
          engine: 'opencv_adaptive',
        },
        steps: [...steps, ...cvResult.steps],
      };
    }

    // 3. High-performance native Sharp adaptive pipeline
    let pipeline = sharp(exifOriented);
    const metadata = await pipeline.metadata();

    const maxDim = 1800;
    let width = metadata.width || 1000;
    let height = metadata.height || 600;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      pipeline = pipeline.resize(width, height, { fit: 'inside', withoutEnlargement: true });
      steps.push('aspect_preserving_resize');
    } else if (width < 800 && height < 800) {
      // Upscale low-res card for better character separation
      const upscale = 1200 / Math.max(width, height);
      width = Math.round(width * upscale);
      height = Math.round(height * upscale);
      pipeline = pipeline.resize(width, height, { fit: 'inside', kernel: sharp.kernel.cubic });
      steps.push('resolution_upscaling');
    }

    // Check luminance to detect dark-background card (e.g. gold-on-black cards)
    const stats = await pipeline.stats();
    const meanLuminance = (stats.channels[0]?.mean + stats.channels[1]?.mean + stats.channels[2]?.mean) / 3;
    const isDarkCard = meanLuminance < 95;

    let ocrBuffer;
    if (isDarkCard) {
      // Invert dark card to light background for Tesseract OCR
      ocrBuffer = await pipeline
        .toColorspace('b-w')
        .clahe({ width: 32, height: 32, maxSlope: 3 })
        .negate()
        .sharpen({ sigma: 1.2, flat: 1.0, jagged: 1.5 })
        .jpeg({ quality: 95 })
        .toBuffer();
      steps.push('dark_theme_negation', 'clahe_contrast', 'adaptive_sharpening');
    } else {
      // Standard bright card: CLAHE local contrast + gentle noise removal + unsharp masking
      ocrBuffer = await pipeline
        .normalize()
        .median(3)
        .sharpen({ sigma: 1.1, flat: 1.0, jagged: 1.5 })
        .jpeg({ quality: 95 })
        .toBuffer();
      steps.push('contrast_normalization', 'median_denoise', 'adaptive_sharpening');
    }

    return {
      ocrBuffer,
      originalBuffer: inputBuffer,
      metadata: {
        width,
        height,
        format: metadata.format,
        engine: 'sharp_adaptive',
      },
      steps,
    };
  } catch (error) {
    logger.error('Sharp image processing error', error);
    return {
      ocrBuffer: inputBuffer,
      originalBuffer: inputBuffer,
      metadata: {},
      steps: ['fallback_raw'],
    };
  }
}

/**
 * Normalize and auto-orient original image for local storage
 * Maintains high resolution and clean quality while fixing orientation
 * 
 * @param {Buffer} inputBuffer
 * @returns {Promise<Buffer>}
 */
async function normalizeForStorage(inputBuffer) {
  try {
    return await sharp(inputBuffer)
      .rotate()
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  } catch (error) {
    logger.error('Error normalizing image for storage', error);
    return inputBuffer;
  }
}

module.exports = {
  preprocessForOcr,
  normalizeForStorage,
  checkOpenCvAvailable,
  processWithOpenCv,
};
