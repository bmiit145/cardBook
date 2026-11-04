const fs = require('fs');
const path = require('path');
const { scoreOcrQuality } = require('../src/services/ocrService');
const extractionService = require('../src/services/extractionService');

const cache = JSON.parse(fs.readFileSync('D:/Spirit-Harmish/visiting card/server/data/examples_dataset/ocr_cache.json', 'utf8'));

let lowScoreCount = 0;
let zeroNameCount = 0;
let zeroPhoneCount = 0;
let zeroCompanyCount = 0;

const analysis = [];

for (const [filename, item] of Object.entries(cache)) {
  const text = item.rawText || '';
  const score = scoreOcrQuality(text);
  const extracted = extractionService.extractContactFromText(text);

  if (score < 40) lowScoreCount++;
  if (!extracted.fullName) zeroNameCount++;
  if (!extracted.phone) zeroPhoneCount++;
  if (!extracted.company) zeroCompanyCount++;

  analysis.push({
    filename,
    score,
    textLength: text.length,
    hasPhone: !!extracted.phone,
    hasName: !!extracted.fullName,
    hasCompany: !!extracted.company,
    hasAddress: !!extracted.address,
    fullName: extracted.fullName,
    company: extracted.company,
    phone: extracted.phone,
    city: extracted.city,
    state: extracted.state,
    sampleText: text.replace(/\s+/g, ' ').substring(0, 100)
  });
}

console.log('Total analyzed:', analysis.length);
console.log('Low OCR Score (< 40):', lowScoreCount);
console.log('Missing Full Name:', zeroNameCount);
console.log('Missing Phone:', zeroPhoneCount);
console.log('Missing Company:', zeroCompanyCount);

const lowCards = analysis.filter(a => a.score < 40 || !a.hasName || !a.hasCompany || !a.hasPhone);
console.log('\nCards needing review/rotation/training:', lowCards.length);
fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/8fcf633b-81ba-49fe-957f-8eb215e4855b/scratch/analysis_report.json', JSON.stringify(analysis, null, 2));
fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/8fcf633b-81ba-49fe-957f-8eb215e4855b/scratch/low_cards.json', JSON.stringify(lowCards, null, 2));

