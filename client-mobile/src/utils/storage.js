import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Universal cross-platform storage adapter
 * - Native Mobile (Android / iOS): Uses hardware-encrypted Android Keystore / iOS Keychain
 * - Web Browser: Gracefully falls back to browser localStorage
 */
export const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined' && window.localStorage
          ? window.localStorage.getItem(key)
          : null;
      } catch (_) {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn('SecureStore.getItemAsync failed:', err.message);
      return null;
    }
  },

  async setItem(key, value) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (_) {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn('SecureStore.setItemAsync failed:', err.message);
    }
  },

  async deleteItem(key) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (_) {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn('SecureStore.deleteItemAsync failed:', err.message);
    }
  },
};

