import api from './api';

export async function getDashboardMetrics() {
  const response = await api.get('/dashboard/metrics');
  return response.data?.data || {};
}

export async function getGoogleSheetsStatus() {
  const response = await api.get('/integrations/sheets/status');
  return response.data?.data || {};
}

export async function triggerGoogleSheetsSync() {
  const response = await api.post('/integrations/sheets/sync');
  return response.data?.data || {};
}
