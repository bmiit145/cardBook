import api, { TOKEN_KEY, ADMIN_KEY } from './api';
import * as SecureStore from 'expo-secure-store';

export async function login(email, password) {
  const response = await api.post('/auth/login', {
    email: email.trim(),
    password,
  });

  const payload = response.data?.data || {};
  const token = payload.token;
  const admin = payload.admin;

  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
  if (admin) {
    await SecureStore.setItemAsync(ADMIN_KEY, JSON.stringify(admin));
  }

  return { token, admin };
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (_) {}
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(ADMIN_KEY);
}

export async function getStoredAuth() {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const adminJson = await SecureStore.getItemAsync(ADMIN_KEY);
    const admin = adminJson ? JSON.parse(adminJson) : null;
    return { token, admin };
  } catch (error) {
    return { token: null, admin: null };
  }
}

export async function getCurrentAdmin() {
  const response = await api.get('/auth/me');
  return response.data?.data?.admin;
}
