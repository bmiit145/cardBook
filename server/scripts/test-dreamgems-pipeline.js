const fs = require('fs');
const sharp = require('sharp');
const { getWorker, parseTsvLayout } = require('../src/services/ocrService');
const { extractContactFromText } = require('../src/services/extractionService');

async function testPipeline() {
  const imgPath = 'C:/Users/HP/.gemini/antigravity/brain/8fcf633b-81ba-49fe-957f-8eb215e4855b/.user_uploaded/media_1793627479706_895e886f.jpg';
  const buf = fs.readFileSync(imgPath);

  // Apply sharp preprocessing with polar inversion for dark card
  const preproc = await sharp(buf)
    .rotate()
    .toColorspace('b-w')
    .clahe({ width: 35, height: 35, maxSlope: 3 })
    .negate()
    .sharpen({ sigma: 1.2, m1: 1, m2: 2 })
    .toBuffer();

  const worker = await getWorker();

  // Test PSM 3 and PSM 11 combined
  await worker.setParameters({ tessedit_pageseg_mode: '3' });
  const res3 = await worker.recognize(preproc, {}, { text: true, tsv: true });

  await worker.setParameters({ tessedit_pageseg_mode: '11' });
  const res11 = await worker.recognize(preproc, {}, { text: true, tsv: true });

  console.log('=== OCR TEXT (PSM 3) ===\n', res3.data.text);
  console.log('=== OCR TEXT (PSM 11) ===\n', res11.data.text);

  const combinedText = `${res3.data.text}\n${res11.data.text}`;
  const layout = parseTsvLayout(res3.data.tsv, 1024, 576);

  const contact = extractContactFromText(res3.data.text, res3.data.confidence, { layout });
  console.log('=== EXTRACTED FROM PSM 3 ===\n', JSON.stringify(contact, null, 2));

  const contactCombined = extractContactFromText(combinedText, res3.data.confidence, { layout });
  console.log('=== EXTRACTED FROM COMBINED ===\n', JSON.stringify(contactCombined, null, 2));
}

testPipeline().catch(console.error);

