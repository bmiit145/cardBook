const { parsePhoneNumberFromString } = require('libphonenumber-js');
const logger = require('../utils/logger');

/**
 * Advanced Business Card Contact Extraction Engine
 * Supports English, Gujarati, and Hindi contact patterns with Unicode awareness
 */

// Common Designations / Job Titles
const DESIGNATION_KEYWORDS = [
  'chief executive officer', 'ceo', 'chief technology officer', 'cto', 'chief financial officer', 'cfo',
  'chief operating officer', 'coo', 'founder', 'co-founder', 'co founder', 'managing director', 'md',
  'director', 'executive director', 'president', 'vice president', 'vp', 'general manager', 'gm',
  'senior manager', 'manager', 'assistant manager', 'team lead', 'project manager', 'lead engineer',
  'software engineer', 'developer', 'architect', 'solution architect', 'consultant', 'senior consultant',
  'advisor', 'advocate', 'chartered accountant', 'ca', 'doctor', 'dr.', 'proprietor', 'partner',
  'marketing manager', 'sales head', 'business development manager', 'bdm', 'operations manager',
  'specialist', 'associate', 'head of', 'executive',
  // Gujarati
  'નિયામક', 'સંસ્થાપક', 'સહ-સંસ્થાપક', 'પ્રમુખ', 'ઉપપ્રમુખ', 'ભાગીદાર', 'મેનેજર', 'સંચાલક', 'માલિક', 'સલાહકાર',
  // Hindi
  'निदेशक', 'प्रबंधक', 'संस्थापक', 'सह-संस्थापक', 'अध्यक्ष', 'उपाध्यक्ष', 'साझेदार', 'मालिक', 'सलाहकार', 'संचालक'
];

// Indic script company keywords
const INDIC_COMPANY_KEYWORDS = [
  'પ્રાઇવેટ લિમિટેડ', 'પ્રાઇવેટ લિ', 'પ્રા. લિ.', 'પ્રા.લિ.', 'લિમિટેડ', 'ઇન્ડસ્ટ્રીઝ', 'ટેકનોલોજી', 'એન્ટરપ્રાઇઝ',
  'પ્રાઇવેટ', 'ઇન્ડસ્ટ્રી',
  'प्राइवेट लिमिटेड', 'लिमिटेड', 'उद्योग', 'समूह', 'टेक्नोलॉजी', 'एंटरप्राइजेज'
];

// English Company corporate identifiers (ASCII word boundaries work here)
const COMPANY_SUFFIX_REGEX = /\b(pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|llp|llc|inc\.?|incorporated|corp\.?|corporation|technologies|solutions|infotech|services|enterprises|industries|group|international|consultancy|associates|agency|studio|holdings|logistics|trading|traders|& co\.?|& sons)\b/i;

// Indian States and Union Territories
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'New Delhi', 'Chandigarh',
  // Gujarati names
  'ગુજરાત', 'મહારાષ્ટ્ર', 'દિલ્હી', 'રાજસ્થાન', 'પંજાબ', 'હરિયાણા',
  // Hindi names
  'गुजरात', 'महाराष्ट्र', 'दिल्ली', 'राजस्थान', 'पंजाब', 'हरियाणा', 'उत्तर प्रदेश', 'मध्य प्रदेश'
];

// Major Indian Cities
const MAJOR_CITIES = [
  'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh',
  'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad',
  'Bengaluru', 'Bangalore', 'Mysuru', 'Mangalore',
  'Chennai', 'Coimbatore', 'Madurai',
  'Hyderabad', 'Secunderabad', 'Visakhapatnam', 'Vijayawada',
  'Kolkata', 'Howrah',
  'Delhi', 'New Delhi', 'Noida', 'Greater Noida', 'Gurgaon', 'Gurugram', 'Faridabad', 'Ghaziabad',
  'Jaipur', 'Jodhpur', 'Udaipur', 'Kota',
  'Indore', 'Bhopal', 'Gwalior', 'Jabalpur',
  'Chandigarh', 'Ludhiana', 'Amritsar',
  'Lucknow', 'Kanpur', 'Varanasi', 'Prayagraj', 'Agra',
  'Kochi', 'Thiruvananthapuram', 'Patna', 'Bhubaneswar',
  // Gujarati
  'અમદાવાદ', 'સુરત', 'વડોદરા', 'રાજકોટ', 'ભાવનગર', 'ગાંધીનગર',
  // Hindi
  'अहमदाबाद', 'सूरत', 'वडोदरा', 'राजकोट', 'मुंबई', 'पुणे', 'दिल्ली', 'नई दिल्ली', 'बेंगलुरु', 'हैदराबाद', 'चेन्नई', 'कोलकाता', 'जयपुर', 'इंदौर'
];

