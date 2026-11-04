const { parsePhoneNumberFromString } = require('libphonenumber-js');
const logger = require('../utils/logger');

/**
 * Generic Layout-Aware Multilingual Business Card Contact Extraction Engine
 * 
 * Supports English, Gujarati, and Hindi business cards using:
 * 1. Layout-Aware Analysis: Bounding boxes, vertical position (yRatio), horizontal alignment (xRatio),
 *    relative typography size (fontSizeRatio), and line grouping proximity.
 * 2. Independent Classification Modules:
 *    - extractPersonName()
 *    - extractCompanyName()
 *    - extractDesignation()
 *    - extractPhoneNumbers()
 *    - extractEmails()
 *    - extractWebsite()
 *    - extractAddress()
 *    - extractLocation()
 * 3. Evidence-Based Scoring Engine: Combines lexical structure, layout prominence,
 *    relational proximity, and multi-script domain patterns.
 * 4. Strict Neutrality: Zero hardcoded card dictionaries, names, phone numbers, or company aliases.
 * 5. Unicode-Safe Multilingual Integrity: Preserves native English, Gujarati, and Hindi scripts.
 */

// ============================================================================
// 1. GENERIC VOCABULARY & REGEX PATTERNS (Language & Corporate Standards)
// ============================================================================

// Standard Universal Designations / Job Titles across English, Gujarati, and Hindi
const GENERIC_DESIGNATION_PATTERNS = [
  // Executive & Leadership
  /\b(?:chief\s*executive\s*officer|ceo|chief\s*technology\s*officer|cto|chief\s*financial\s*officer|cfo)\b/i,
  /\b(?:chief\s*operating\s*officer|coo|chief\s*marketing\s*officer|cmo|managing\s*director|md)\b/i,
  /\b(?:executive\s*director|vice\s*president|vp|director|president)\b/i,
  // Management & Department Heads
  /\b(?:head\s+of\s+[a-zA-Z\s&/-]{2,25})\b/i,
  /\b(?:general\s*manager|gm|operations\s*manager|project\s*manager|project\s*director)\b/i,
  /\b(?:commercial\s*manager|sales\s*manager|export\s*manager|marketing\s*manager|product\s*manager)\b/i,
  /\b(?:development\s*manager|business\s*development\s*manager|branch\s*manager|regional\s*manager)\b/i,
  /\b(?:senior\s*manager|manager)\b/i,
  // Engineering, Architecture & Design
  /\b(?:software\s*engineer|lead\s*engineer|senior\s*engineer|systems\s*engineer|engineer)\b/i,
  /\b(?:principal\s*architect|lead\s*architect|software\s*architect|architect|creative\s*director|art\s*director)\b/i,
  /\b(?:architectural\s*designer|interior\s*designer|graphic\s*designer|fashion\s*designer|product\s*designer|ui\/ux\s*designer|designer)\b/i,
  /\b(?:developer|senior\s*developer|specialist|research\s*analyst|data\s*analyst|analyst)\b/i,
  // Ownership & Partnership
  /\b(?:founder|co-founder|co\s*founder|managing\s*partner|senior\s*partner|partners?)\b/i,
  /\b(?:proprietor|owner|secretary|trustee)\b/i,
  // Professional, Legal, Advisory & Medical
  /\b(?:consultant|senior\s*consultant|advisor|tax\s*advisor|financial\s*advisor)\b/i,
  /\b(?:chartered\s*accountant|c\.a\.|advocate|senior\s*advocate|lawyer|attorney)\b/i,
  /\b(?:doctor|surgeon|physician|physiotherapist)\b/i,
  /\b(?:sales\s*executive|marketing\s*executive|senior\s*executive|executive|officer|coordinator)\b/i,

  // Gujarati Professional Titles
  /નિયામક|મેનેજિંગ\s*ડિરેક્ટર|ડિરેક્ટર|સંસ્થાપક|સહ-સંસ્થાપક|પ્રમુખ|ઉપપ્રમુખ/i,
  /ભાગીદાર|મેનેજર|સંચાલક|માલિક|સલાહકાર|પ્રોપ્રાઇટર|ઓનર|વકીલ|એડવોકેટ|ઇજનેર/i,

  // Hindi Professional Titles
  /प्रबंध\s*निदेशक|निदेशक|संस्थापक|सह-संस्थापक|अध्यक्ष|उपाध्यक्ष|प्रबंधक/i,
  /साझेदार|मालिक|सलाहकार|संचालक|प्रोपराइटर|वरिष्ठ\s*अधिवक्ता|अधिवक्ता|डॉक्टर|इंजीनियर/i
];

// Generic Corporate Entity Suffixes & Identifiers
const COMPANY_SUFFIX_REGEX = /\b(pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|llp|llc|inc\.?|incorporated|corp\.?|corporation|technologies|solutions|infotech|enterprises?|industries|group|international|consultancy|associates|agency|studio|holdings|logistics|trading|traders|& co\.?|& sons|works|motors|steels?|textiles|fabrics|hardware|plywood|valves|packaging|mills|weavers|association|developers|media|diagnostics|energy|robotics|lab(?:s|tech)?|hospital|clinic|nursing\s*home|academy|foundation|furniture|jewel[l]?ers?)\b/i;

const INDIC_COMPANY_SUFFIXES = [
  // Gujarati
  'પ્રાઇવેટ લિમિટેડ', 'પ્રાઇવેટ લિ', 'પ્રા. લિ.', 'પ્રા.લિ.', 'લિમિટેડ', 'ઇન્ડસ્ટ્રીઝ', 'ટેકનોલોજી',
  'એન્ટરપ્રાઇઝ', 'એન્ટરપ્રાઇઝીસ', 'ઇન્ડસ્ટ્રી', 'જ્વેલર્સ', 'ટેક્સટાઇલ', 'ટ્રેડર્સ', 'ડેકોરેટર્સ',
  'હાર્ડવેર', 'પ્લાયવુડ', 'ફર્નિચર', 'ફર્નિચર્સ', 'કન્સ્ટ્રક્શન', 'ઓટોમોબાઇલ્સ', 'સ્ટીલ', 'ઇલેક્ટ્રોનિક્સ', 'પ્રિન્ટર્સ',
  'ગારમેન્ટ્સ', 'ટ્રેડિંગ કંપની', 'ટ્રેડિંગ', 'કંપની', 'ટ્રાન્સપોર્ટ', 'પ્રોડક્ટ્સ', 'કેમિકલ્સ',
  'ટ્રસ્ટ', 'સર્વિસ', 'સર્વિસીસ',
  // Hindi
  'प्राइवेट लिमिटेड', 'लिमिटेड', 'उद्योग', 'समूह', 'टेक्नोलॉजी', 'एंटरप्राइजेज', 'इंडस्ट्रीज',
  'फर्नीचर', 'स्टील', 'गारमेंट्स', 'ऑटोमोबाइल्स', 'इलेक्ट्रॉनिक्स', 'ट्रांसपोर्ट', 'एसोसिएट्स', 'कंस्ट्रक्शन',
  'हॉस्पिटल', 'रिसर्च सेंटर', 'ट्रस्ट', 'कंपनी'
];

