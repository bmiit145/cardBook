const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const imageService = require('./imageService');
const logger = require('../utils/logger');

/**
 * Local offline Tesseract worker singleton
 */
let tesseractWorker = null;
let isInitializingWorker = false;
const workerInitQueue = [];

/**
 * Resolves directory where official tessdata_best traineddata files live
 */
function getTrainedDataPath() {
  const bestPath = path.resolve(__dirname, '../../tessdata_best');
  if (
    fs.existsSync(path.join(bestPath, 'eng.traineddata')) &&
    fs.existsSync(path.join(bestPath, 'guj.traineddata')) &&
    fs.existsSync(path.join(bestPath, 'hin.traineddata'))
  ) {
    return bestPath;
  }

  const serverPath = path.resolve(__dirname, '../../');
  if (fs.existsSync(path.join(serverPath, 'eng.traineddata'))) {
    return serverPath;
  }
  const rootPath = path.resolve(__dirname, '../../../');
  if (fs.existsSync(path.join(rootPath, 'eng.traineddata'))) {
    return rootPath;
  }
  return serverPath;
}

/**
 * Calls dedicated Python OCR microservice if available on local port 8000
 */
async function callPythonOcrService(imageBuffer, languages = 'eng+hin+guj', psm = 11) {
  const ocrServiceUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';
  try {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'card.jpg');
    formData.append('languages', languages);
    formData.append('psm', String(psm));
    formData.append('auto_rotate', 'true');

    const res = await fetch(`${ocrServiceUrl}/api/v1/ocr`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.text && data.text.trim().length > 10 && data.confidence > 40) {
        logger.info(`[OCR] Python microservice processed card with confidence ${data.confidence}%`);
        return data;
      }
    }
  } catch (err) {
    // Graceful fallback to local Node.js Tesseract.js
  }
  return null;
}

/**
 * Initializes and returns a cached Tesseract worker (strictly local/offline with tessdata_best)
 */
async function getWorker() {
  if (tesseractWorker) {
    return tesseractWorker;
  }

  if (isInitializingWorker) {
    return new Promise((resolve, reject) => {
      workerInitQueue.push({ resolve, reject });
    });
  }

  isInitializingWorker = true;
  try {
    const langPath = getTrainedDataPath();
    logger.info(`Initializing local offline Tesseract 5 worker with models from: ${langPath}`);
    const worker = await createWorker('guj+eng+hin', 1, {
      langPath,
      gzip: false,
    });
    tesseractWorker = worker;
    isInitializingWorker = false;
    while (workerInitQueue.length > 0) {
      workerInitQueue.shift().resolve(worker);
    }
    return worker;
  } catch (err) {
    isInitializingWorker = false;
    while (workerInitQueue.length > 0) {
      workerInitQueue.shift().reject(err);
    }
    logger.error('Failed to initialize local Tesseract worker', err);
    throw err;
  }
}

/**
 * Terminate the persistent worker (used during shutdown/tests)
 */
async function terminateWorker() {
  if (tesseractWorker) {
    try {
      await tesseractWorker.terminate();
    } catch (_) {}
    tesseractWorker = null;
  }
}

/**
 * Detect script/language of a text snippet based on Unicode character codes
 * - guj: Gujarati (\u0A80-\u0AFF)
 * - hin: Hindi / Devanagari (\u0900-\u097F)
 * - eng: Latin / English (a-zA-Z)
 * 
 * @param {string} text
 * @returns {string} Detected primary language code
 */
function detectScript(text) {
  if (!text) return 'eng';
  let gujCount = 0;
  let hinCount = 0;
  let engCount = 0;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0a80 && code <= 0x0aff) gujCount++;
    else if (code >= 0x0900 && code <= 0x097f) hinCount++;
    else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) engCount++;
  }

  if (gujCount > 0 && gujCount >= hinCount) return 'guj';
  if (hinCount > 0) return 'hin';
  return 'eng';
}

/**
 * Evaluates the quality and plausibility of OCR extracted text
 * High score indicates real upright business card text
 * Low score indicates sideways/rotated OCR gibberish (fragmented 1-3 char slices)
 * 
 * @param {string} text - Raw OCR text
 * @param {number} [confidence] - Optional Tesseract confidence
 * @returns {number} Score
 */
