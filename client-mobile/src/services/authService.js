import api, { TOKEN_KEY, ADMIN_KEY } from './api';
import { storage } from '../utils/storage';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', {
      email: email.trim(),
      password,
    });

    const payload = response.data?.data || {};
    const token = payload.token;
    const admin = payload.admin;

    if (token) {
      await storage.setItem(TOKEN_KEY, token);
    }
    if (admin) {
      await storage.setItem(ADMIN_KEY, JSON.stringify(admin));
    }

    return { token, admin };
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    await storage.deleteItem(TOKEN_KEY);
    await storage.deleteItem(ADMIN_KEY);
  },

  async getStoredAuth() {
    try {
      const token = await storage.getItem(TOKEN_KEY);
      const adminJson = await storage.getItem(ADMIN_KEY);
      const admin = adminJson ? JSON.parse(adminJson) : null;
      return { token, admin };
    } catch (error) {
      return { token: null, admin: null };
    }
  },

  async getCurrentAdmin() {
    const response = await api.get('/auth/me');
    return response.data?.data?.admin;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export const {
  login,
  logout,
  getStoredAuth,
  getCurrentAdmin,
  changePassword,
} = authService;

export default authService;
