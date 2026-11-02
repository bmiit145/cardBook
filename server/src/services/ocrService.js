const googleVisionConfig = require('../config/googleVision');
const imageService = require('./imageService');
const logger = require('../utils/logger');

/**
 * Perform Optical Character Recognition on an image buffer
 * 
 * @param {Buffer} rawImageBuffer
 * @returns {Promise<{rawText: string, blocks: Array, confidence: number, detectedLanguages: Array}>}
 */
async function extractTextFromImage(rawImageBuffer) {
  // Preprocess with Sharp first
  const { ocrBuffer } = await imageService.preprocessForOcr(rawImageBuffer);

  const client = googleVisionConfig.getClient();

  if (googleVisionConfig.isConfigured() && client) {
    try {
      logger.info('Calling Google Cloud Vision documentTextDetection API...');
      const [result] = await client.documentTextDetection({
        image: { content: ocrBuffer },
      });

      const fullTextAnnotation = result.fullTextAnnotation;
      const rawText = fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '';
      
      const detectedLanguages = [];
      if (fullTextAnnotation?.pages) {
        for (const page of fullTextAnnotation.pages) {
          if (page.property?.detectedLanguages) {
            for (const lang of page.property.detectedLanguages) {
              if (lang.languageCode && !detectedLanguages.includes(lang.languageCode)) {
                detectedLanguages.push(lang.languageCode);
              }
            }
          }
        }
      }

      logger.info(`Google Vision OCR completed. Extracted ${rawText.length} characters. Languages: ${detectedLanguages.join(', ') || 'default'}`);

      return {
        rawText,
        detectedLanguages,
        isDemo: false,
      };
    } catch (error) {
      logger.error('Google Vision OCR error occurred', error);
      throw new Error(`Google Vision OCR failed: ${error.message}`);
    }
  }

  // Graceful Fallback Mode for local development without Google credentials
  logger.warn('Google Cloud Vision is not configured. Returning simulated mock card extraction for testing.');
  
  const sampleCardOcr = `
Harmish Patel
Founder & Chief Technology Officer
Spirit Infotech Private Limited

Mobile: +91 98765 43210
Alternate: +91 261 2456789
Email: harmish@spiritinfotech.com
Website: https://www.spiritinfotech.com

Address: 402, Titanium City Center, Near Anand Nagar Cross Road,
Prahlad Nagar, Ahmedabad, Gujarat - 380015, India
LinkedIn: linkedin.com/in/harmish-patel
  `.trim();

  return {
    rawText: sampleCardOcr,
    detectedLanguages: ['en', 'gu', 'hi'],
    isDemo: true,
  };
}

module.exports = {
  extractTextFromImage,
};

