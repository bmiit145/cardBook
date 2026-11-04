import api from './api';

/**
 * Uploads business card image(s) for OpenCV preprocessing, Tesseract 5 OCR, and contact extraction
 * 
 * @param {string} frontUri - Local URI of front card image
 * @param {string|null} [backUri] - Optional local URI of back card image
 * @returns {Promise<{contact: object, frontOcr: object, backOcr: object|null, isDoubleSided: boolean}>}
 */
export async function uploadAndScanCard(frontUri, backUri = null) {
  const formData = new FormData();

  const frontFilename = frontUri.split('/').pop() || 'front_card.jpg';
  formData.append('frontImage', {
    uri: frontUri,
    type: 'image/jpeg',
    name: frontFilename,
  });

  if (backUri) {
    const backFilename = backUri.split('/').pop() || 'back_card.jpg';
    formData.append('backImage', {
      uri: backUri,
      type: 'image/jpeg',
      name: backFilename,
    });
  }

  const response = await api.post('/scans/ocr', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data?.data;
}

export async function getScanHistory(page = 1, limit = 20) {
  const response = await api.get('/scans/history', {
    params: { page, limit },
  });
  return response.data?.data;
}
