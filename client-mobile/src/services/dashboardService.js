import api from './api';

export const dashboardService = {
  async getDashboardStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  async getMetrics() {
    const response = await api.get('/dashboard/stats');
    return response.data?.data || response.data || {};
  },
};

export const { getDashboardStats, getMetrics } = dashboardService;
export default dashboardService;
