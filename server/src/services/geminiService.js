const https = require('https');
const logger = require('../utils/logger');

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const API_KEY = process.env.GEMINI_API_KEY;

/**
 * Perform Multimodal Vision Card Extraction via Google Gemini Vision API
 * @param {Buffer} frontBuffer - Front side image buffer
 * @param {Buffer} [backBuffer] - Optional back side image buffer
 * @param {Object} [options] - Optional configurations
 * @returns {Promise<Object>} Extracted contact and metadata
 */
async function extractCardWithGemini(frontBuffer, backBuffer = null, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY || API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server/.env');
  }

  const modelName = options.model || DEFAULT_MODEL;

  const parts = [];

  const prompt = `Extract all contact and business information from this business card image.
Return a structured JSON array of objects. Each object represents one person/contact on the card and must have these fields:
- full_name: The person's full name as it appears on the card
- first_name: Given name
- middle_name: Middle name or initial (empty string if none)
- last_name: Family name
- company: Company or business name
- job_title: Job title or designation (e.g. Director, Partner, Manager)
- email: Primary email address
- secondary_email: Alternate email if present
- phone: Mobile / cell phone number
- alternate_phone: Secondary phone or office landline number
- alternate_phones: Array of all phone numbers found
- website: Website URL
- address: Primary or Head Office physical address
- city: City name (e.g. Gurugram, Surat, Mumbai, Ahmedabad)
- state: State / Province name (e.g. Haryana, Gujarat, Maharashtra)
- country: Country name (default India if not specified)
- branches: Array of office locations with address and phone numbers (if multiple offices are shown)
- notes: Services offered, slogans, founding year, or any additional text on the card

RULES:
- Preserve non-English scripts (Gujarati, Hindi, etc.) exactly as printed on the card without transliteration.
- If multiple partners or persons are on the card, return separate objects for each person in the array.
- For single-word names, put it in first_name and leave last_name empty.
- Return ONLY a valid JSON array without markdown formatting.`;

  parts.push({ text: prompt });

  // Add Front Image
  parts.push({
    inline_data: {
      mime_type: options.mimeType || 'image/jpeg',
      data: frontBuffer.toString('base64'),
    },
  });

  // Add Back Image if present
  if (backBuffer) {
    parts.push({
      inline_data: {
        mime_type: options.backMimeType || 'image/jpeg',
        data: backBuffer.toString('base64'),
      },
    });
  }

  const payload = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
    },
  });

  const responseText = await callGeminiApi(modelName, apiKey, payload);
  const parsedData = JSON.parse(responseText);

  const contactsList = Array.isArray(parsedData) ? parsedData : [parsedData];
  const primary = contactsList[0] || {};

  const allPhones = [
    primary.phone,
    primary.alternate_phone,
    ...(primary.alternate_phones || []),
  ].filter((p, i, arr) => p && typeof p === 'string' && arr.indexOf(p) === i);

  const allEmails = [
    primary.email,
    primary.secondary_email,
  ].filter((e, i, arr) => e && typeof e === 'string' && arr.indexOf(e) === i);

  const allPeople = contactsList
    .map((c) => c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim())
    .filter(Boolean);

  // Construct rawText representation for backward compatibility with UI
  const rawTextParts = [
    primary.company,
    primary.full_name,
    primary.job_title,
    ...allPhones,
    ...allEmails,
    primary.website,
    primary.address,
    primary.city,
    primary.state,
    primary.notes,
  ].filter(Boolean);

  const rawText = rawTextParts.join('\n');

  return {
    engine: `Google Gemini Vision AI (${modelName})`,
    confidence: 99.5,
    qualityScore: 100,
    rawText,
    isMultiContact: contactsList.length > 1,
    contactsCount: contactsList.length,
    contacts: contactsList.map((c) => ({
      fullName: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      firstName: c.first_name || '',
      middleName: c.middle_name || '',
      lastName: c.last_name || '',
      company: c.company || '',
      designation: c.job_title || '',
      email: c.email || '',
      secondaryEmail: c.secondary_email || '',
      phone: c.phone || '',
      alternatePhone: c.alternate_phone || (c.alternate_phones && c.alternate_phones[1]) || '',
      alternatePhones: c.alternate_phones || [],
      website: c.website || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      country: c.country || 'India',
      branches: c.branches || [],
      notes: c.notes || '',
    })),
    // Primary contact mapped to standard schema
    extractedFields: {
      fullName: primary.full_name || `${primary.first_name || ''} ${primary.last_name || ''}`.trim(),
      firstName: primary.first_name || '',
      middleName: primary.middle_name || '',
      lastName: primary.last_name || '',
      company: primary.company || '',
      designation: primary.job_title || '',
      email: primary.email || '',
      secondaryEmail: primary.secondary_email || '',
      phone: primary.phone || '',
      alternatePhone: primary.alternate_phone || (primary.alternate_phones && primary.alternate_phones[1]) || '',
      website: primary.website || '',
      address: primary.address || '',
      city: primary.city || '',
      state: primary.state || '',
      country: primary.country || 'India',
      branches: primary.branches || [],
      notes: primary.notes || '',
      phones: allPhones,
      emails: allEmails,
      people: allPeople,
      confidence: 99.5,
      needsReview: false,
      reviewReasons: [],
    },
  };
}

/**
 * Execute HTTP POST request to Gemini GenerativeLanguage API with automatic fallback
 */
async function callGeminiApi(modelName, apiKey, payload) {
  const modelsToTry = [modelName, 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError = null;

  for (const m of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const resData = await makeHttpsPost(url, payload, 14000);
      const parsed = JSON.parse(resData);

      if (parsed.candidates && parsed.candidates[0]?.content?.parts?.[0]?.text) {
        return parsed.candidates[0].content.parts[0].text;
      }
      if (parsed.error) {
        throw new Error(`Gemini API Error [${m}]: ${parsed.error.message || JSON.stringify(parsed.error)}`);
      }
    } catch (err) {
      logger.warn(`Failed to generate with model ${m}: ${err.message}. Trying next model...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed to process the request.');
}

function makeHttpsPost(url, payload, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Gemini API request timed out after ${timeoutMs}ms`));
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  extractCardWithGemini,
};

