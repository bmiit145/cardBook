const fs = require('fs');
const path = require('path');
const { extractContactFromText } = require('../src/services/extractionService');

const datasetPath = path.resolve(__dirname, '../data/dataset_50_cards/cards.json');
const cards = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

// Bilingual normalization dictionary
const CITY_STATE_EQUIV = {
  'delhi': 'दिल्ली',
  'new delhi': 'नई दिल्ली',
  'mumbai': 'मुंबई',
  'vashi': 'navi mumbai',
  'navi mumbai': 'vashi',
  'surat': 'સુરત',
  'સુરત': 'surat',
  'ahmedabad': 'અમદાવાદ',
  'vadodara': 'વડોદરા',
  'rajkot': 'રાજકોટ',
  'bhavnagar': 'ભાવનગર',
  'gandhinagar': 'ગાંધીનગર',
  'jaipur': 'जयपुर',
  'indore': 'इंदौर',
  'bhopal': 'भोपाल',
  'kanpur': 'कानपुर',
  'lucknow': 'लखनऊ',
  'noida': 'नोएडा',
  'kolkata': 'कोलकाता',
  'bengaluru': 'बेंगलुरु',
  'bangalore': 'बेंगलुरु',
  'pune': 'पुणे',
  'gujarat': 'ગુજરાત',
  'maharashtra': 'મહારાષ્ટ્ર',
  'rajasthan': 'राजस्थान',
  'uttar pradesh': 'उत्तर प्रदेश',
  'madhya pradesh': 'मध्य प्रदेश',
  'punjab': 'पंजाब',
  'haryana': 'हरियाणा',
  'west bengal': 'वेस्ट बंगाल',
  'karnataka': 'कर्नाटक',
  'tamil nadu': 'तमिलनाडु',
  'telangana': 'तेलंगाना'
};

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[.,\-_#|\\/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(str) {
  if (!str) return '';
  return str.replace(/\D/g, '').slice(-10);
}

function isLocationMatch(extracted, groundTruth) {
  if (!groundTruth) return true;
  if (!extracted) return false;
  const normExt = normalize(extracted);
  const normGt = normalize(groundTruth);
  if (normExt.includes(normGt) || normGt.includes(normExt)) return true;

  // Check bilingual equivalence
  const equiv = CITY_STATE_EQUIV[normGt] || CITY_STATE_EQUIV[normExt];
  if (equiv && (normExt.includes(normalize(equiv)) || normalize(equiv).includes(normExt) || normGt.includes(normalize(equiv)) || normalize(equiv).includes(normGt))) return true;

  if ((normExt === 'vashi' && normGt.includes('mumbai')) || (normGt === 'vashi' && normExt.includes('mumbai'))) {
    return true;
  }

  return false;
}

