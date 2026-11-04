import { Platform } from 'react-native';
import { extractContactFromText } from '../utils/localExtractor';

export const onDeviceOcrService = {
  /**
   * Recognizes text and automatically extracts contact details directly on the mobile device
   * 100% Offline with ZERO internet and ZERO backend connection.
   *
   * @param {string} imageUri - Local file URI of the captured business card image
   * @returns {Promise<{ extractedFields: object, rawText: string, confidence: number, engine: string }>}
   */
  async processCardOnDevice(imageUri) {
    let recognizedText = '';
    let engine = 'On-Device Mobile Engine';

    try {
      // 1. Attempt Google ML Kit Text Recognition if available (Production Android/iOS native)
      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;

      if (TextRecognition && typeof TextRecognition.recognize === 'function') {
        const result = await TextRecognition.recognize(imageUri);
        recognizedText = result?.text || '';
        engine = 'Google ML Kit (On-Device 100% Offline)';
      }
    } catch (err) {
      console.warn('Native ML Kit not linked in this runtime, falling back to local extractor:', err.message);
    }

    // 2. Extract structured contact fields from the recognized text
    const extractedFields = extractContactFromText(recognizedText);

    return {
      extractedFields,
      rawText: recognizedText,
      confidence: extractedFields.confidence,
      engine,
      needsReview: extractedFields.needsReview,
      reviewReasons: extractedFields.needsReview
        ? ['On-device recognition: please verify auto-detected fields.']
        : [],
    };
  },
};

export default onDeviceOcrService;
