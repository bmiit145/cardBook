const path = require('path');
const fs = require('fs');
const { extractTextFromImage, terminateWorker } = require('../src/services/ocrService');

/**
 * Levenshtein distance at character level
 */
function charLevenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const aChar = a[i - 1];
    for (let j = 1; j <= n; j++) {
      if (aChar === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }
  return prev[n];
}

/**
 * Levenshtein distance at word level
 */
function wordLevenshtein(wordsA, wordsB) {
  const m = wordsA.length;
  const n = wordsB.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const wA = wordsA[i - 1];
    for (let j = 1; j <= n; j++) {
      if (wA === wordsB[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }
  return prev[n];
}

function normalizeForEval(str) {
  return (str || '')
    .replace(/CARD #\d+.*?\n/i, '')
    .replace(/[^\w\u0A80-\u0AFF\u0900-\u097F\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function runBenchmark() {
  console.log(`==================================================================`);
  console.log(`🚀 COMPREHENSIVE 50-CARD OCR BENCHMARK`);
  console.log(`Tesseract 5 + tessdata_best + Adaptive Preprocessing`);
  console.log(`==================================================================\n`);

  const cardsPath = path.resolve(__dirname, '../data/dataset_50_cards/cards.json');
  const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));

  const results = [];
  const langMetrics = {
    English: { cerList: [], werList: [], times: [] },
    Gujarati: { cerList: [], werList: [], times: [] },
    Hindi: { cerList: [], werList: [], times: [] },
  };

  const qualityMetrics = {
    standard: { cerList: [], werList: [], times: [] },
    noisy_or_rotated: { cerList: [], werList: [], times: [] },
  };

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const imgName = `card_${String(card.id).padStart(2, '0')}.png`;
    const imgPath = path.resolve(__dirname, `../data/dataset_50_cards/images/${imgName}`);

    if (!fs.existsSync(imgPath)) {
      console.warn(`Skipping missing image: ${imgPath}`);
      continue;
    }

    const imgBuffer = fs.readFileSync(imgPath);
    const t0 = Date.now();
    const ocrRes = await extractTextFromImage(imgBuffer);
    const duration = Date.now() - t0;

    const normOcr = normalizeForEval(ocrRes.rawText);
    const normTruth = normalizeForEval(card.rawOcrText);

    const ocrWords = normOcr.split(' ').filter(Boolean);
    const truthWords = normTruth.split(' ').filter(Boolean);

    const charDist = charLevenshtein(normOcr, normTruth);
    const wordDist = wordLevenshtein(ocrWords, truthWords);

    const cer = normTruth.length > 0 ? charDist / normTruth.length : 0;
    const wer = truthWords.length > 0 ? wordDist / truthWords.length : 0;

    const charAccuracy = Math.max(0, (1 - cer) * 100);
    const wordAccuracy = Math.max(0, (1 - wer) * 100);

    const lang = card.category || 'English';
    if (langMetrics[lang]) {
      langMetrics[lang].cerList.push(cer);
      langMetrics[lang].werList.push(wer);
      langMetrics[lang].times.push(duration);
    }

    // Quality categorization: cards with IDs > 35 or specific traits are complex/rotated
    const isQualityChallenging = card.id % 3 === 0 || card.id > 35;
    const qualGroup = isQualityChallenging ? 'noisy_or_rotated' : 'standard';
    qualityMetrics[qualGroup].cerList.push(cer);
    qualityMetrics[qualGroup].werList.push(wer);
    qualityMetrics[qualGroup].times.push(duration);

    results.push({
      id: card.id,
      title: card.title,
      language: lang,
      cer: Number((cer * 100).toFixed(2)),
      wer: Number((wer * 100).toFixed(2)),
      charAccuracy: Number(charAccuracy.toFixed(1)),
      wordAccuracy: Number(wordAccuracy.toFixed(1)),
      duration,
      confidence: ocrRes.confidence,
      angle: ocrRes.bestAngle,
      psm: ocrRes.psm,
    });

    process.stdout.write(`Card ${card.id}/50 (${lang}) - Acc: ${charAccuracy.toFixed(1)}%, Time: ${duration}ms\r`);
  }

  console.log(`\n\n==================================================================`);
  console.log(`📊 BENCHMARK RESULTS BY LANGUAGE:`);
  console.log(`==================================================================`);
  console.log(`| Language | Cards | Avg CER | Avg WER | Char Accuracy | Word Accuracy | Avg Time |`);
  console.log(`| :--- | :---: | :---: | :---: | :---: | :---: | :---: |`);

  Object.entries(langMetrics).forEach(([lang, data]) => {
    if (data.cerList.length === 0) return;
    const avgCer = data.cerList.reduce((a, b) => a + b, 0) / data.cerList.length;
    const avgWer = data.werList.reduce((a, b) => a + b, 0) / data.werList.length;
    const avgTime = Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length);
    const charAcc = Math.max(0, (1 - avgCer) * 100).toFixed(1);
    const wordAcc = Math.max(0, (1 - avgWer) * 100).toFixed(1);

    console.log(
      `| **${lang}** | ${data.cerList.length} | ${(avgCer * 100).toFixed(2)}% | ${(avgWer * 100).toFixed(2)}% | ${charAcc}% | ${wordAcc}% | ${avgTime}ms |`
    );
  });

  console.log(`\n==================================================================`);
  console.log(`📸 BENCHMARK RESULTS BY IMAGE QUALITY:`);
  console.log(`==================================================================`);
  console.log(`| Quality Tier | Cards | Avg CER | Avg WER | Char Accuracy | Avg Time |`);
  console.log(`| :--- | :---: | :---: | :---: | :---: | :---: |`);

  Object.entries(qualityMetrics).forEach(([tier, data]) => {
    if (data.cerList.length === 0) return;
    const avgCer = data.cerList.reduce((a, b) => a + b, 0) / data.cerList.length;
    const avgWer = data.werList.reduce((a, b) => a + b, 0) / data.werList.length;
    const avgTime = Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length);
    const charAcc = Math.max(0, (1 - avgCer) * 100).toFixed(1);
    const label = tier === 'standard' ? 'High-Res / Clean' : 'Rotated / Complex / Noisy';

    console.log(`| **${label}** | ${data.cerList.length} | ${(avgCer * 100).toFixed(2)}% | ${(avgWer * 100).toFixed(2)}% | ${charAcc}% | ${avgTime}ms |`);
  });

  const totalCer = results.reduce((acc, r) => acc + r.cer, 0) / results.length;
  const totalWer = results.reduce((acc, r) => acc + r.wer, 0) / results.length;
  const totalAcc = results.reduce((acc, r) => acc + r.charAccuracy, 0) / results.length;
  const totalWordAcc = results.reduce((acc, r) => acc + r.wordAccuracy, 0) / results.length;
  const avgTotalTime = Math.round(results.reduce((acc, r) => acc + r.duration, 0) / results.length);

  console.log(`\n==================================================================`);
  console.log(`🎯 OVERALL RECOGNITION BENCHMARK PERFORMANCE:`);
  console.log(`- Total Cards Evaluated: ${results.length}`);
  console.log(`- Average Character Error Rate (CER): ${totalCer.toFixed(2)}%`);
  console.log(`- Average Word Error Rate (WER):      ${totalWer.toFixed(2)}%`);
  console.log(`- Overall Character Accuracy:         ${totalAcc.toFixed(1)}%`);
  console.log(`- Overall Word Accuracy:              ${totalWordAcc.toFixed(1)}%`);
  console.log(`- Average OCR Processing Time:        ${avgTotalTime}ms per card`);
  console.log(`==================================================================\n`);

  await terminateWorker();

  // Save report to disk
  fs.writeFileSync(
    path.resolve(__dirname, '../data/ocr_benchmark_results.json'),
    JSON.stringify({ overall: { totalCer, totalWer, totalAcc, totalWordAcc, avgTotalTime }, results }, null, 2)
  );
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});

