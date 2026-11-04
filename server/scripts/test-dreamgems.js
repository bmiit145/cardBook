const fs = require('fs');
const sharp = require('sharp');
const { getWorker } = require('../src/services/ocrService');

async function testModes() {
  const buf = fs.readFileSync('C:/Users/HP/.gemini/antigravity/brain/8fcf633b-81ba-49fe-957f-8eb215e4855b/.user_uploaded/media_1793627479706_895e886f.jpg');
  
  // Test 1: Native sharp preprocessing: grayscale + clahe + negate + sharpen
  const p1 = await sharp(buf)
    .rotate()
    .toColorspace('b-w')
    .clahe({ width: 40, height: 40, maxSlope: 3 })
    .negate()
    .sharpen({ sigma: 1.2, m1: 1, m2: 2 })
    .toBuffer();

  const worker = await getWorker();

  for (const psm of ['11', '6', '4', '3']) {
    await worker.setParameters({ tessedit_pageseg_mode: psm });
    const res = await worker.recognize(p1);
    console.log(`\n=== SHARP PREPROC PSM ${psm} (Conf: ${res.data.confidence}) ===`);
    console.log(res.data.text.trim());
  }
}

testModes().catch(console.error);
