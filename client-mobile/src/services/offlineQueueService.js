import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import * as Contacts from 'expo-contacts';

const OFFLINE_QUEUE_KEY = 'cardscan_offline_contacts_queue';

export const offlineQueueService = {
  /**
   * Retrieves all contacts in the offline queue
   */
  async getOfflineQueue() {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('Error reading offline queue:', err);
      return [];
    }
  },

  /**
   * Gets count of contacts awaiting cloud synchronization
   */
  async getPendingCount() {
    const queue = await this.getOfflineQueue();
    return queue.filter((item) => item.syncStatus === 'PENDING' || item.syncStatus === 'FAILED')
      .length;
  },

  /**
   * Enqueues a contact for offline storage and native address book save
   */
  async enqueueContact(payload) {
    try {
      const queue = await this.getOfflineQueue();
      const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newItem = {
        id: offlineId,
        formData: payload.formData || {},
        frontImageUri: payload.frontImageUri || payload.frontPreview || null,
        backImageUri: payload.backImageUri || payload.backPreview || null,
        originalOcrText: payload.originalOcrText || '',
        createdAt: new Date().toISOString(),
        syncStatus: 'PENDING',
        retryCount: 0,
        lastError: null,
      };

      queue.unshift(newItem);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

      // Attempt immediate native phone address book save
      try {
        await this.saveToPhoneContacts(newItem.formData);
      } catch (e) {
        console.warn('Failed to save to phone address book during offline enqueue:', e);
      }

      return newItem;
    } catch (err) {
      console.error('Failed to enqueue offline contact:', err);
      throw err;
    }
  },

  /**
   * Saves contact directly to Android device address book via expo-contacts
   */
  async saveToPhoneContacts(formData) {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') return false;

      const nameParts = (formData.fullName || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || '';

      const phoneNumbers = [];
      if (formData.phone) phoneNumbers.push({ label: 'mobile', number: formData.phone });
      if (formData.alternatePhone) {
        phoneNumbers.push({ label: 'work', number: formData.alternatePhone });
      }

      const emails = [];
      if (formData.email) emails.push({ label: 'work', email: formData.email });

      const urlAddresses = [];
      if (formData.website) urlAddresses.push({ label: 'work', url: formData.website });

      const postalAddresses = [];
      if (formData.address || formData.city) {
        postalAddresses.push({
          label: 'work',
          street: formData.address || '',
          city: formData.city || '',
          region: formData.state || '',
          country: formData.country || '',
        });
      }

      await Contacts.addContactAsync({
        [Contacts.Fields.FirstName]: firstName,
        [Contacts.Fields.LastName]: lastName,
        [Contacts.Fields.Company]: formData.company?.name || formData.company || '',
        [Contacts.Fields.JobTitle]: formData.designation || '',
        [Contacts.Fields.Note]: formData.notes || '',
        [Contacts.Fields.PhoneNumbers]: phoneNumbers,
        [Contacts.Fields.Emails]: emails,
        [Contacts.Fields.UrlAddresses]: urlAddresses,
        [Contacts.Fields.Addresses]: postalAddresses,
      });

      return true;
    } catch (err) {
      console.warn('Address book save error:', err);
      return false;
    }
  },

  /**
   * Flushes and synchronizes the offline queue with the cloud backend API
   */
  async syncQueue() {
    const queue = await this.getOfflineQueue();
    const pendingItems = queue.filter(
      (item) => item.syncStatus === 'PENDING' || item.syncStatus === 'FAILED'
    );

    if (pendingItems.length === 0) {
      return { syncedCount: 0, failedCount: 0 };
    }

    let syncedCount = 0;
    let failedCount = 0;

    const updatedQueue = [...queue];

    for (const item of pendingItems) {
      const index = updatedQueue.findIndex((q) => q.id === item.id);
      if (index === -1) continue;

      try {
        updatedQueue[index].syncStatus = 'SYNCING';

        const payload = {
          ...item.formData,
          originalOcrText: item.originalOcrText,
          frontImageSecureUrl: item.frontImageUri,
          backImageSecureUrl: item.backImageUri,
        };

        await api.post('/contacts', payload);

        updatedQueue[index].syncStatus = 'SYNCED';
        updatedQueue[index].lastError = null;
        syncedCount++;
      } catch (err) {
        console.warn(`Sync failed for item ${item.id}:`, err.message);
        updatedQueue[index].syncStatus = 'FAILED';
        updatedQueue[index].retryCount = (updatedQueue[index].retryCount || 0) + 1;
        updatedQueue[index].lastError = err.response?.data?.message || err.message;
        failedCount++;
      }
    }

    // Retain failed and recent synced items
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
    return { syncedCount, failedCount };
  },

  /**
   * Removes a specific item from the queue
   */
  async removeItem(id) {
    const queue = await this.getOfflineQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  },

  /**
   * Clears all synced records from the local queue
   */
  async clearSynced() {
    const queue = await this.getOfflineQueue();
    const remaining = queue.filter((item) => item.syncStatus !== 'SYNCED');
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  },
};

export default offlineQueueService;