// Generic Address & Geographic Indicators (using word boundaries to prevent accidental substring matches)
const ADDRESS_KEYWORDS = /(?:\b(?:street|st\.?|road|rd\.?|marg|avenue|ave\.?|lane|circle|cross\s*road|floor|flr\.?|suite|unit|flat|plot|shop|block|bldg\.?|building|tower|complex|plaza|center|centre|hub|estate|industrial|gidc|midc|sez|zone|phase|nagar|society|colony|enclave|residency|bhavan|house|bungalows?|near|nr\.?|opp\.?|opposite|behind|beside|chambers?|court)\b|રોડ|માર્ગ|શેરી|ગલી|ચોક|ચાર\s*રસ્તા|પ્લોટ|દુકાન|શોપ|માર્કેટ|કોમ્પ્લેક્સ|સેન્ટર|હબ|પ્લાઝા|ટાવર|ભવન|સોસાયટી|નગર|વિસ્તાર|જીઆઇડીસી|ઇન્ડસ્ટ્રીયલ|સામે|પાસે|પાછળ|બાજુમાં|સરનામું|સરનામુ|मार्ग|सड़क|गली|चौक|चौराहा|बाजार|दुकान|प्लाजा|कॉम्प्लेक्स|टावर|भवन|नगर|कॉलोनी|सोसायटी|औद्योगिक|क्षेत्र|के\s*पास|के\s*सामने|के\s*पीछे|पता)/i;

const POSTAL_CODE_REGEX = /\b(?:\d{6}|\d{5}(?:-\d{4})?|[A-Z]\d[A-Z]\s*\d[A-Z]\d)\b/i;

// Standard Indian States and Union Territories (English, Gujarati, Hindi)
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'New Delhi', 'Chandigarh',
  // Gujarati
  'ગુજરાત', 'મહારાષ્ટ્ર', 'દિલ્હી', 'રાજસ્થાન', 'પંજાબ', 'હરિયાણા', 'ઉત્તર પ્રદેશ', 'મધ્ય પ્રદેશ',
  // Hindi
  'गुजरात', 'महाराष्ट्र', 'दिल्ली', 'राजस्थान', 'पंजाब', 'हरियाणा', 'उत्तर प्रदेश', 'मध्य प्रदेश'
];

// Major International States & Provinces
const INTERNATIONAL_REGIONS = [
  // Canada
  { state: 'Ontario', country: 'Canada' },
  { state: 'Quebec', country: 'Canada' },
  { state: 'British Columbia', country: 'Canada' },
  { state: 'Alberta', country: 'Canada' },
  // USA
  { state: 'California', country: 'USA' },
  { state: 'Massachusetts', country: 'USA' },
  { state: 'New York', country: 'USA' },
  { state: 'Texas', country: 'USA' },
  { state: 'Washington', country: 'USA' },
  { state: 'Illinois', country: 'USA' },
  { state: 'Florida', country: 'USA' },
  // Indonesia
  { state: 'Jawa Barat', country: 'Indonesia' },
  { state: 'Jakarta', country: 'Indonesia' }
];

// Generic Professional & Social Honorifics
const HONORIFIC_REGEX = /^(?:mr\.|mrs\.|ms\.|dr\.|prof\.|er\.|ar\.|ca\.|adv\.|advocate|shri|smt\.|શ્રી|શ્રીમતી|ડો\.|ઇજનેર|વકીલ|એડવોકેટ|श्री|श्रीमती|डॉ\.|अधिवक्ता|इंजीनियर)\s+/i;

// Generic Opening Religious Blessings & Invocations across cultures
const RELIGIOUS_INVOCATIONS_REGEX = /(?:॥|ॐ|ૐ|786|કૃપા|નમઃ|नमः|શ્રી\s*(?:ગણેશાય|ગણેશ|હરિ|રામ|કૃષ્ણ|હનુમાન|અંબે|ખોડિયાર)|श्री\s*(?:गणेशाय|गणेश|हरि|राम|कृष्णा|हनुमान)|જય\s*(?:શ્રી|અંબે|ભવાની|માતા)|जय\s*(?:श्री|माता|भवानी)|ગાયત્રી\s*માતા)/i;

// Public free email domains (excluded from company website/brand derivations)
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'yahoo.co.in', 'hotmail.com', 'outlook.com',
  'rediffmail.com', 'icloud.com', 'zoho.com', 'mail.com', 'proton.me', 'live.com', 'aol.com'
]);

// Academic degrees / abbreviations that look like domain dot notation
const ACADEMIC_DEGREE_REGEX = /^(?:https?:\/\/)?(?:b\.com|ll\.b|b\.b\.a|m\.b\.a|m\.com|b\.tech|m\.tech|b\.sc|m\.sc|b\.e|m\.e|ph\.d)\b/i;

// Generic Marketing / Slogan / Product Line Patterns (routed to Notes, never Person or Company)
const MARKETING_SLOGAN_REGEX = /\b(all\s*type[s]?\s*of|manufacturer[s]?\s*&|wholesaler[s]?|customized|dealers?\s*in|importers?\s*&|exporters?\s*&|complete\s*solutions?|our\s*services|we\s*deal\s*in|our\s*products|our\s*running\s*projects?|save\s*water|open\s*plot\s*size|size\s*:\s*\d|digital\s*card|scan\s*me|qr\s*code|તમામ\s*પ્રકાર|બધા\s*જ\s*પ્રકાર|ઉત્પાદક|જથ્થાબંધ|ડીલર્સ|દરેક\s*જાતના|સર્વિસ\s*અને\s*રિપેરિંગ|सभी\s*प्रकार\s*के|थोक\s*विक्रेता|निर्माता|हमारी\s*सेवाएं)\b/i;

// Generic Non-Person / Business / Industry / Departmental Words across English, Gujarati, Hindi
const NON_PERSON_WORDS_REGEX = /\b(?:customer|support|care|service[s]?|helpdesk|helpline|reception|inquiry|enquiry|desk|office|branch|headquarters|factory|store|showroom|workshop|godown|jewel[l]?ry|gems?|gold|silver|diamond[s]?|furniture|plywood|hardware|timber|textile[s]?|fabric[s]?|apparel|garment[s]?|clothing|logistics|freight|shipping|transport|courier|trading|traders?|solutions?|technology|technologies|tech|systems?|software|consulting|consultancy|associates?|group|enterprises?|industries|industry|corporation|corp|limited|pvt|ltd|llp|inc|co|company|firm|agency|ventures?|infra|infrastructure|builders?|developers?|properties|realty|real\s*estate|motors?|automobiles?|engineering|chemicals?|plastics?|polymers?|packaging|printers?|printing|press|studio|creatives?|graphics?|media|advertis(?:ing|ement)|marketing|management|security|pharma|pharmaceuticals?|clinic|hospital|healthcare|catering|foods?|beverages?|bakers?|bakery|dairy|restaurant|cafe|hotel|resort|travel[s]?|tours?|energy|solar|power|finance|financial|insurance|investment[s]?|holdings?|manufacturer[s]?|wholesaler[s]?|customized|dealer[s]?|distributor[s]?|exporter[s]?|importer[s]?|scan\s*me|qr\s*code)\b/i;

