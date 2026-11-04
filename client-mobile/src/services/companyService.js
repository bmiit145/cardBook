import api from './api';

export const companyService = {
  async getCompanies(q = '') {
    const response = await api.get('/companies', { params: { q } });
    return response.data;
  },

  async createCompany(data) {
    const response = await api.post('/companies', data);
    return response.data;
  },

  async updateCompany(id, data) {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  },

  async getCompanyContacts(id) {
    const response = await api.get(`/companies/${id}/contacts`);
    return response.data;
  },
};

export const integrationService = {
  async getStatus() {
    const response = await api.get('/integrations/status');
    return response.data;
  },

  async retryFailedSheetsSync() {
    const response = await api.post('/integrations/sheets/retry');
    return response.data;
  },

  async syncSingleContact(contactId) {
    const response = await api.post(`/integrations/sheets/sync/${contactId}`);
    return response.data;
  },

  async getDashboardStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
};
