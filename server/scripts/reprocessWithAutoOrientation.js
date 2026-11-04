const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const { scoreOcrQuality } = require('../src/services/ocrService');
const extractionService = require('../src/services/extractionService');

const EXAMPLES_DIR = path.resolve(__dirname, '../../examples');
const OUTPUT_DIR = path.resolve(__dirname, '../data/examples_dataset');
const CACHE_FILE = path.join(OUTPUT_DIR, 'ocr_cache.json');
const CARDS_FILE = path.join(OUTPUT_DIR, 'cards.json');

async function reprocessCards() {
  console.log('=== MULTI-ORIENTATION REAL CARDS REPROCESSING & EXTRACTION ===');
  
  let ocrCache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      ocrCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
      ocrCache = {};
    }
  }

  const files = fs.readdirSync(EXAMPLES_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f)).sort();
  console.log(`Found ${files.length} card images in examples/`);

  // Identify files needing multi-orientation check:
  // 1. Files not in cache
  // 2. Files with OCR score < 50
  // 3. Files where extraction yielded NO phone number (almost all real business cards have a phone number)
  const filesToProcess = files.filter(f => {
    if (!ocrCache[f]) return true;
    const text = ocrCache[f].rawText || '';
    const score = scoreOcrQuality(text);
    const extracted = extractionService.extractContactFromText(text);
    return score < 50 || !extracted.phone || !extracted.fullName || !extracted.company;
  });

  console.log(`Cards requiring multi-orientation re-analysis: ${filesToProcess.length} of ${files.length}`);

  let worker = null;
  if (filesToProcess.length > 0) {
    console.log('Initializing Tesseract worker for guj+eng+hin...');
    worker = await createWorker('guj+eng+hin');
  }

  let processedCount = 0;
  for (const filename of filesToProcess) {
    processedCount++;
    const filePath = path.join(EXAMPLES_DIR, filename);
    const t0 = Date.now();

    try {
      // 1. Normalize EXIF orientation to physical pixels
      const exifBuffer = await sharp(filePath).rotate().resize(1400, null, { withoutEnlargement: true }).toBuffer();
      const meta = await sharp(exifBuffer).metadata();
      const isPortrait = meta.height > meta.width * 1.15;

      // Candidate angles based on aspect ratio
      const candidateAngles = isPortrait ? [270, 90, 0, 180] : [0, 270, 90, 180];
      
      let bestText = ocrCache[filename]?.rawText || '';
      let bestScore = scoreOcrQuality(bestText);
      let bestAngle = ocrCache[filename]?.angle || 0;

      for (const angle of candidateAngles) {
        const rotatedBuf = angle === 0 ? exifBuffer : await sharp(exifBuffer).rotate(angle).toBuffer();
        const ocrPrep = await sharp(rotatedBuf).normalize().sharpen({ sigma: 1.0, m1: 1.0, m2: 2.0 }).jpeg({ quality: 85 }).toBuffer();

        const res = await worker.recognize(ocrPrep);
        const text = res.data.text || '';
        const score = scoreOcrQuality(text);

        if (score > bestScore) {
          bestScore = score;
          bestText = text;
          bestAngle = angle;
        }

        // Fast break if high confidence business card score reached
        if (score >= 60) {
          break;
        }
      }

      ocrCache[filename] = {
        filename,
        angle: bestAngle,
        score: bestScore,
        rawText: bestText,
        extractedAt: new Date().toISOString()
      };

      const duration = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[${processedCount}/${filesToProcess.length}] ${filename}: Angle ${bestAngle}°, Score ${bestScore} (${duration}s)`);

      if (processedCount % 5 === 0) {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(ocrCache, null, 2));
      }
    } catch (err) {
      console.error(`Error on ${filename}:`, err.message);
    }
  }

  // Save updated cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(ocrCache, null, 2));

  if (worker) {
    await worker.terminate();
    console.log('Worker terminated.');
  }

  // Now run extraction on all 79 cards
  console.log('\n--- Extracting Structured Contact Fields for all cards ---');
  const allCards = [];
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const rawText = ocrCache[filename]?.rawText || '';
    const extracted = extractionService.extractContactFromText(rawText);

    allCards.push({
      id: i + 1,
      filename,
      angle: ocrCache[filename]?.angle || 0,
      score: ocrCache[filename]?.score || 0,
      rawText,
      extracted
    });
  }

  fs.writeFileSync(CARDS_FILE, JSON.stringify(allCards, null, 2));
  console.log(`Saved ${allCards.length} cards to ${CARDS_FILE}`);

  // Summary Metrics
  const withPhone = allCards.filter(c => c.extracted.phone).length;
  const withName = allCards.filter(c => c.extracted.fullName).length;
  const withCompany = allCards.filter(c => c.extracted.company).length;
  const withAddress = allCards.filter(c => c.extracted.address).length;
  const withCity = allCards.filter(c => c.extracted.city).length;
  const withEmail = allCards.filter(c => c.extracted.email).length;

  console.log('\n======================================================');
  console.log('📊 REAL DATASET EXTRACTION BENCHMARK RESULTS');
  console.log('======================================================');
  console.log(`Total Cards:   ${allCards.length}`);
  console.log(`✓ Phone:       ${withPhone}/${allCards.length} (${((withPhone/allCards.length)*100).toFixed(1)}%)`);
  console.log(`✓ Full Name:   ${withName}/${allCards.length} (${((withName/allCards.length)*100).toFixed(1)}%)`);
  console.log(`✓ Company:     ${withCompany}/${allCards.length} (${((withCompany/allCards.length)*100).toFixed(1)}%)`);
  console.log(`✓ Address:     ${withAddress}/${allCards.length} (${((withAddress/allCards.length)*100).toFixed(1)}%)`);
  console.log(`✓ City:        ${withCity}/${allCards.length} (${((withCity/allCards.length)*100).toFixed(1)}%)`);
  console.log(`✓ Email:       ${withEmail}/${allCards.length} (${((withEmail/allCards.length)*100).toFixed(1)}%)`);
  console.log('======================================================');
}

reprocessCards().catch(console.error);