const INDIC_NON_PERSON_WORDS = [
  'ગ્રાહક સેવા', 'કસ્ટમર', 'સપોર્ટ', 'સર્વિસ', 'હેલ્પલાઇન', 'ઓફિસ', 'દુકાન', 'શોરૂમ', 'ગોડાઉન', 'કારખાનું',
  'ફર્નિચર', 'હાર્ડવેર', 'પ્લાયવુડ', 'ટેક્સટાઈલ', 'કાપડ', 'જ્વેલર્સ', 'ઝવેરી', 'સોના', 'ચાંદી', 'હીરા', 'ડાયમંડ',
  'ટેકનોલોજી', 'સોલ્યુશન્સ', 'એસોસિયેટ્સ', 'ટ્રેડિંગ', 'ટ્રેડર્સ', 'એન્ટરપ્રાઇઝ', 'ઇન્ડસ્ટ્રીઝ', 'ડેવલપર્સ',
  'બિલ્ડર્સ', 'ટ્રાવેલ્સ', 'મોટર્સ', 'કેમિકલ્સ', 'પ્લાસ્ટિક', 'પેકેજીંગ', 'પ્રિન્ટર્સ', 'ઉત્પાદક', 'જથ્થાબંધ',
  'सपोर्ट', 'सर्विस', 'हेल्पलाइन', 'ऑफिस', 'दुकान', 'शोरूम', 'गोदाम', 'कारखाना',
  'फर्नीचर', 'हार्डवेयर', 'प्लाईवुड', 'टेक्सटाइल', 'कपड़ा', 'ज्वैलर्स', 'सोना', 'चांदी', 'हीरा', 'डायमंड',
  'टेक्नोलॉजी', 'सॉल्यूशंस', 'एसोसिएट्स', 'ट्रेडिंग', 'ट्रेडर्स', 'एंटरप्राइजेज', 'इंडस्ट्रीज', 'डेवलपर्स',
  'बिल्डर्स', 'ट्रैवल्स', 'मोटर्स', 'केमिकल्स', 'प्लास्टिक', 'पैकेजिंग', 'प्रिंटर्स', 'निर्माता', 'थोक विक्रेता'
];

/**
 * Checks whether text contains business nouns or departmental labels that disqualify it as a personal name
 */
function isNonPersonText(text) {
  if (!text || typeof text !== 'string') return false;
  if (NON_PERSON_WORDS_REGEX.test(text)) return true;
  for (const w of INDIC_NON_PERSON_WORDS) {
    if (text.includes(w)) return true;
  }
  return false;
}

// ============================================================================
// 2. HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes Gujarati (૦-૯) and Devanagari (०-९) numerals into ASCII digits (0-9)
 */
function normalizeNumerals(str) {
  if (!str) return '';
  const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  const devDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  let res = str;
  gujDigits.forEach((gd, idx) => {
    res = res.replaceAll(gd, idx.toString());
  });
  devDigits.forEach((dd, idx) => {
    res = res.replaceAll(dd, idx.toString());
  });
  return res;
}

/**
 * Cleans visual noise and non-text artifacts while preserving alphanumeric letters and standard punctuation
 */
