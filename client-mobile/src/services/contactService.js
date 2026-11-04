import api from './api';
import * as Contacts from 'expo-contacts';

export const contactService = {
  async getContacts(params = {}) {
    const response = await api.get('/contacts', { params });
    return response.data;
  },

  async getContactById(id) {
    const response = await api.get(`/contacts/${id}`);
    return response.data;
  },

  async createContact(contactData) {
    const response = await api.post('/contacts', contactData);
    return response.data;
  },

  async updateContact(id, contactData) {
    const response = await api.put(`/contacts/${id}`, contactData);
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

  /**
   * Saves contact directly to the native phone address book via expo-contacts
   */
  async saveToPhoneAddressBook(contact) {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, message: 'Permission to access phone contacts was denied.' };
      }

      const nameParts = (contact.fullName || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || '';

      const phoneNumbers = [];
      if (contact.phone) {
        phoneNumbers.push({ label: 'mobile', number: contact.phone });
      }
      if (contact.alternatePhone) {
        phoneNumbers.push({ label: 'work', number: contact.alternatePhone });
      }

      const emails = [];
      if (contact.email) {
        emails.push({ label: 'work', email: contact.email });
      }

      const urlAddresses = [];
      if (contact.website) {
        urlAddresses.push({ label: 'work', url: contact.website });
      }

      const postalAddresses = [];
      if (contact.address || contact.city) {
        postalAddresses.push({
          label: 'work',
          street: contact.address || '',
          city: contact.city || '',
          region: contact.state || '',
          country: contact.country || '',
        });
      }

      const contactFields = {
        [Contacts.Fields.FirstName]: firstName,
        [Contacts.Fields.LastName]: lastName,
        [Contacts.Fields.Company]: contact.company?.name || contact.company || '',
        [Contacts.Fields.JobTitle]: contact.designation || '',
        [Contacts.Fields.Note]: contact.notes || '',
      };

      if (phoneNumbers.length > 0) contactFields[Contacts.Fields.PhoneNumbers] = phoneNumbers;
      if (emails.length > 0) contactFields[Contacts.Fields.Emails] = emails;
      if (urlAddresses.length > 0) contactFields[Contacts.Fields.UrlAddresses] = urlAddresses;
      if (postalAddresses.length > 0) contactFields[Contacts.Fields.Addresses] = postalAddresses;

      const contactId = await Contacts.addContactAsync(contactFields);
      return { success: true, contactId, message: 'Contact successfully saved to device contacts!' };
    } catch (err) {
      console.error('Error saving to device contacts:', err);
      return { success: false, message: err.message || 'Failed to save to device contacts.' };
    }
  },
};

export const {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  checkDuplicate,
  saveToPhoneAddressBook,
} = contactService;

export default contactService;
