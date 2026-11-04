const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const extractionService = require('../src/services/extractionService');

const EXAMPLES_DIR = path.resolve(__dirname, '../../examples');
const OUTPUT_DIR = path.resolve(__dirname, '../data/examples_dataset');
const CACHE_FILE = path.join(OUTPUT_DIR, 'ocr_cache.json');
const CARDS_FILE = path.join(OUTPUT_DIR, 'cards.json');

async function processAllExamples() {
  console.log('=== PROCESSING REAL CARD IMAGES FROM examples/ ===');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load existing OCR cache if available
  let ocrCache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      ocrCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      console.log(`Loaded ${Object.keys(ocrCache).length} cached OCR results.`);
    } catch {
      ocrCache = {};
    }
  }

  const files = fs
    .readdirSync(EXAMPLES_DIR)
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
    .sort();

  console.log(`Found ${files.length} card images in ${EXAMPLES_DIR}`);

  const pendingFiles = files.filter((f) => !ocrCache[f]);
  console.log(`Pending OCR: ${pendingFiles.length} files. Cached: ${files.length - pendingFiles.length} files.`);

  let worker = null;
  if (pendingFiles.length > 0) {
    console.log('Initializing Tesseract OCR worker for guj+eng+hin...');
    worker = await createWorker('guj+eng+hin');
  }

  let count = 0;
  for (const filename of files) {
    count++;
    if (ocrCache[filename]) {
      continue;
    }

    const t0 = Date.now();
    const filePath = path.join(EXAMPLES_DIR, filename);

    try {
      const ocrBuffer = await sharp(filePath)
        .rotate() // auto-orient based on EXIF tag
        .resize(1350, null, { withoutEnlargement: true })
        .normalize()
        .sharpen({ sigma: 1.0, m1: 1.0, m2: 2.0 })
        .jpeg({ quality: 85 })
        .toBuffer();

      const result = await worker.recognize(ocrBuffer);
      const rawText = result?.data?.text || '';

      ocrCache[filename] = {
        filename,
        rawText,
        extractedAt: new Date().toISOString(),
      };

      const duration = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `[${count}/${files.length}] Processed ${filename} (${duration}s, ${rawText.length} chars)`
      );

      // Periodically persist cache
      if (count % 5 === 0) {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(ocrCache, null, 2));
      }
    } catch (err) {
      console.error(`Error processing ${filename}:`, err.message);
      ocrCache[filename] = {
        filename,
        rawText: '',
        error: err.message,
      };
    }
  }

  // Final cache save
  fs.writeFileSync(CACHE_FILE, JSON.stringify(ocrCache, null, 2));

  if (worker) {
    await worker.terminate();
    console.log('Tesseract OCR worker terminated.');
  }

  // Now, run extraction service on all cards
  console.log('\n--- Extracting Structured Contact Fields using extractionService ---');
  const cards = [];

  for (let idx = 0; idx < files.length; idx++) {
    const filename = files[idx];
    const item = ocrCache[filename] || { rawText: '' };
    const rawText = item.rawText || '';

    // Extract using extractionService
    const extracted = extractionService.extractContactFromText(rawText);

    // Detect language classification
    const isGujarati = /[\u0A80-\u0AFF]/.test(rawText);
    const isHindi = /[\u0900-\u097F]/.test(rawText);
    let category = 'English';
    if (isGujarati) category = 'Gujarati';
    else if (isHindi) category = 'Hindi';

    const cardRecord = {
      id: idx + 1,
      filename,
      category,
      rawText,
      extracted,
      title:
        extracted.company ||
        extracted.fullName ||
        filename.replace(/\.[^/.]+$/, ''),
    };

    cards.push(cardRecord);
  }

  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2));
  console.log(`Saved ${cards.length} structured card records to ${CARDS_FILE}`);

  // Summary statistics
  const withPhone = cards.filter((c) => c.extracted.phone).length;
  const withEmail = cards.filter((c) => c.extracted.email).length;
  const withName = cards.filter((c) => c.extracted.fullName).length;
  const withCompany = cards.filter((c) => c.extracted.company).length;
  const withAddress = cards.filter((c) => c.extracted.address).length;
  const withCity = cards.filter((c) => c.extracted.city).length;

  console.log('\n=== INITIAL EXTRACTION BENCHMARK ===');
  console.log(`Total Cards: ${cards.length}`);
  console.log(`With Phone:    ${withPhone}/${cards.length} (${((withPhone / cards.length) * 100).toFixed(1)}%)`);
  console.log(`With Name:     ${withName}/${cards.length} (${((withName / cards.length) * 100).toFixed(1)}%)`);
  console.log(`With Company:  ${withCompany}/${cards.length} (${((withCompany / cards.length) * 100).toFixed(1)}%)`);
  console.log(`With Address:  ${withAddress}/${cards.length} (${((withAddress / cards.length) * 100).toFixed(1)}%)`);
  console.log(`With City:     ${withCity}/${cards.length} (${((withCity / cards.length) * 100).toFixed(1)}%)`);
  console.log(`With Email:    ${withEmail}/${cards.length} (${((withEmail / cards.length) * 100).toFixed(1)}%)`);
}

processAllExamples().catch(console.error);

