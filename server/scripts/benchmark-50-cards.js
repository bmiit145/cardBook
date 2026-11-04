const fs = require('fs');
const path = require('path');
const { extractContactFromText } = require('../src/services/extractionService');

/**
 * 50-Card Extraction Precision & Recall Benchmark
 */
function runBenchmark() {
  const datasetPath = path.resolve(__dirname, '../data/dataset_50_cards/cards.json');
  if (!fs.existsSync(datasetPath)) {
    console.error(`Dataset not found at ${datasetPath}`);
    process.exit(1);
  }

  const cards = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  console.log(`==================================================================`);
  console.log(`🚀 RUNNING 50-CARD UNSEEN BENCHMARK (${cards.length} Business Cards)`);
  console.log(`==================================================================\n`);

  const fields = ['fullName', 'company', 'designation', 'phone', 'email', 'website', 'address', 'city', 'state'];
  const metrics = {};
  fields.forEach((f) => {
    metrics[f] = { truePositives: 0, falsePositives: 0, falseNegatives: 0, totalGroundTruth: 0, totalExtracted: 0 };
  });

  let totalProcessed = 0;
  let categoryBreakdown = {};

  cards.forEach((card, idx) => {
    totalProcessed++;
    const cat = card.category || 'General';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

    const gt = card.groundTruth || {};
    const extracted = extractContactFromText(card.rawOcrText, 85);

    fields.forEach((f) => {
      const gtVal = (gt[f] || '').trim().toLowerCase();
      const extVal = (extracted[f] || '').trim().toLowerCase();

      if (gtVal) {
        metrics[f].totalGroundTruth++;
      }
      if (extVal) {
        metrics[f].totalExtracted++;
      }

      if (gtVal && extVal) {
        // Evaluate similarity / substring containment
        const isMatch =
          gtVal === extVal ||
          gtVal.includes(extVal) ||
          extVal.includes(gtVal) ||
          extVal.replace(/\D/g, '') === gtVal.replace(/\D/g, '');

        if (isMatch) {
          metrics[f].truePositives++;
        } else {
          metrics[f].falsePositives++;
        }
      } else if (!gtVal && extVal) {
        metrics[f].falsePositives++;
      } else if (gtVal && !extVal) {
        metrics[f].falseNegatives++;
      }
    });
  });

  console.log(`📊 FIELD-LEVEL BENCHMARK METRICS (50 Business Cards):\n`);
  console.log(`| Field | Ground Truth | Extracted | Correct | Precision | Recall | F1 Score |`);
  console.log(`| :--- | :---: | :---: | :---: | :---: | :---: | :---: |`);

  let totalGtAll = 0;
  let totalExtAll = 0;
  let totalTpAll = 0;

  fields.forEach((f) => {
    const m = metrics[f];
    totalGtAll += m.totalGroundTruth;
    totalExtAll += m.totalExtracted;
    totalTpAll += m.truePositives;

    const prec = m.totalExtracted > 0 ? (m.truePositives / m.totalExtracted) * 100 : 100;
    const rec = m.totalGroundTruth > 0 ? (m.truePositives / m.totalGroundTruth) * 100 : 100;
    const f1 = prec + rec > 0 ? (2 * (prec * rec)) / (prec + rec) : 0;

    console.log(
      `| **${f}** | ${m.totalGroundTruth} | ${m.totalExtracted} | ${m.truePositives} | ${prec.toFixed(1)}% | ${rec.toFixed(1)}% | ${f1.toFixed(1)}% |`
    );
  });

  const overallPrec = totalExtAll > 0 ? (totalTpAll / totalExtAll) * 100 : 100;
  const overallRec = totalGtAll > 0 ? (totalTpAll / totalGtAll) * 100 : 100;
  const overallF1 = overallPrec + overallRec > 0 ? (2 * (overallPrec * overallRec)) / (overallPrec + overallRec) : 0;

  console.log(`\n==================================================================`);
  console.log(`🎯 OVERALL BENCHMARK PERFORMANCE:`);
  console.log(`- Total Cards Tested: ${totalProcessed}`);
  console.log(`- Categories: ${Object.entries(categoryBreakdown).map(([k, v]) => `${k} (${v})`).join(', ')}`);
  console.log(`- Overall Precision: ${overallPrec.toFixed(1)}%`);
  console.log(`- Overall Recall:    ${overallRec.toFixed(1)}%`);
  console.log(`- Overall F1 Score:  ${overallF1.toFixed(1)}%`);
  console.log(`==================================================================\n`);
}

runBenchmark();