// Helper to check if string contains Indic script (Devanagari, Gujarati, etc.)
function containsIndic(str) {
  return /[\u0900-\u097F\u0A80-\u0AFF]/.test(str);
}

/**
 * Parse and structure raw text into business card contact fields
 * 
 * @param {string} rawText - OCR extracted raw text
 * @returns {object} Extracted structured contact fields
 */
function extractContactFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return createEmptyContact();
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const matchedLines = new Set();
  const contact = createEmptyContact();
  contact.country = 'India';

  // 1. Extract Emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const emails = [];
  lines.forEach((line, idx) => {
    const matches = line.match(emailRegex);
    if (matches) {
      matches.forEach((m) => emails.push(m.trim().toLowerCase()));
      matchedLines.add(idx);
    }
  });
  if (emails.length > 0) {
    contact.email = emails[0];
  }

  // 2. Extract Websites and Social Links
  const urlRegex = /(https?:\/\/[^\s]+|www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9-]+\.(?:com|in|org|net|co|io|tech|ai|biz|co\.in|org\.in|gov\.in)\b[^\s]*)/gi;
  const websites = [];
  const socialLinks = [];

  lines.forEach((line, idx) => {
    if (emails.some((e) => line.includes(e))) return;

    const urls = line.match(urlRegex);
    if (urls) {
      urls.forEach((url) => {
        let cleanUrl = url.trim().replace(/^[<(\[]+|[>)\].,;]+$/g, '');
        if (cleanUrl.toLowerCase().includes('linkedin.com') ||
            cleanUrl.toLowerCase().includes('twitter.com') ||
            cleanUrl.toLowerCase().includes('x.com') ||
            cleanUrl.toLowerCase().includes('github.com') ||
            cleanUrl.toLowerCase().includes('instagram.com') ||
            cleanUrl.toLowerCase().includes('facebook.com')) {
          socialLinks.push(cleanUrl);
        } else {
          if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
          }
          websites.push(cleanUrl);
        }
      });
      matchedLines.add(idx);
    }
  });

  if (websites.length > 0) contact.website = websites[0];
  if (socialLinks.length > 0) contact.notes = `Social: ${socialLinks.join(', ')}`;

  // 3. Extract Phone Numbers using regex + libphonenumber-js
  const phoneCandidates = [];
  const phoneRegex = /(?:(?:\+|0{0,2})(?:91)[\s-]*)?(?:(?:\d{2,5}[\s-]*\d{5,8})|(?:\d{5}[\s-]*\d{5})|(?:[6-9]\d{9}))/g;

  lines.forEach((line, idx) => {
    const hasPhoneLabel = /(?:tel|ph|phone|mobile|mob|cell|m:|p:|call|whatsapp|whatsapp\s+no|mo\.|મોબાઇલ|મો\.)/i.test(line);
    const matches = line.match(phoneRegex);

    if (matches) {
      matches.forEach((candidate) => {
        const cleaned = candidate.replace(/[\s-]/g, '');
        if (cleaned.length >= 7 && cleaned.length <= 15) {
          try {
            const parsed = parsePhoneNumberFromString(candidate, 'IN');
            if (parsed && parsed.isValid()) {
              phoneCandidates.push(parsed.formatInternational());
            } else {
              if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
                phoneCandidates.push(`+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`);
              } else if (candidate.length >= 8) {
                phoneCandidates.push(candidate.trim());
              }
            }
          } catch (e) {
            phoneCandidates.push(candidate.trim());
          }
        }
      });
      if (hasPhoneLabel) {
        matchedLines.add(idx);
      }
    }
  });

  const uniquePhones = Array.from(new Set(phoneCandidates));
  if (uniquePhones.length > 0) {
    contact.phone = uniquePhones[0];
  }
  if (uniquePhones.length > 1) {
    contact.alternatePhone = uniquePhones[1];
  }

  // 4. Extract Designation (Job Title)
  lines.forEach((line, idx) => {
    if (matchedLines.has(idx)) return;

    for (const keyword of DESIGNATION_KEYWORDS) {
      const isInd = containsIndic(keyword);
      const regex = isInd ? new RegExp(keyword, 'i') : new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(line)) {
        contact.designation = line;
        matchedLines.add(idx);
        break;
      }
    }
  });

  // 5. Extract Company Name (English + Indic keywords)
  lines.forEach((line, idx) => {
    if (matchedLines.has(idx)) return;

    // Check English company patterns
    if (COMPANY_SUFFIX_REGEX.test(line)) {
      contact.company = line;
      matchedLines.add(idx);
      return;
    }

    // Check Indic company patterns
    for (const indKeyword of INDIC_COMPANY_KEYWORDS) {
      if (line.includes(indKeyword)) {
        contact.company = line;
        matchedLines.add(idx);
        return;
      }
    }
  });

  // 6. Extract Location & PIN (State / City / Country)
  const pinCodeRegex = /\b([1-9][0-9]{5})\b/;
  let detectedPin = null;

  lines.forEach((line, idx) => {
    const pinMatch = line.match(pinCodeRegex);
    if (pinMatch) {
      detectedPin = pinMatch[1];
      matchedLines.add(idx);
    }

    INDIAN_STATES.forEach((state) => {
      const isInd = containsIndic(state);
      const stateRegex = isInd ? new RegExp(state, 'i') : new RegExp(`\\b${state}\\b`, 'i');
      if (stateRegex.test(line)) {
        contact.state = state;
        matchedLines.add(idx);
      }
    });

    MAJOR_CITIES.forEach((city) => {
      const isInd = containsIndic(city);
      const cityRegex = isInd ? new RegExp(city, 'i') : new RegExp(`\\b${city}\\b`, 'i');
      if (cityRegex.test(line)) {
        contact.city = city;
        matchedLines.add(idx);
      }
    });
  });

  // 7. Extract Address lines
  const addressKeywords = /\b(address|addr|street|st\.|road|rd\.|marg|nagar|bhavan|bhawan|complex|plaza|tower|society|soc\.|plot|phase|gidc|midc|floor|suite|flat|opp\.|near|nr\.|beside|behind|cross\s*road|rasta|circle|avenue|lane|office|h\.o\.|b\/h|o\/s)\b|(?:સરનામું|પ્લોટ|રોડ|માર્ગ|નગર|સોસાયટી|ક્રોસ\s*રોડ|જીઆઇડીસી|पता|मार्ग|सड़क)/i;
  const addressLines = [];

  lines.forEach((line, idx) => {
    if (matchedLines.has(idx) && !(detectedPin && line.includes(detectedPin))) return;

    if (addressKeywords.test(line) || (detectedPin && line.includes(detectedPin))) {
      addressLines.push(line.replace(/^(address|addr|સરનામું|पता)[:\s-]*/i, '').trim());
      matchedLines.add(idx);
    }
  });

  if (addressLines.length > 0) {
    contact.address = addressLines.join(', ');
  }

  // 8. Extract Full Name
  const honorificRegex = /^(mr\.|mrs\.|ms\.|dr\.|prof\.|er\.|ar\.|ca\.|adv\.|shri|smt\.|શ્રી|શ્રીમતી|ડો\.|श्री|श्रीमती|डॉ\.)\s*/i;

  const candidateNameLines = [];
  lines.forEach((line, idx) => {
    if (matchedLines.has(idx)) return;
    if (/^[\d\s+\-()/:.,@#]+$/.test(line)) return;
    if (line.split(/\s+/).length > 6) return;

    candidateNameLines.push({ line, idx });
  });

  if (candidateNameLines.length > 0) {
    const honorificMatch = candidateNameLines.find((item) => honorificRegex.test(item.line));
    if (honorificMatch) {
      contact.fullName = honorificMatch.line;
      matchedLines.add(honorificMatch.idx);
    } else {
      contact.fullName = candidateNameLines[0].line;
      matchedLines.add(candidateNameLines[0].idx);
    }
  }

  if (!contact.company && candidateNameLines.length > 1) {
    const remaining = candidateNameLines.filter((c) => c.line !== contact.fullName);
    if (remaining.length > 0) {
      contact.company = remaining[0].line;
    }
  }

  if (!contact.fullName) {
    contact.fullName = 'Unnamed Contact';
  }

  return contact;
}

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
    country: 'India',
    notes: '',
  };
}

module.exports = {
  extractContactFromText,
  createEmptyContact,
};
