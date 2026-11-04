import api from './api';

export const scanService = {
  async processOcr(formData) {
    const response = await api.post('/scans/ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async extractFields(rawText) {
    const response = await api.post('/scans/extract', { rawText });
    return response.data;
  },

  async getHistory(limit = 20) {
    const response = await api.get('/scans/history', {
      params: { limit },
    });
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

