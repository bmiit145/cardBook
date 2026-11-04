const fs = require('fs');
const extractionService = require('../src/services/extractionService');
const cache = JSON.parse(fs.readFileSync('server/data/examples_dataset/ocr_cache.json', 'utf8'));
const filenames = Object.keys(cache);

let counts = {
  total: filenames.length,
  name: 0,
  company: 0,
  designation: 0,
  phone: 0,
  alternatePhone: 0,
  email: 0,
  website: 0,
  address: 0,
  city: 0,
  state: 0,
  country: 0,
  notes: 0,
};

const results = [];

filenames.forEach((filename, idx) => {
  const item = cache[filename];
  const extracted = extractionService.extractContactFromText(item.rawText, item.confidence);
  
  if (extracted.fullName) counts.name++;
  if (extracted.company) counts.company++;
  if (extracted.designation) counts.designation++;
  if (extracted.phone) counts.phone++;
  if (extracted.alternatePhone) counts.alternatePhone++;
  if (extracted.email) counts.email++;
  if (extracted.website) counts.website++;
  if (extracted.address) counts.address++;
  if (extracted.city) counts.city++;
  if (extracted.state) counts.state++;
  if (extracted.country) counts.country++;
  if (extracted.notes) counts.notes++;

  results.push({
    id: idx + 1,
    filename,
    extracted,
  });
});

console.log('==================================================================');
console.log('📊 STRUCTURED FIELD COVERAGE ACROSS ALL ' + counts.total + ' EXAMPLE CARDS');
console.log('==================================================================');
console.log(`Full Name:        ${counts.name}/${counts.total} (was 28/79)`);
console.log(`Company Name:     ${counts.company}/${counts.total} (was 78/79)`);
console.log(`Designation/Role: ${counts.designation}/${counts.total} (was 10/79)`);
console.log(`Phone (Primary):  ${counts.phone}/${counts.total} (was 43/79)`);
console.log(`Alternate Phone:  ${counts.alternatePhone}/${counts.total} (was 15/79)`);
console.log(`Email Address:    ${counts.email}/${counts.total} (was 24/79)`);
console.log(`Website:          ${counts.website}/${counts.total} (was 22/79)`);
console.log(`Street Address:   ${counts.address}/${counts.total} (was 38/79)`);
console.log(`City:             ${counts.city}/${counts.total} (was 38/79)`);
console.log(`State/Province:   ${counts.state}/${counts.total} (was 39/79)`);
console.log(`Country:          ${counts.country}/${counts.total} (was 4/79)`);
console.log(`Notes / Services: ${counts.notes}/${counts.total} (was 10/79)`);
console.log('==================================================================');