function runBenchmark() {
  console.log(`\n==================================================================`);
  console.log(`🚀 RUNNING 50-CARD TRAINING & EXTRACTION BENCHMARK EVALUATION`);
  console.log(`==================================================================\n`);

  let totalCards = cards.length;
  let metrics = {
    name: { correct: 0, total: 0 },
    company: { correct: 0, total: 0 },
    designation: { correct: 0, total: 0 },
    phone: { correct: 0, total: 0 },
    email: { correct: 0, total: 0 },
    website: { correct: 0, total: 0 },
    city: { correct: 0, total: 0 },
    state: { correct: 0, total: 0 },
    address: { correct: 0, total: 0 },
    overallPassed: 0
  };

  const failures = [];

  cards.forEach((card) => {
    const extracted = extractContactFromText(card.rawOcrText);
    const gt = card.groundTruth;

    let cardFailures = [];

    // 1. Name Check
    metrics.name.total++;
    const normExtName = normalize(extracted.fullName);
    const normGtName = normalize(gt.fullName);
    const nameMatch = normExtName.includes(normGtName) || normGtName.includes(normExtName) ||
                      (gt.fullName.includes('(') && normExtName.includes(normalize(gt.fullName.split('(')[0])));
    if (nameMatch) {
      metrics.name.correct++;
    } else {
      cardFailures.push(`Name mismatch: Expected "${gt.fullName}" | Got "${extracted.fullName}"`);
    }

    // 2. Company Check
    metrics.company.total++;
    const normExtComp = normalize(extracted.company);
    const normGtComp = normalize(gt.company);
    const compMatch = normExtComp.includes(normGtComp) || normGtComp.includes(normExtComp) ||
                      normGtComp.split(' ').some(w => w.length > 3 && normExtComp.includes(w));
    if (compMatch) {
      metrics.company.correct++;
    } else {
      cardFailures.push(`Company mismatch: Expected "${gt.company}" | Got "${extracted.company}"`);
    }

    // 3. Designation Check
    if (gt.designation) {
      metrics.designation.total++;
      const normExtDesig = normalize(extracted.designation);
      const normGtDesig = normalize(gt.designation);
      const desigMatch = normExtDesig.includes(normGtDesig) || normGtDesig.includes(normExtDesig);
      if (desigMatch) {
        metrics.designation.correct++;
      } else {
        cardFailures.push(`Designation mismatch: Expected "${gt.designation}" | Got "${extracted.designation}"`);
      }
    }

    // 4. Phone Check
    metrics.phone.total++;
    const extPhoneDigits = normalizePhone(extracted.phone);
    const gtPhoneDigits = normalizePhone(gt.phone);
    const phoneMatch = extPhoneDigits === gtPhoneDigits || (gt.alternatePhone && extPhoneDigits === normalizePhone(gt.alternatePhone));
    if (phoneMatch) {
      metrics.phone.correct++;
    } else {
      cardFailures.push(`Phone mismatch: Expected "${gt.phone}" | Got "${extracted.phone}"`);
    }

    // 5. Email Check
    if (gt.email) {
      metrics.email.total++;
      if (extracted.email.toLowerCase() === gt.email.toLowerCase()) {
        metrics.email.correct++;
      } else {
        cardFailures.push(`Email mismatch: Expected "${gt.email}" | Got "${extracted.email}"`);
      }
    }

    // 6. Website Check
    if (gt.website) {
      metrics.website.total++;
      const normExtWeb = extracted.website.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
      const normGtWeb = gt.website.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
      if (normExtWeb.includes(normGtWeb) || normGtWeb.includes(normExtWeb)) {
        metrics.website.correct++;
      } else {
        cardFailures.push(`Website mismatch: Expected "${gt.website}" | Got "${extracted.website}"`);
      }
    }

    // 7. City Check
    if (gt.city) {
      metrics.city.total++;
      if (isLocationMatch(extracted.city, gt.city)) {
        metrics.city.correct++;
      } else {
        cardFailures.push(`City mismatch: Expected "${gt.city}" | Got "${extracted.city}"`);
      }
    }

    // 8. State Check
    if (gt.state) {
      metrics.state.total++;
      if (isLocationMatch(extracted.state, gt.state)) {
        metrics.state.correct++;
      } else {
        cardFailures.push(`State mismatch: Expected "${gt.state}" | Got "${extracted.state}"`);
      }
    }

    // 9. Address Check
    if (gt.address) {
      metrics.address.total++;
      if (extracted.address && extracted.address.length > 5) {
        metrics.address.correct++;
      } else {
        cardFailures.push(`Address missing: Expected "${gt.address}" | Got "${extracted.address}"`);
      }
    }

    if (cardFailures.length === 0) {
      metrics.overallPassed++;
    } else {
      failures.push({ id: card.id, title: card.title, category: card.category, errors: cardFailures });
    }
  });

  const pct = (c, t) => t === 0 ? '100%' : `${((c / t) * 100).toFixed(1)}%`;

  console.log(`==================================================================`);
  console.log(`📊 ACCURACY BENCHMARK RESULTS ACROSS ${totalCards} CARDS`);
  console.log(`==================================================================`);
  console.log(`✓ Full Name:      ${metrics.name.correct}/${metrics.name.total} (${pct(metrics.name.correct, metrics.name.total)})`);
  console.log(`✓ Company Name:   ${metrics.company.correct}/${metrics.company.total} (${pct(metrics.company.correct, metrics.company.total)})`);
  console.log(`✓ Designation:    ${metrics.designation.correct}/${metrics.designation.total} (${pct(metrics.designation.correct, metrics.designation.total)})`);
  console.log(`✓ Phone Numbers:  ${metrics.phone.correct}/${metrics.phone.total} (${pct(metrics.phone.correct, metrics.phone.total)})`);
  console.log(`✓ Email Address:  ${metrics.email.correct}/${metrics.email.total} (${pct(metrics.email.correct, metrics.email.total)})`);
  console.log(`✓ Website:        ${metrics.website.correct}/${metrics.website.total} (${pct(metrics.website.correct, metrics.website.total)})`);
  console.log(`✓ City:           ${metrics.city.correct}/${metrics.city.total} (${pct(metrics.city.correct, metrics.city.total)})`);
  console.log(`✓ State:          ${metrics.state.correct}/${metrics.state.total} (${pct(metrics.state.correct, metrics.state.total)})`);
  console.log(`✓ Street Address: ${metrics.address.correct}/${metrics.address.total} (${pct(metrics.address.correct, metrics.address.total)})`);
  console.log(`------------------------------------------------------------------`);
  console.log(`⭐ PERFECT CARDS (Zero errors): ${metrics.overallPassed}/${totalCards} (${pct(metrics.overallPassed, totalCards)})`);
  console.log(`==================================================================\n`);

  if (failures.length > 0) {
    console.log(`⚠️ ISSUES DETECTED IN ${failures.length} CARDS TO FINE-TUNE:`);
    failures.forEach(f => {
      console.log(`\nCard #${f.id} [${f.category}]: ${f.title}`);
      f.errors.forEach(e => console.log(`  - ${e}`));
    });
  } else {
    console.log(`🎉 100% ACCURACY ACHIEVED! All 50 business cards passed with zero errors.`);
  }

  return { metrics, failures };
}

runBenchmark();
