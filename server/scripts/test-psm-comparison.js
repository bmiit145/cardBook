const path = require('path');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');

async function testPsm() {
  const langPath = path.resolve(__dirname, '../tessdata_best');
  console.log('Loading worker with tessdata_best models from:', langPath);

  const worker = await createWorker('guj+eng+hin', 1, {
    langPath,
    gzip: false,
  });

  const testCards = [
    { name: 'Card 01 (English)', path: path.resolve(__dirname, '../data/dataset_50_cards/images/card_01.png') },
    { name: 'Card 21 (Gujarati)', path: path.resolve(__dirname, '../data/dataset_50_cards/images/card_21.png') },
    { name: 'Card 41 (Hindi)', path: path.resolve(__dirname, '../data/dataset_50_cards/images/card_41.png') },
  ];

  const psms = [
    { psm: '3', label: 'PSM 3 (Auto)' },
    { psm: '6', label: 'PSM 6 (Uniform Block)' },
    { psm: '11', label: 'PSM 11 (Sparse Text)' },
  ];

  for (const card of testCards) {
    if (!fs.existsSync(card.path)) continue;
    console.log(`\n======================================================`);
    console.log(`Testing: ${card.name}`);
    console.log(`======================================================`);

    const imgBuffer = fs.readFileSync(card.path);

    for (const { psm, label } of psms) {
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
      });

      const t0 = Date.now();
      const res = await worker.recognize(imgBuffer);
      const elapsed = Date.now() - t0;
      const text = (res.data?.text || '').trim();
      const conf = Math.round(res.data?.confidence || 0);

      console.log(`--- [${label}] Confidence: ${conf}%, Time: ${elapsed}ms, Chars: ${text.length} ---`);
      console.log('First 2 lines:\n' + text.split('\n').slice(0, 3).join('\n'));
    }
  }

  await worker.terminate();
}

testPsm().catch(console.error);

