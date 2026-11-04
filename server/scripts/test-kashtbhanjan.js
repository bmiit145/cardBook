const path = require('path');
const { extractTextFromImage } = require('../src/services/ocrService');
const { extractContactFromText } = require('../src/services/extractionService');

async function test() {
  const imgPath = 'C:/Users/HP/.gemini/antigravity/brain/8fcf633b-81ba-49fe-957f-8eb215e4855b/.user_uploaded/media_1793626864061_a76dd936.jpg';
  console.log('Running OCR on:', imgPath);
  const ocrRes = await extractTextFromImage(imgPath);
  console.log('Selected Rotation:', ocrRes.selectedRotation);
  console.log('OCR Confidence:', ocrRes.confidence);
  console.log('Raw Text:\n', ocrRes.rawText);
  const contact = extractContactFromText(ocrRes.rawText, ocrRes.confidence, { layout: ocrRes.layout });
  console.log('\nExtracted Contact:\n', JSON.stringify(contact, null, 2));
}

test().catch(console.error);