function cleanNoise(str) {
  if (!str) return '';
  return str
    .replace(/[|©“"_=~\\<>{}\[\]®°«»`^~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a line represents meaningless visual noise or peripheral scan artifacts
 */
function isNoiseLine(line) {
  if (!line || typeof line !== 'string') return true;
  const trimmed = line.trim();
  if (trimmed.length < 2) return true;

  // Discard structural card side separators (e.g. "--- BACK SIDE ---", "FRONT SIDE")
  if (/^[-–—\s]*(?:back|front)\s*side[-–—\s]*$/i.test(trimmed)) return true;

  // Preserve lines with parenthesized tokens, digits, or email
  if (/\([\u0A80-\u0AFF\u0900-\u097Fa-zA-Z\s]+\)/.test(trimmed) || /\d{5}/.test(trimmed) || trimmed.includes('@')) {
    return false;
  }

  const lettersAndDigits = trimmed.replace(/[^a-zA-Z0-9\u0A80-\u0AFF\u0900-\u097F]/g, '');
  if (lettersAndDigits.length < 2) return true;

  if (/^[|\s.:,;\\/_\-~=>#*^%&@+0-9()]+$/.test(trimmed)) return true;
  if (/(?:^|\s)[%#*~=<>]{2,}/.test(trimmed)) return true;

  // Check fragmented lines with high ratio of 1-2 character tokens
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length >= 4) {
    const shortTokens = tokens.filter((t) => t.replace(/[^\w\u0A80-\u0AFF\u0900-\u097F]/g, '').length <= 2);
    if (shortTokens.length / tokens.length >= 0.7) {
      return true;
    }
  }

  return false;
}

/**
 * Clean person name candidate by stripping peripheral symbols and noise
 */
function cleanPersonName(str) {
  if (!str) return '';
  let cleaned = cleanNoise(str)
    .replace(/^[:\s\d+()\-#*~=|/_]+/, '')
    .replace(/[:\s\d+()#*~=|/_]+$/, '')
    .trim();

  // Strip leading 1-2 lowercase letters preceding a capitalized word (e.g. "ml PARTH PATEL" -> "PARTH PATEL")
  cleaned = cleaned.replace(/^[a-z]{1,2}\s+(?=[A-Z\u0A80-\u0AFF\u0900-\u097F])/, '');

  // Strip leading icon/noise symbols
  cleaned = cleaned.replace(/^[^a-zA-Z\u0A80-\u0AFF\u0900-\u097F]+/, '');

  // Strip isolated 1-2 digits (OCR noise from symbols/borders e.g. " 2 " or " 2, ")
  cleaned = cleaned.replace(/(?:^|\s)\d{1,2}[,.-]?(?:\s|$)/g, ' ').replace(/\s+/g, ' ').trim();

  // Strip trailing religious invocations e.g. "શ્રી eR ॥" or "શ્રી eR n"
  cleaned = cleaned.replace(/(?:॥|શ્રી\s*[a-zA-Z\u0A80-\u0AFF\u0900-\u097F\s]{1,12}\s*॥?)$/, '').trim();

  // If there's an unclosed parenthetical or trailing closing parenthesis, clean it
  if (!cleaned.includes('(') && cleaned.includes(')')) {
    cleaned = cleaned.replace(/\).*$/, '');
  }

  return cleaned.trim();
}

/**
 * Extracts brand hint token from corporate email domain (excluding public providers)
 */
function extractBrandTokenFromEmail(email) {
  if (!email || !email.includes('@')) return null;
  const domain = email.split('@')[1].toLowerCase().trim();
  if (PUBLIC_EMAIL_DOMAINS.has(domain)) return null;

  const parts = domain.split('.');
  if (parts.length >= 2 && parts[0].length >= 3) {
    return parts[0];
  }
  return null;
}

// ============================================================================
// 3. INDEPENDENT CLASSIFICATION MODULES (Layout-Aware)
// ============================================================================

/**
 * Extracts and validates email addresses from candidate lines
 * 
 * @param {Array<object>} lineItems - Array of line objects
 * @param {Set<number>} matchedLines - Set of consumed line indices
 * @returns {{ emails: Array<string>, primaryEmail: string, emailBrandToken: string|null }}
 */
function extractEmails(lineItems, matchedLines) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
  const emails = [];

  lineItems.forEach((item, idx) => {
    // Minor OCR spacing before dot e.g. "user@domain .com"
    const preprocessed = item.raw.replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+)\s*\.\s*([A-Za-z]{2,})\b/g, '$1.$2');
    const matches = preprocessed.match(emailRegex);
    if (matches) {
      matches.forEach((m) => {
        const cleanEm = m.trim().toLowerCase();
        if (!emails.includes(cleanEm)) emails.push(cleanEm);
      });

      const remainingText = cleanNoise(preprocessed.replace(emailRegex, ''));
      if (remainingText.length < 4 || /^(?:email|e-mail|mail|ઈમેલ|ईमेल)[:\s-]*$/i.test(remainingText)) {
        matchedLines.add(idx);
      }
    }
  });

  const primaryEmail = emails.length > 0 ? emails[0] : '';
  const emailBrandToken = primaryEmail ? extractBrandTokenFromEmail(primaryEmail) : null;

  return { emails, primaryEmail, emailBrandToken };
}

/**
 * Extracts and validates website URLs and social profiles from candidate lines
 * 
 * @param {Array<object>} lineItems - Array of line objects
 * @param {Set<number>} matchedLines - Set of consumed line indices
 * @returns {{ websites: Array<string>, primaryWebsite: string, websiteBrandToken: string|null, socialLinks: Array<string> }}
 */
function extractWebsite(lineItems, matchedLines) {
  const urlRegex = /(?:https?:\/\/[^\s]+|www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\b[a-zA-Z0-9-]+\.(?:com|in|org|net|co|io|tech|ai|biz|health|ca|co\.in|org\.in|gov\.in|edu|info|dev|app|me)\b(?:[^\s]*))/gi;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
  const websites = [];
  const socialLinks = [];

  lineItems.forEach((item, idx) => {
    const lineWithoutEmail = item.raw.replace(emailRegex, '');
    const urls = lineWithoutEmail.match(urlRegex);
    if (urls) {
      urls.forEach((url) => {
        let cleanUrl = url.trim().replace(/^[<(\[]+|[>)\].,;\\/]+$/g, '');

        // Exclude public email provider domains (e.g. gmail.com)
        const host = cleanUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
        if (PUBLIC_EMAIL_DOMAINS.has(host)) return;

        // Exclude academic degrees that look like dot notation
        if (ACADEMIC_DEGREE_REGEX.test(cleanUrl)) return;

        // Categorize social media profiles
        if (/linkedin\.com|twitter\.com|x\.com|github\.com|instagram\.com|facebook\.com|youtube\.com/i.test(cleanUrl)) {
          socialLinks.push(cleanUrl);
        } else {
          if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
          }
          if (!websites.includes(cleanUrl)) websites.push(cleanUrl);
        }
      });

      const remainingText = cleanNoise(lineWithoutEmail.replace(urlRegex, ''));
      if (remainingText.length < 4 || /^(?:web|website|site|url|વેબસાઇટ|वेबसाइट)[:\s-]*$/i.test(remainingText)) {
        matchedLines.add(idx);
      }
    }
  });

  const primaryWebsite = websites.length > 0 ? websites[0].toLowerCase() : '';
  let websiteBrandToken = null;
  if (primaryWebsite) {
    try {
      const parsed = new URL(primaryWebsite);
      const hostParts = parsed.hostname.replace(/^www\./, '').split('.');
      if (hostParts.length >= 2 && hostParts[0].length >= 3) {
        websiteBrandToken = hostParts[0].toLowerCase();
      }
    } catch (_) {}
  }

  return { websites, primaryWebsite, websiteBrandToken, socialLinks };
}

/**
 * Extracts and validates telephone and mobile numbers
 * 
 * @param {Array<object>} lineItems - Array of line objects
 * @param {Set<number>} matchedLines - Set of consumed line indices
 * @param {string} rawText - Full raw OCR text
 * @returns {{ phones: Array<string>, primaryPhone: string, alternatePhone: string }}
 */
function extractPhoneNumbers(lineItems, matchedLines, rawText) {
  const phoneList = [];

  lineItems.forEach((item, idx) => {
    let normalized = normalizeNumerals(item.raw);
    normalized = normalized.replace(/(\d)\s*\]\s*(\d)/g, '$1$2');

    // 1. Standard Indian 10-digit mobile patterns (6-9 followed by 9 digits)
    const indianMobileMatches = normalized.match(/(?:(?:\+91|91|0)[\s-]*)?([6-9]\d{4}[\s.-]?\d{5})\b|([6-9]\d{9})\b/g);
    if (indianMobileMatches) {
      indianMobileMatches.forEach((m) => {
        const digits = m.replace(/\D/g, '');
        const tenDigit =
          digits.length === 12 && digits.startsWith('91')
            ? digits.slice(2)
            : digits.length === 11 && digits.startsWith('0')
            ? digits.slice(1)
            : digits.length === 10
            ? digits
            : null;

        if (tenDigit && /^[6-9]/.test(tenDigit)) {
          phoneList.push(`+91 ${tenDigit.slice(0, 5)} ${tenDigit.slice(5)}`);
        }
      });
    }

    // 2. Standard Indian Landline with STD codes
    const landlineMatches = normalized.match(/(?:\+91[-\s]*)?(?:0[1-9]\d{1,3})[-\s]?(\d{3,4})[-\s]?(\d{4})\b/g);
    if (landlineMatches) {
      landlineMatches.forEach((lm) => phoneList.push(lm.trim()));
    }

    // 3. North American NANP (+1 (XXX) XXX-XXXX or 10-digit)
    const nanpMatches = normalized.match(/(?:\+\s*1[\s-]*)?\(?([2-9]\d{2})\)?[\s.-]?([2-9]\d{2})[\s.-]?(\d{4})\b/g);
    if (nanpMatches && (normalized.includes('+1') || /canada|usa|ontario|toronto|california/i.test(rawText))) {
      nanpMatches.forEach((nm) => {
        const digits = nm.replace(/\D/g, '');
        const core = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits.length === 10 ? digits : null;
        if (core) {
          phoneList.push(`+1 ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`);
        }
      });
    }

    // 4. General International standard numbers with country codes (+XX XXXXXXXX)
    const intlMatches = normalized.match(/\+\d{1,4}[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,6}\b/g);
    if (intlMatches) {
      intlMatches.forEach((im) => {
        const cleaned = im.trim();
        if (!phoneList.includes(cleaned)) phoneList.push(cleaned);
      });
    }

    const isAddressLine = ADDRESS_KEYWORDS.test(normalized);
    const lineHasPhone = Boolean(indianMobileMatches || landlineMatches || nanpMatches || intlMatches);

    if (lineHasPhone && !isAddressLine) {
      // Strip matched phone digits and phone labels to check residual text on line
      let stripped = normalized
        .replace(/(?:\+91|91|0)?[\s-]*[6-9]\d{4}[\s.-]?\d{5}\b/g, '')
        .replace(/[6-9]\d{9}\b/g, '')
        .replace(/(?:\+\s*1[\s-]*)?\(?[2-9]\d{2}\)?[\s.-]?[2-9]\d{2}[\s.-]?\d{4}\b/g, '')
        .replace(/\+\d{1,4}[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,6}\b/g, '')
        .replace(/(?:\b(?:call|mobile|mob|cell|phone|ph|tel|mo|m|contact|helpline)\b|(?:મોબાઇલ|મો\.|ફોન|मोबाइल|फोन))[:\s-]*/gi, '');

      stripped = stripped.replace(RELIGIOUS_INVOCATIONS_REGEX, '');

      const residual = cleanNoise(stripped)
        .replace(/^[^a-zA-Z0-9\u0A80-\u0AFF\u0900-\u097F]+/, '')
        .replace(/[^a-zA-Z0-9\u0A80-\u0AFF\u0900-\u097F]+$/, '')
        .trim();

      if (
        /(?:\b(?:call|mobile|mob|cell|phone|ph|tel|mo|m|contact|helpline)\b|(?:મોબાઇલ|મો\.|ફોન|मोबाइल|फोन))[:\s-]*\+?[\d\s\-/(),|]{7,}/i.test(
          item.raw
        ) ||
        /^\+?[\d\s\-/(),|]{8,}$/.test(cleanNoise(normalized)) ||
        residual.length <= 4 ||
        /^(?:office|home|work|direct|fax|whatsapp|whatapp)$/i.test(residual)
      ) {
        matchedLines.add(idx);
      } else {
        // Significant text remains on line (e.g. Person Name or Company Brand)
        // Update line item with residual text so subsequent stages can classify it
        item.raw = residual;
        item.clean = cleanNoise(residual);
      }
    }
  });

  // Deduplicate phones based on standard core digits
  const seenDigits = new Set();
  const uniquePhones = [];
  phoneList.forEach((p) => {
    const digits = p.replace(/\D/g, '').slice(-10);
    if (digits.length >= 8) {
      if (!seenDigits.has(digits)) {
        seenDigits.add(digits);
        uniquePhones.push(p);
      }
    } else if (!uniquePhones.includes(p)) {
      uniquePhones.push(p);
    }
  });

  return {
    phones: uniquePhones,
    primaryPhone: uniquePhones[0] || '',
    alternatePhone: uniquePhones[1] || ''
  };
}

/**
 * Extracts professional job titles or designations
 * 
 * @param {Array<object>} lineItems - Array of line objects
 * @param {Set<number>} matchedLines - Set of consumed line indices
 * @returns {{ designation: string, designationLineIdx: number, inlineName: string }}
 */
function extractDesignation(lineItems, matchedLines) {
  let designation = '';
  let designationLineIdx = -1;
  let inlineName = '';

  for (let idx = 0; idx < lineItems.length; idx++) {
    if (matchedLines.has(idx)) continue;
    const item = lineItems[idx];
    const line = item.raw;

    // 1. Check parenthetical inline designation e.g. "Rahul Mehta (Managing Director)"
    const parenMatch = line.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const candidateTitle = parenMatch[1].trim();
      const isDesignation = GENERIC_DESIGNATION_PATTERNS.some((pattern) => pattern.test(candidateTitle));
      if (isDesignation && !COMPANY_SUFFIX_REGEX.test(candidateTitle)) {
        designation = cleanNoise(candidateTitle);
        const namePart = line.split('(')[0].trim();
        if (namePart.length >= 3 && !isNoiseLine(namePart)) {
          inlineName = cleanPersonName(namePart);
        }
        matchedLines.add(idx);
        designationLineIdx = idx;
        break;
      }
    }

    // 2. Exclude corporate entity lines
    const isCompanyLine =
      (COMPANY_SUFFIX_REGEX.test(line) || INDIC_COMPANY_SUFFIXES.some((k) => line.includes(k))) &&
      !/\b(?:senior\s*associate|associate\s*director|associate\s*partner|principal\s*architect|associate\s*advocate)\b/i.test(line);
    if (isCompanyLine) continue;

    // 3. Exclude person honorifics
    if (HONORIFIC_REGEX.test(line) && !/\b(?:senior|junior|chief|head|lead)\s+(?:advocate|architect|engineer|officer)\b/i.test(line)) {
      continue;
    }

    // 4. Match generic designation pattern
    const matched = GENERIC_DESIGNATION_PATTERNS.some((pattern) => pattern.test(line));
    if (matched) {
      let cleaned = cleanNoise(line)
        .replace(/^[-–—:\s()0-9«»=~]+/, '')
        .replace(/[-–—:\s()0-9«»=~]+$/, '')
        .trim();

      if (cleaned.length >= 2 && cleaned.length <= 50) {
        designation = cleaned;
        matchedLines.add(idx);
        designationLineIdx = idx;
        break;
      }
    }
  }

  return { designation, designationLineIdx, inlineName };
}

/**
 * Extracts company or organization name using evidence-based scoring and layout prominence
 * 
 * @param {Array<object>} lineItems - Array of line objects
 * @param {Set<number>} matchedLines - Set of consumed line indices
 * @param {string|null} emailBrandToken - Derived brand token from corporate email/website
 * @returns {{ company: string, companyLineIdx: number }}
 */
function extractCompanyName(lineItems, matchedLines, emailBrandToken) {
  const companyCandidates = [];

  lineItems.forEach((item, idx) => {
    if (matchedLines.has(idx) || isNoiseLine(item.raw)) return;

    const line = item.raw;
    // Reject any candidate whose alphabetical letter count is < 3
    const alphaCount = line.replace(/[^a-zA-Z\u0A80-\u0AFF\u0900-\u097F]/g, '').length;
    if (alphaCount < 3) return;

    let score = 0;
    const lower = line.toLowerCase();

    // Signal 1: Corporate Entity Suffix (+50 points)
    if (COMPANY_SUFFIX_REGEX.test(line) || INDIC_COMPANY_SUFFIXES.some((k) => line.includes(k))) {
      score += 50;
    }

    // Signal 2: Corporate Email / Domain Brand Match (+40 points)
    if (emailBrandToken && lower.includes(emailBrandToken)) {
      score += 40;
    }

    // Signal 3: Preceded by company label (+30 points)
    if (/^(?:company|firm|m\/s|મેસર્સ|કંપની|कंपनी)[:\s-]/i.test(line)) {
      score += 30;
    }

    // Signal 4: Layout Visual Prominence (+25 points for large font logo/header)
    if (item.fontSizeRatio >= 1.3) {
      score += 25;
    }

    // Signal 5: Layout Position (Top / Upper-Center +15 points)
    if (item.yRatio <= 0.40 && !/\d{5,}/.test(line) && !line.includes('@') && !isNonPersonText(line)) {
      score += 15;
    }

    // Signal 6: All-caps word structure (common for brand headers)
    if (/^[A-Z0-9\s&.-]{3,}$/.test(line) && line.replace(/[^A-Z]/g, '').length >= 3 && !isNonPersonText(line)) {
      score += 15;
    }

    // Negative Signals
    if (/^\d{1,5}(?:[,\s/-]+\d{1,5})*[,\s/-]+[a-zA-Z\u0A80-\u0AFF\u0900-\u097F]/i.test(line)) score -= 70; // Street/building address number
    if (ADDRESS_KEYWORDS.test(line) || POSTAL_CODE_REGEX.test(line)) score -= 70;
    if (HONORIFIC_REGEX.test(line)) score -= 50;
    if (GENERIC_DESIGNATION_PATTERNS.some((p) => p.test(line))) score -= 40;
    if (MARKETING_SLOGAN_REGEX.test(line)) score -= 50;
    if (isNonPersonText(line) && !COMPANY_SUFFIX_REGEX.test(line) && !INDIC_COMPANY_SUFFIXES.some((k) => line.includes(k))) {
      // Pure product or category line (e.g. "GOLD FINISHED JEWELRY")
      score -= 50;
    }
    if (line.includes('@')) score -= 60;
    if (/\d{7,}/.test(line)) score -= 60;
    if (item.yRatio >= 0.75) score -= 30; // Bottom region is almost always address/footer

    if (score >= 20) {
      companyCandidates.push({ line, score, idx, item });
    }
  });

  let company = '';
  let companyLineIdx = -1;

  if (companyCandidates.length > 0) {
    companyCandidates.sort((a, b) => b.score - a.score);
    const bestComp = companyCandidates[0];
    const endsWithAbbrDot = /\b(?:inc|ltd|co|llc|corp)\.$/i.test(bestComp.line.trim());
    let cleanComp = cleanNoise(bestComp.line)
      .replace(/^(?:company|firm|m\/s|મેસર્સ|કંપની|कंपनी)[:\s-]*/i, '')
      .replace(/[\s,]+[a-zA-Z\u0A80-\u0AFF\u0900-\u097F]{1,2}$/, '')
      .replace(/^[a-zA-Z\u0A80-\u0AFF\u0900-\u097F]{1,2}\s+(?=[a-zA-Z\u0A80-\u0AFF\u0900-\u097F]{3,})/, '')
      .replace(/[\s,*#~=._-]+$/, '')
      .trim();

    if (endsWithAbbrDot && !cleanComp.endsWith('.')) {
      cleanComp += '.';
    }

    // Check if immediately preceding line was an isolated brand token (e.g., line N-1: Brand Header, line N: Corporate Suffix)
    if (bestComp.idx > 0) {
      const prevLine = lineItems[bestComp.idx - 1]?.raw || '';
      const cleanPrev = cleanNoise(prevLine).replace(/^[0-9\s:()\-+]+/, '').replace(/[0-9\s:()\-+]+$/, '').trim();
      if (
        cleanPrev.length >= 3 &&
        cleanPrev.length <= 30 &&
        !isNoiseLine(cleanPrev) &&
        !/^[-–—\s]*(?:back|front)\s*side[-–—\s]*$/i.test(cleanPrev) &&
        !HONORIFIC_REGEX.test(cleanPrev) &&
        !ADDRESS_KEYWORDS.test(cleanPrev) &&
        !/\d{3,}/.test(cleanPrev) &&
        !COMPANY_SUFFIX_REGEX.test(cleanComp)
      ) {
        cleanComp = `${cleanPrev} ${cleanComp}`.replace(/[\s,*#~=._-]+$/, '').trim();
        matchedLines.add(bestComp.idx - 1);
      }
    }

    company = cleanComp;
    companyLineIdx = bestComp.idx;
    matchedLines.add(bestComp.idx);
  } else if (emailBrandToken && emailBrandToken.length >= 3) {
    // Generic fallback: format domain brand token if non-public corporate email
    company = emailBrandToken.charAt(0).toUpperCase() + emailBrandToken.slice(1);
  }

  return { company, companyLineIdx };
}

/**
 * Extracts personal contact names and multi-person employee groups using layout and linguistic context
 * 
 * @param {Array<object>} lineItems - Array of line objects
 * @param {Set<number>} matchedLines - Set of consumed line indices
 * @param {number} designationIdx - Line index of detected designation
 * @param {string} inlineName - Name found inline with designation parentheses
 * @returns {{ fullName: string, people: Array<string>, nameLineIdx: number }}
 */
function extractPersonName(lineItems, matchedLines, designationIdx, inlineName = '') {
  const nameCandidates = [];
  const recognizedPeople = [];

  if (inlineName && inlineName.length >= 3 && !isNonPersonText(inlineName)) {
    recognizedPeople.push(inlineName);
  }

  // 1. Proximity signal: Line immediately above or below detected designation
  if (designationIdx !== -1) {
    const adjacentIndices = [designationIdx - 1, designationIdx + 1];
    adjacentIndices.forEach((adjIdx) => {
      if (adjIdx >= 0 && adjIdx < lineItems.length && !matchedLines.has(adjIdx) && !isNoiseLine(lineItems[adjIdx].raw)) {
        const item = lineItems[adjIdx];
        const line = item.raw;
        if (
          !ADDRESS_KEYWORDS.test(line) &&
          !COMPANY_SUFFIX_REGEX.test(line) &&
          !MARKETING_SLOGAN_REGEX.test(line) &&
          !isNonPersonText(line)
        ) {
          nameCandidates.push({ line, score: 65, idx: adjIdx, item });
        }
      }
    });
  }

  // 2. Scan remaining lines for person name patterns
  lineItems.forEach((item, idx) => {
    if (matchedLines.has(idx) || isNoiseLine(item.raw)) return;

    let score = 0;
    const line = item.raw;
    const clean = cleanPersonName(line);

    // Multi-person line detection e.g. "Gaurav Dave & Neha Joshi"
    if (/[&+]|\band\b|\bઅને\b/i.test(line)) {
      const parts = line.split(/[&+]|\band\b|\bઅને\b/i).map((p) => cleanPersonName(p)).filter((p) => p.length >= 3);
      if (
        parts.length >= 2 &&
        !ADDRESS_KEYWORDS.test(line) &&
        !COMPANY_SUFFIX_REGEX.test(line) &&
        !parts.some((p) => isNonPersonText(p))
      ) {
        parts.forEach((p) => {
          if (!recognizedPeople.includes(p)) recognizedPeople.push(p);
        });
        matchedLines.add(idx);
        return;
      }
    }

    // Disqualifiers
    if (isNonPersonText(clean) || isNonPersonText(line)) return;
    if (COMPANY_SUFFIX_REGEX.test(line) || INDIC_COMPANY_SUFFIXES.some((k) => line.includes(k))) return;
    if (ADDRESS_KEYWORDS.test(line)) return;
    if (MARKETING_SLOGAN_REGEX.test(line)) return;
    if (/\d{3,}/.test(clean)) return;

    // Signal 1: Honorific prefix (+40 points)
    if (HONORIFIC_REGEX.test(line)) {
      score += 40;
    }

    // Signal 2: Standard Name Capitalization (2 to 3 capitalized Latin words)
    if (/^[A-Z][a-zA-Z.'-]{1,}(?:\s+[A-Z][a-zA-Z.'-]{1,}){1,2}$/.test(clean)) {
      score += 25;
    }

    // Signal 3: All caps 2-3 word name (e.g. "PARTH PATEL")
    if (/^[A-Z]{2,}(?:\s+[A-Z]{2,}){1,2}$/.test(clean)) {
      score += 20;
    }

    // Signal 4: Indic script name structure (Gujarati or Hindi words)
    if (/[\u0A80-\u0AFF\u0900-\u097F]/.test(clean) && clean.length >= 3 && clean.length <= 35) {
      score += 25;
    }

    // Signal 5: Layout Position (Top half of card +15 points)
    if (item.yRatio <= 0.50) score += 15;

    // Signal 6: Medium-to-large font size
    if (item.fontSizeRatio >= 1.0) score += 10;

    if (score >= 25) {
      nameCandidates.push({ line: clean, score, idx, item });
    }
  });

  let nameLineIdx = -1;

  if (nameCandidates.length > 0) {
    nameCandidates.sort((a, b) => b.score - a.score);
    const bestName = nameCandidates[0];
    let cleaned = cleanPersonName(bestName.line);
    nameLineIdx = bestName.idx;

    // Check if immediately following line is a parenthetical affiliation / sub-caste: "(વિકળીયા)"
    if (bestName.idx + 1 < lineItems.length && !matchedLines.has(bestName.idx + 1)) {
      const nextLine = lineItems[bestName.idx + 1]?.raw?.trim() || '';
      const parenMatch = nextLine.match(/^\(([a-zA-Z\u0A80-\u0AFF\u0900-\u097F\s]{2,25})\)/);
      if (parenMatch && !GENERIC_DESIGNATION_PATTERNS.some((p) => p.test(parenMatch[1]))) {
        cleaned = `${cleaned} (${parenMatch[1].trim()})`;
        matchedLines.add(bestName.idx + 1);
      }
    }

    if (!recognizedPeople.includes(cleaned)) {
      recognizedPeople.unshift(cleaned);
    }
    matchedLines.add(bestName.idx);
  }

  const people = recognizedPeople.filter((p) => p.length >= 3 && !ADDRESS_KEYWORDS.test(p) && !isNonPersonText(p));
  const fullName = people.length > 0 ? people[0] : '';

  return { fullName, people, nameLineIdx };
}

/**
 * Extracts and segments physical street address lines
 * 
 * @param {Array<object>} lineItems - Array of line objects
 * @param {Set<number>} matchedLines - Set of consumed line indices
 * @returns {{ addresses: Array<string>, fullAddress: string }}
 */
function extractAddress(lineItems, matchedLines) {
  const addressParts = [];

  lineItems.forEach((item, idx) => {
    if (matchedLines.has(idx)) return;
    const line = item.raw;

    const isAddrLine =
      ADDRESS_KEYWORDS.test(line) ||
      POSTAL_CODE_REGEX.test(line) ||
      /^\d{1,5}(?:[,\s/-]+\d{1,5})*[,\s/-]+[a-zA-Z\u0A80-\u0AFF\u0900-\u097F]/i.test(line);

    if (isAddrLine && !line.includes('@') && !/^\+?\d{1,4}[-\s]?\d{6,}/.test(line)) {
      let clean = cleanNoise(line)
        .replace(/^(?:address|addr|સરનામું|સરનામુ|पता|office|factory)[:\s-]*/i, '')
        .replace(/^(?:scan\s*me|qr\s*code)[:\s?]*/i, '')
        .replace(/^[^a-zA-Z0-9\u0A80-\u0AFF\u0900-\u097F]*/, '')
        .replace(/[,|\s]+$/, '')
        .trim();

      clean = normalizeNumerals(clean);

      // Strip trailing phone numbers from address line
      clean = clean.replace(/(?:\b(?:ph|phone|mobile|tel|call)\b)[:\s.-]*\+?[\d\s\-/(),|]+$/i, '').trim();

      if (clean.length > 3 && !/^(?:office|factory|branch)$/i.test(clean)) {
        addressParts.push(clean);
        matchedLines.add(idx);
      }
    }
  });

  const fullAddress = addressParts.join(', ');
  return { addresses: addressParts, fullAddress };
}

/**
 * Extracts City, State, and Country without guessing unprinted geographic details
 * 
 * @param {string} text - Combined address and card text
 * @param {string} addressText - Cleaned address string
 * @returns {{ city: string, state: string, country: string }}
 */
function extractLocation(text, addressText = '') {
  let detectedState = '';
  let detectedCountry = '';

  // 1. Indian states (Unicode-safe substring check)
  for (const st of INDIAN_STATES) {
    if (text.toLowerCase().includes(st.toLowerCase())) {
      detectedState = st;
      detectedCountry = 'India';
      break;
    }
  }

  // 2. International regions if Indian state not detected
  if (!detectedState) {
    for (const reg of INTERNATIONAL_REGIONS) {
      if (text.toLowerCase().includes(reg.state.toLowerCase())) {
        detectedState = reg.state;
        detectedCountry = reg.country;
        break;
      }
    }
  }

  // 3. Detect explicit country markers
  if (!detectedCountry) {
    if (/\b(?:Canada|\.ca)\b/i.test(text) || /\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b/.test(text)) {
      detectedCountry = 'Canada';
    } else if (/\b(?:USA|United States)\b/i.test(text)) {
      detectedCountry = 'USA';
    } else if (/\b(?:India|\.in)\b/i.test(text) || detectedState) {
      detectedCountry = 'India';
    } else if (/\b(?:Indonesia|\+62)\b/i.test(text)) {
      detectedCountry = 'Indonesia';
    }
  }

  let city = '';
  if (detectedState) {
    // City typically immediately precedes State: "City, State" or "City - State"
    const escaped = detectedState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cityMatch = text.match(new RegExp('(?:^|[,\\n])\\s*((?:(?:नई|new|greater|navi|old|san|los|las|salt|west|east|north|south)\\s+)?[a-zA-Z\\u0A80-\\u0AFF\\u0900-\\u097F]{3,})\\s*[,–-]\\s*' + escaped, 'i'));
    if (cityMatch) {
      const candidate = cityMatch[1].trim();
      if (!ADDRESS_KEYWORDS.test(candidate) && !/^(?:road|street|complex|tower|park|square|suite|floor|opp|near|building)$/i.test(candidate)) {
        city = candidate;
      }
    }
  }

  // Fallback 1: Check city preceding a 6-digit PIN code: "City - 395004"
  if (!city) {
    const pinMatch = text.match(/([a-zA-Z\u0A80-\u0AFF\u0900-\u097F]{3,})\s*(?:[-\s,]+)\s*\b\d{6}\b/);
    if (pinMatch) {
      const candidate = pinMatch[1].trim();
      if (!ADDRESS_KEYWORDS.test(candidate) && !INDIAN_STATES.includes(candidate)) {
        city = candidate;
      }
    }
  }

  // Fallback 2: Check trailing locality segment in address lines: "... Yogi Chowk, Surat."
  if (!city && addressText) {
    const segments = addressText
      .split(/[,|\n]/)
      .map((s) => cleanNoise(s).replace(/[.\s]+$/, '').trim())
      .filter(Boolean);

    if (segments.length > 1) {
      const lastSegment = segments[segments.length - 1];
      const tokens = lastSegment.split(/\s+/);
      if (
        tokens.length <= 2 &&
        lastSegment.length >= 3 &&
        lastSegment.length <= 25 &&
        !/\d/.test(lastSegment) &&
        !ADDRESS_KEYWORDS.test(lastSegment) &&
        !isNonPersonText(lastSegment)
      ) {
        city = lastSegment;
      }
    }
  }

  return { city, state: detectedState, country: detectedCountry };
}

// ============================================================================
// 4. MAIN EXTRACTION ENGINE & FACTORY
// ============================================================================

/**
 * Creates an empty contact structure with all expected fields
 * 
 * @returns {object}
 */
function createEmptyContact() {
  return {
    fullName: '',
    company: '',
    designation: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: '',
    notes: '',
    phones: [],
    emails: [],
    websites: [],
    addresses: [],
    people: [],
    confidence: 0,
    needsReview: false,
    reviewReasons: [],
  };
}

/**
 * Main Generic Contact Extraction Function (Layout-Aware with Text Fallback)
 * 
 * @param {string} rawText - Raw OCR text extracted from business card
 * @param {number} [ocrConfidence=0] - Confidence score reported by OCR engine (0-100)
 * @param {object} [options={}] - Optional layout metadata { layout, backLayout }
 * @returns {object} Extracted structured contact object
 */
function extractContactFromText(rawText, ocrConfidence = 0, options = {}) {
  if (!rawText || typeof rawText !== 'string') {
    return createEmptyContact();
  }

  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return createEmptyContact();
  }

  const matchedLines = new Set();
  const contact = createEmptyContact();

  // --------------------------------------------------------------------------
  // STEP 1: Construct Unified Layout Line Items
  // --------------------------------------------------------------------------
  const layout = options.layout || null;
  const hasLayout = Boolean(layout && layout.lines && layout.lines.length > 0);

  const lineItems = rawLines.map((raw, idx) => {
    // If layout line matching is available, attach spatial coordinates
    let xRatio = 0.1;
    let yRatio = idx / Math.max(rawLines.length - 1, 1);
    let fontSizeRatio = 1.0;
    let bbox = null;
    let conf = ocrConfidence || 75;

    if (hasLayout && layout.lines[idx]) {
      const ll = layout.lines[idx];
      xRatio = ll.xRatio || xRatio;
      yRatio = ll.yRatio !== undefined ? ll.yRatio : yRatio;
      fontSizeRatio = ll.fontSizeRatio || 1.0;
      bbox = ll.bbox || null;
      conf = ll.confidence || conf;
    }

    return {
      raw,
      clean: cleanNoise(raw),
      idx,
      xRatio,
      yRatio,
      fontSizeRatio,
      bbox,
      confidence: conf,
      hasBbox: hasLayout
    };
  });

  // --------------------------------------------------------------------------
  // STEP 2: Process Religious Invocations / Opening Blessings
  // --------------------------------------------------------------------------
  lineItems.forEach((item, idx) => {
    if (
      RELIGIOUS_INVOCATIONS_REGEX.test(item.raw) &&
      item.raw.length < 40 &&
      !item.raw.includes('@') &&
      !item.raw.includes('www.') &&
      !/\d{7,}/.test(item.raw)
    ) {
      matchedLines.add(idx);
    }
  });

  // --------------------------------------------------------------------------
  // STEP 3: Generic Email Extraction
  // --------------------------------------------------------------------------
  const emailRes = extractEmails(lineItems, matchedLines);
  contact.emails = emailRes.emails;
  contact.email = emailRes.primaryEmail;

  // --------------------------------------------------------------------------
  // STEP 4: Generic Website & Social Profile Extraction
  // --------------------------------------------------------------------------
  const webRes = extractWebsite(lineItems, matchedLines);
  contact.websites = webRes.websites;
  contact.website = webRes.primaryWebsite;
  if (webRes.socialLinks.length > 0) {
    contact.notes = `Social: ${webRes.socialLinks.join(', ')}`;
  }

  // Brand token derived from email domain or website URL
  const brandToken = emailRes.emailBrandToken || webRes.websiteBrandToken;

  // --------------------------------------------------------------------------
  // STEP 5: Generic Phone Number Extraction
  // --------------------------------------------------------------------------
  const phoneRes = extractPhoneNumbers(lineItems, matchedLines, rawText);
  contact.phones = phoneRes.phones;
  contact.phone = phoneRes.primaryPhone;
  contact.alternatePhone = phoneRes.alternatePhone;

  // --------------------------------------------------------------------------
  // STEP 6: Generic Marketing / Product Lines / Slogans to Notes
  // --------------------------------------------------------------------------
  const notesLines = [];
  lineItems.forEach((item, idx) => {
    if (matchedLines.has(idx)) return;
    if (ADDRESS_KEYWORDS.test(item.raw)) return; // Never consume address lines

    if (MARKETING_SLOGAN_REGEX.test(item.raw)) {
      let clean = cleanNoise(item.raw)
        .replace(/^[^a-zA-Z\u0A80-\u0AFF\u0900-\u097F]*/, '')
        .trim();
      if (clean.length > 3) {
        notesLines.push(clean);
        matchedLines.add(idx);
      }
    }
  });

  if (notesLines.length > 0) {
    contact.notes = contact.notes
      ? `${contact.notes} | ${notesLines.join(', ')}`
      : notesLines.join(', ');
  }

  // --------------------------------------------------------------------------
  // STEP 7: Generic Designation / Title Extraction
  // --------------------------------------------------------------------------
  const desRes = extractDesignation(lineItems, matchedLines);
  contact.designation = desRes.designation;

  // --------------------------------------------------------------------------
  // STEP 8: Generic Company Name Extraction (Evaluated Before Address)
  // --------------------------------------------------------------------------
  const compRes = extractCompanyName(lineItems, matchedLines, brandToken);
  contact.company = compRes.company;

  // --------------------------------------------------------------------------
  // STEP 9: Generic Person Name Extraction & Multi-Person Recognition
  // --------------------------------------------------------------------------
  const nameRes = extractPersonName(lineItems, matchedLines, desRes.designationLineIdx, desRes.inlineName);
  contact.fullName = nameRes.fullName;
  contact.people = nameRes.people;

  // --------------------------------------------------------------------------
  // STEP 10: Generic Address Extraction & Location Parsing
  // --------------------------------------------------------------------------
  const addrRes = extractAddress(lineItems, matchedLines);
  contact.addresses = addrRes.addresses;
  contact.address = addrRes.fullAddress;

  const loc = extractLocation(`${contact.address} ${rawText}`, contact.address);
  contact.city = loc.city;
  contact.state = loc.state;
  contact.country = loc.country;

  // --------------------------------------------------------------------------
  // STEP 11: Generic Confidence Scoring & Manual Review Assessment
  // --------------------------------------------------------------------------
  let score = 100;
  const reviewReasons = [];

  if (ocrConfidence > 0 && ocrConfidence < 60) {
    score -= 20;
    reviewReasons.push(`Low OCR confidence score (${ocrConfidence}%)`);
  }

  if (!contact.fullName && !contact.company) {
    score -= 40;
    reviewReasons.push('Neither person name nor company name could be identified');
  } else if (!contact.fullName) {
    score -= 15;
    reviewReasons.push('No person name found on card (may be company-only or back side)');
  }

  if (contact.phones.length === 0 && contact.emails.length === 0) {
    score -= 20;
    reviewReasons.push('No telephone number or email address found');
  }

  if (!hasLayout) {
    // Note reduced extraction reliability if OCR bounding boxes were not supplied
    contact.extractionMethod = 'text-fallback';
  } else {
    contact.extractionMethod = 'layout-aware';
  }

  contact.confidence = Math.max(0, Math.min(100, score));
  contact.needsReview = reviewReasons.length > 0 || contact.confidence < 70;
  contact.reviewReasons = reviewReasons;

  return contact;
}

module.exports = {
  extractContactFromText,
  createEmptyContact,
  extractPersonName,
  extractCompanyName,
  extractDesignation,
  extractPhoneNumbers,
  extractEmails,
  extractWebsite,
  extractAddress,
  extractLocation,
  isNonPersonText,
  cleanPersonName,
  normalizeNumerals,
};