function scoreOcrQuality(text, confidence = 0) {
  if (!text || text.trim().length < 4) return 0;
  let score = 0;

  const trimmedLen = text.trim().length;
  if (trimmedLen < 15) {
    score -= 20;
  } else if (trimmedLen >= 60) {
    score += 25;
  }

  // 1. Phone numbers detected (+50)
  const hasPhone = /\b[6-9]\d{4}\s*\d{5}\b|\b[6-9]\d{9}\b|\+\d{1,4}[-\s]?\d{2,4}[-\s]?\d{3,4}|\(\d{3}\)\s*\d{3}[-\s]?\d{4}|\b\d{3}[-\s.]\d{3}[-\s.]\d{4}\b/i.test(text);
  if (hasPhone) {
    score += 50;
  }

  // 2. Email or Website detected (+45)
  const hasEmailOrWeb = /@|\b[a-zA-Z0-9-]+\.(?:com|in|org|net|co|io|tech|ai|ca|gov|edu)\b/i.test(text);
  if (hasEmailOrWeb) {
    score += 45;
  }

  // 3. Generic business card corporate entity, role, and address tokens (+40)
  const hasEntityTokens = /(?:\b(?:pvt|ltd|limited|llp|llc|inc|corp|services?|company|technologies|solutions|enterprises?|industries|associates|agency|studio|office|factory|complex|floor|tower|building|road|street|church|toronto|nagar|society|plaza|hub|director|manager|founder|engineer|advocate|jewelry|manufacturer|wholesalers?)\b|પ્રાઇવેટ|લિમિટેડ|ઇન્ડસ્ટ્રીઝ|એન્ટરપ્રાઇઝ|કંપની|ઓફિસ|રોડ|ચોક|નગર|સોસાયટી|ડિરેક્ટર|મેનેજર|પ્રતિષ્ઠાન|જ્વેલર્સ|प्राइवेट|लिमिटेड|उद्योग|कंपनी|सड़क|मार्ग|भवन|सोसायटी|निदेशक|प्रबंधक|मोबाइल|फोन)/i.test(text);
  if (hasEntityTokens) {
    score += 40;
  }

  // 4. Word count: count real words (3+ alphabetical or Indic characters)
  const words = text.match(/[\p{L}]{3,}/gu) || [];
  if (words.length >= 8) score += 35;
  else if (words.length >= 4) score += 20;
  else if (words.length < 2) score -= 25;

  const hasStrongSignals = hasPhone || hasEmailOrWeb || hasEntityTokens;

  // 5. Line length distribution
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const avgLen = lines.reduce((acc, l) => acc + l.length, 0) / lines.length;
    if (avgLen >= 12) score += 25;
    else if (avgLen >= 8) score += 15;
    else if (avgLen < 5 && !hasStrongSignals) score -= 35;

    // Ratio of very short noise lines (only penalize if NO strong signals are present)
    const tinyLines = lines.filter((l) => l.length <= 3);
    if (tinyLines.length / lines.length > 0.5 && !hasStrongSignals) {
      score -= 30;
    }
  }

  // 6. Add normalized confidence factor
  if (confidence > 0) {
    score += Math.round(confidence * 0.4);
  }

  return score;
}

/**
 * Parses Tesseract TSV output into a structured layout with bounding boxes, positions, and font size ratios
 * Preserves full block metadata conforming to requirement 6
 */
