import api from './api';
import { Platform } from 'react-native';

export const scanService = {
  /**
   * Process OCR using either a FormData object or local file URIs
   */
  async processOcr(data) {
    let payload = data;
    let headers = {};

    // If data is passed as { frontUri, backUri }
    if (data && (data.frontUri || data.frontImageUri)) {
      payload = new FormData();
      const frontUri = data.frontUri || data.frontImageUri;
      const frontName = frontUri.split('/').pop() || 'front_card.jpg';

      if (Platform.OS === 'web') {
        // In web preview, fetch blob
        const res = await fetch(frontUri);
        const blob = await res.blob();
        payload.append('frontImage', blob, frontName);
      } else {
        payload.append('frontImage', {
          uri: frontUri,
          type: 'image/jpeg',
          name: frontName,
        });
      }

      if (data.backUri || data.backImageUri) {
        const backUri = data.backUri || data.backImageUri;
        const backName = backUri.split('/').pop() || 'back_card.jpg';
        if (Platform.OS === 'web') {
          const res = await fetch(backUri);
          const blob = await res.blob();
          payload.append('backImage', blob, backName);
        } else {
          payload.append('backImage', {
            uri: backUri,
            type: 'image/jpeg',
            name: backName,
          });
        }
      }
      headers['Content-Type'] = 'multipart/form-data';
    } else if (data instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }

    const response = await api.post('/scans/ocr', payload, { headers });
    return response.data;
  },

  async extractFields(rawText) {
    const response = await api.post('/scans/extract', { rawText });
    return response.data;
  },

  async getHistory(limit = 20) {
    const response = await api.get('/scans/history', { params: { limit } });
    return response.data;
  },

  async getScanById(id) {
    const response = await api.get(`/scans/${id}`);
    return response.data;
  },

  async deleteScan(id) {
    const response = await api.delete(`/scans/${id}`);
    return response.data;
  },

  async getBenchmarkCards() {
    const response = await api.get('/scans/benchmark');
    return response.data;
  },

  async getExamplesCards() {
    const response = await api.get('/scans/examples');
    return response.data;
  },
};

export const {
  processOcr,
  extractFields,
  getHistory,
  getScanById,
  deleteScan,
  getBenchmarkCards,
  getExamplesCards,
} = scanService;

export default scanService;
