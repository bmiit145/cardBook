import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Default host based on platform:
// - Android Emulator uses 10.0.2.2 to reach host machine localhost
// - iOS Simulator and Web use localhost
export const DEFAULT_API_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api/v1',
  default: 'http://localhost:5000/api/v1',
});

export const TOKEN_KEY = 'admin_jwt_token';
export const ADMIN_KEY = 'admin_user_data';
export const SERVER_URL_KEY = 'custom_server_url';

let cachedServerUrl = null;

export async function getBaseApiUrl() {
  if (cachedServerUrl) return cachedServerUrl;
  try {
    const custom = await SecureStore.getItemAsync(SERVER_URL_KEY);
    if (custom && custom.trim().length > 0) {
      cachedServerUrl = custom.trim();
      return cachedServerUrl;
    }
  } catch (_) {}
  cachedServerUrl = DEFAULT_API_URL;
  return cachedServerUrl;
}

export async function setCustomServerUrl(url) {
  cachedServerUrl = url ? url.trim() : null;
  if (url) {
    await SecureStore.setItemAsync(SERVER_URL_KEY, url.trim());
  } else {
    await SecureStore.deleteItemAsync(SERVER_URL_KEY);
  }
}

const api = axios.create({
  timeout: 45000, // OCR scans can take a few seconds
});

// Dynamic base URL & Bearer Token Request Interceptor
api.interceptors.request.use(async (config) => {
  const baseURL = await getBaseApiUrl();
  config.baseURL = baseURL;

  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('Failed to retrieve token from SecureStore:', err);
  }

  return config;
});

// Response Error Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid: clean up local secure storage
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(ADMIN_KEY);
      } catch (_) {}
    }
    return Promise.reject(error);
  }
);

export default api;