function parseTsvLayout(tsv, defaultWidth = 1000, defaultHeight = 600) {
  if (!tsv || typeof tsv !== 'string') {
    return { lines: [], blocks: [], words: [], pageWidth: defaultWidth, pageHeight: defaultHeight, medianHeight: 20, hasLayout: false };
  }

  let pageWidth = defaultWidth;
  let pageHeight = defaultHeight;
  const lineMap = new Map();
  const rows = tsv.split(/\r?\n/);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].trim();
    if (!row) continue;
    const cols = row.split('\t');
    if (cols.length < 11) continue;

    const level = parseInt(cols[0], 10);
    const blockNum = parseInt(cols[2], 10);
    const parNum = parseInt(cols[3], 10);
    const lineNum = parseInt(cols[4], 10);
    const wordNum = parseInt(cols[5], 10);
    const left = parseInt(cols[6], 10);
    const top = parseInt(cols[7], 10);
    const width = parseInt(cols[8], 10);
    const height = parseInt(cols[9], 10);
    const conf = parseFloat(cols[10]);
    const text = (cols[11] || '').trim();

    if (level === 1) {
      if (width > 0) pageWidth = width;
      if (height > 0) pageHeight = height;
    } else if (level === 5 && text) {
      const lineKey = `${blockNum}_${parNum}_${lineNum}`;
      if (!lineMap.has(lineKey)) {
        lineMap.set(lineKey, {
          lineKey,
          blockNum,
          parNum,
          lineNum,
          words: [],
          left: left,
          top: top,
          right: left + width,
          bottom: top + height,
          confidences: [],
        });
      }

      const l = lineMap.get(lineKey);
      l.words.push({ text, left, top, width, height, conf });
      if (!isNaN(conf) && conf >= 0) {
        l.confidences.push(conf);
      }
      l.left = Math.min(l.left, left);
      l.top = Math.min(l.top, top);
      l.right = Math.max(l.right, left + width);
      l.bottom = Math.max(l.bottom, top + height);
    }
  }

  const sortedLines = Array.from(lineMap.values())
    .map((l) => {
      const width = l.right - l.left;
      const height = l.bottom - l.top;
      const text = l.words.map((w) => w.text).join(' ');
      const avgConf = l.confidences.length
        ? Number((l.confidences.reduce((a, b) => a + b, 0) / l.confidences.length).toFixed(1))
        : 0;

      return {
        text,
        confidence: avgConf,
        bbox: {
          x: l.left,
          y: l.top,
          width,
          height,
          x0: l.left,
          y0: l.top,
          x1: l.right,
          y1: l.bottom,
        },
        language: detectScript(text),
        left: l.left,
        top: l.top,
        width,
        height,
        bottom: l.bottom,
        right: l.right,
        xRatio: pageWidth > 0 ? l.left / pageWidth : 0,
        yRatio: pageHeight > 0 ? l.top / pageHeight : 0,
        widthRatio: pageWidth > 0 ? width / pageWidth : 0,
        heightRatio: pageHeight > 0 ? height / pageHeight : 0,
        words: l.words,
        blockNum: l.blockNum,
      };
    })
    .sort((a, b) => {
      if (Math.abs(a.top - b.top) > 15) {
        return a.top - b.top;
      }
      return a.left - b.left;
    });

  // Assign reading order sequence
  sortedLines.forEach((line, idx) => {
    line.readingOrder = idx + 1;
  });

  const heights = sortedLines.map((l) => l.height).filter((h) => h > 5).sort((a, b) => a - b);
  const medianHeight = heights.length ? heights[Math.floor(heights.length / 2)] : 20;

  sortedLines.forEach((l) => {
    l.fontSizeRatio = medianHeight > 0 ? Number((l.height / medianHeight).toFixed(2)) : 1.0;
  });

  // Format blocks array conforming to Requirement 6 specification
  const blocks = sortedLines.map((l) => ({
    text: l.text,
    confidence: l.confidence,
    bbox: {
      x: l.bbox.x,
      y: l.bbox.y,
      width: l.bbox.width,
      height: l.bbox.height,
    },
    readingOrder: l.readingOrder,
    language: l.language,
  }));

  return {
    lines: sortedLines,
    blocks,
    pageWidth,
    pageHeight,
    medianHeight,
    hasLayout: sortedLines.length > 0,
  };
}

/**
 * Optical Character Recognition (OCR) Service with Adaptive Preprocessing & Multi-Orientation Recovery
 * - 100% Local and Offline with Tesseract.js (Tesseract 5) and official tessdata_best models
 * - Tested with adaptive PSM modes (PSM 11 Sparse Text + PSM 3 Auto)
 * - Auto-detects sideways or portrait orientation cards (270°, 90°, 0°, 180°)
 * - Preserves full raw text, line breaks, Unicode characters, and bounding box metadata
 * 
 * @param {Buffer} rawImageBuffer
 * @param {object} [options={}] - Optional configuration overrides (psm, forceAngle)
 * @returns {Promise<{rawText: string, confidence: number, qualityScore: number, detectedLanguages: Array, bestAngle: number, psm: string, orientedBuffer: Buffer, originalBuffer: Buffer, layout: object, blocks: Array, tsv: string, engine: string, engineVersion: string, preprocessing: object}>}
 */
