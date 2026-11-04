/**
 * On-Device Intelligent Field Extractor
 * Runs 100% offline on the mobile phone to extract Name, Phone, Email, Company, and Address
 */

const STOPWORDS_FOR_NAMES = new Set([
  'road', 'rd', 'street', 'st', 'lane', 'marg', 'avenue', 'ave', 'nagar', 'society',
  'complex', 'building', 'bldg', 'plaza', 'tower', 'office', 'floor', 'opp', 'near',
  'behind', 'beside', 'highway', 'dist', 'taluka', 'city', 'state', 'india', 'canada',
  'pvt', 'ltd', 'limited', 'private', 'llc', 'corp', 'inc', 'co', 'company',
  'technologies', 'infotech', 'solutions', 'enterprises', 'services', 'industries',
  'email', 'mail', 'phone', 'mobile', 'cell', 'tel', 'fax', 'web', 'website', 'url',
  'contact', 'call', 'www', 'http', 'https', 'com', 'org', 'net', 'in', 'ca'
]);

const DESIGNATION_KEYWORDS = [
  'director', 'managing director', 'md', 'ceo', 'cto', 'cfo', 'coo', 'founder',
  'co-founder', 'president', 'vice president', 'vp', 'partner', 'proprietor',
  'owner', 'manager', 'general manager', 'consultant', 'advisor', 'head',
  'lead', 'engineer', 'developer', 'architect', 'officer', 'executive', 'specialist',
  'advocate', 'chartered accountant', 'ca', 'doctor', 'dr'
];

const COMPANY_MARKERS = [
  'pvt ltd', 'private limited', 'ltd', 'limited', 'llc', 'inc', 'corp', 'corporation',
  'enterprises', 'infotech', 'technologies', 'solutions', 'jewellers', 'gems', 'group',
  'associates', 'industries', 'agency', 'studio', 'works', 'traders', 'firm'
];

export function extractContactFromText(rawText = '') {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const cleanText = lines.join('\n');

  // 1. Extract Phone Numbers
  const phones = [];
  const phoneRegex = /(?:(?:\+|00)\d{1,4}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,5}/g;
  const rawPhones = cleanText.match(phoneRegex) || [];

  for (const p of rawPhones) {
    const digitsOnly = p.replace(/\D/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      const formatted = p.trim();
      if (!phones.includes(formatted)) {
        phones.push(formatted);
      }
    }
  }

  const primaryPhone = phones[0] || '';
  const alternatePhone = phones[1] || '';

  // 2. Extract Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const rawEmails = cleanText.match(emailRegex) || [];
  const emails = Array.from(new Set(rawEmails.map((e) => e.toLowerCase().trim())));
  const primaryEmail = emails[0] || '';

  // 3. Extract Websites
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&//=]*)/gi;
  const rawWebsites = cleanText.match(websiteRegex) || [];
  const websites = [];
  for (const w of rawWebsites) {
    const lower = w.toLowerCase().trim();
    if (!lower.includes('@') && (lower.includes('www.') || lower.includes('http') || lower.endsWith('.com') || lower.endsWith('.in') || lower.endsWith('.ca') || lower.endsWith('.org'))) {
      if (!websites.includes(lower)) {
        websites.push(lower.startsWith('http') ? lower : `https://${lower}`);
      }
    }
  }
  const primaryWebsite = websites[0] || '';

  // 4. Extract Designation
  let designation = '';
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    for (const desig of DESIGNATION_KEYWORDS) {
      if (lineLower === desig || lineLower.startsWith(desig + ' ') || lineLower.endsWith(' ' + desig)) {
        designation = line;
        break;
      }
    }
    if (designation) break;
  }

  // 5. Extract Company Name
  let company = '';
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    for (const marker of COMPANY_MARKERS) {
      if (lineLower.includes(marker)) {
        company = line;
        break;
      }
    }
    if (company) break;
  }
  // Fallback: Line 0 or 1 if prominent and not a phone/email/address
  if (!company && lines.length > 0) {
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const candidate = lines[i];
      if (candidate.length > 3 && !candidate.match(phoneRegex) && !candidate.match(emailRegex) && candidate !== designation) {
        company = candidate;
        break;
      }
    }
  }

  // 6. Extract Full Name
  const candidateNames = [];
  for (const line of lines) {
    if (line === company || line === designation) continue;
    if (line.match(phoneRegex) || line.match(emailRegex) || line.match(websiteRegex)) continue;

    // Check if line contains address stopwords
    const words = line.toLowerCase().split(/\s+/);
    const hasStopword = words.some((w) => STOPWORDS_FOR_NAMES.has(w));
    if (hasStopword) continue;

    // Check if it looks like a person's name (2 to 4 words, letters only)
    if (/^[a-zA-Z\s.'-]+$/.test(line) && words.length >= 2 && words.length <= 4) {
      candidateNames.push(line.trim());
    }
  }

  const fullName = candidateNames[0] || '';

  // 7. Extract Address lines
  const addressLines = [];
  for (const line of lines) {
    if (line === fullName || line === company || line === designation) continue;
    if (line.match(phoneRegex) || line.match(emailRegex) || line.match(websiteRegex)) continue;

    const words = line.toLowerCase().split(/\s+/);
    const isAddressLine = words.some((w) =>
      ['road', 'street', 'nagar', 'complex', 'tower', 'building', 'floor', 'near', 'opp', 'dist', 'city', 'state', 'ahmedabad', 'surat', 'mumbai', 'toronto', 'canada', 'india', 'gujarat'].includes(w)
    );
    if (isAddressLine || line.match(/\b\d{6}\b/) || line.match(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/)) {
      addressLines.push(line);
    }
  }

  const address = addressLines.join(', ') || '';

  // 8. Quality confidence
  let confidence = 50;
  if (fullName) confidence += 20;
  if (primaryPhone) confidence += 15;
  if (primaryEmail) confidence += 10;
  if (company) confidence += 5;

  return {
    fullName,
    company,
    designation,
    phone: primaryPhone,
    alternatePhone,
    email: primaryEmail,
    website: primaryWebsite,
    address,
    city: '',
    state: '',
    country: '',
    notes: '',
    phones,
    emails,
    websites,
    people: candidateNames,
    addresses: addressLines,
    confidence: Math.min(100, confidence),
    needsReview: confidence < 60,
  };
}

