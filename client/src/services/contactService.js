import api from './api';

export const contactService = {
  async createContact(contactData) {
    const response = await api.post('/contacts', contactData);
    return response.data;
  },

  async getContacts(params = {}) {
    const response = await api.get('/contacts', { params });
    return response.data;
  },

  async getContactById(id) {
    const response = await api.get(`/contacts/${id}`);
    return response.data;
  },

  async updateContact(id, data) {
    const response = await api.put(`/contacts/${id}`, data);
    return response.data;
  },

  async deleteContact(id) {
    const response = await api.delete(`/contacts/${id}`);
    return response.data;
  },

  async checkDuplicate(contactData) {
    const response = await api.post('/contacts/check-duplicate', contactData);
    return response.data;
  },

  getExportUrl(format = 'csv') {
    const token = localStorage.getItem('admin_token');
    return `${api.defaults.baseURL}/contacts/export?format=${format}&token=${token || ''}`;
  },

  async downloadExport(format = 'csv') {
    const response = await api.get('/contacts/export', {
      params: { format },
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: format === 'vcf' ? 'text/vcard' : 'text/csv',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contacts-${new Date().toISOString().slice(0, 10)}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