async function extractTextFromImage(rawImageBuffer, options = {}) {
  // Pre-normalize EXIF orientation to physical pixels
  let exifOriented = rawImageBuffer;
  let meta = {};
  try {
    exifOriented = await sharp(rawImageBuffer).rotate().toBuffer();
    meta = await sharp(exifOriented).metadata();
  } catch (err) {
    logger.warn('Could not read image metadata with Sharp', err);
  }

  // 1. Try Python microservice first if available
  const pyResult = await callPythonOcrService(rawImageBuffer, options.languages, options.psm);
  if (pyResult && pyResult.text && pyResult.confidence > 50) {
    const layout = parseTsvLayout('', meta.width || 1000, meta.height || 600);
    return {
      rawText: pyResult.text,
      confidence: Math.round(pyResult.confidence),
      qualityScore: scoreOcrQuality(pyResult.text, pyResult.confidence),
      detectedLanguages: ['guj', 'eng', 'hin'],
      bestAngle: pyResult.selected_rotation || 0,
      psm: String(pyResult.psm || '11'),
      orientedBuffer: rawImageBuffer,
      originalBuffer: rawImageBuffer,
      layout,
      blocks: pyResult.words || [],
      tsv: '',
      engine: 'Python FastAPI (Tesseract 5 + OpenCV)',
      engineVersion: '5.0.0',
      preprocessing: { wasInverted: pyResult.was_inverted },
    };
  }

  // 2. Local Node.js Tesseract 5 engine fallback
  const isPortrait = meta.height && meta.width && meta.height > meta.width * 1.15;
  const candidateAngles = options.forceAngle !== undefined
    ? [options.forceAngle]
    : isPortrait ? [270, 90, 0, 180] : [0, 180, 270, 90];

  const worker = await getWorker();

  let bestRawText = '';
  let bestScore = -999;
  let bestConfidence = 0;
  let bestAngle = 0;
  let bestTsv = '';
  let bestPsm = '11';
  let bestPreprocSteps = [];
  let bestOrientedBuffer = rawImageBuffer;

  const candidatePsms = options.psm ? [options.psm] : ['11', '3'];

  for (const angle of candidateAngles) {
    try {
      const preproc = await imageService.preprocessForOcr(rawImageBuffer, angle);
      logger.info(`Running offline Tesseract 5 OCR (guj+eng+hin) at angle ${angle}° (isPortrait: ${isPortrait})...`);

      for (const psm of candidatePsms) {
        await worker.setParameters({
          tessedit_pageseg_mode: psm,
        });

        const tesseractResult = await worker.recognize(preproc.ocrBuffer, {}, { text: true, tsv: true });
        const recognizedText = tesseractResult?.data?.text || '';
        const confidence = Math.round(tesseractResult?.data?.confidence || 0);
        const score = scoreOcrQuality(recognizedText, confidence);
        const tsv = tesseractResult?.data?.tsv || '';

        logger.info(`OCR angle ${angle}°, PSM ${psm}: score = ${score}, confidence = ${confidence}%, characters = ${recognizedText.length}.`);

        if (score > bestScore) {
          bestScore = score;
          bestRawText = recognizedText;
          bestConfidence = confidence;
          bestAngle = angle;
          bestTsv = tsv;
          bestPsm = psm;
          bestPreprocSteps = preproc.steps || [];
          bestOrientedBuffer = preproc.ocrBuffer;
        }

        // Fast-break if excellent score achieved to reduce latency
        if (score >= 95) {
          break;
        }
      }

      if (bestScore >= 95) {
        logger.info(`High quality OCR score (${bestScore}) reached at ${angle}°. Selected.`);
        break;
      }
    } catch (localOcrErr) {
      logger.error(`Offline Tesseract OCR error at angle ${angle}`, localOcrErr);
    }
  }

  // Generate an upright oriented image buffer for storage and display preview
  let orientedBuffer = rawImageBuffer;
  if (bestAngle !== 0) {
    try {
      orientedBuffer = await sharp(exifOriented)
        .rotate(bestAngle)
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
      logger.info(`Auto-rotated image by ${bestAngle}° for upright storage and preview display.`);
    } catch (err) {
      logger.warn('Failed to rotate image for storage display', err);
    }
  }

  const metaOriented = await sharp(orientedBuffer).metadata().catch(() => ({}));
  const layout = parseTsvLayout(bestTsv, metaOriented.width || 1000, metaOriented.height || 600);

  // Compute detected languages present in the recognized text
  const detectedLanguages = [];
  if (/[\u0A80-\u0AFF]/.test(bestRawText)) detectedLanguages.push('guj');
  if (/[\u0900-\u097F]/.test(bestRawText)) detectedLanguages.push('hin');
  if (/[a-zA-Z]/.test(bestRawText) || detectedLanguages.length === 0) detectedLanguages.push('eng');

  return {
    rawText: bestRawText,
    confidence: bestConfidence,
    qualityScore: bestScore,
    detectedLanguages,
    bestAngle,
    psm: bestPsm,
    blocks: layout.blocks,
    layout,
    tsv: bestTsv,
    orientedBuffer,
    originalBuffer: rawImageBuffer,
    engine: 'Tesseract.js (Tesseract 5)',
    engineVersion: '7.0.0',
    preprocessing: {
      stepsApplied: bestPreprocSteps,
      selectedRotation: bestAngle,
      psm: bestPsm,
      modelPath: 'tessdata_best',
    },
  };
}

module.exports = {
  extractTextFromImage,
  scoreOcrQuality,
  parseTsvLayout,
  detectScript,
  getWorker,
  terminateWorker,
  getTrainedDataPath,
};
