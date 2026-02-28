import { create } from 'zustand';
import { ContactService, type Contact, type CreateContactData, type UpdateContactData } from '../services/contactService';

interface ContactsState {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  selectedContact: Contact | null;
  
  // Actions
  fetchContacts: (force?: boolean) => Promise<void>;
  addContact: (contactData: CreateContactData) => Promise<Contact>;
  updateContact: (contactId: string, updates: UpdateContactData) => Promise<Contact>;
  deleteContact: (contactId: string) => Promise<void>;
  searchContactByName: (name: string) => Promise<Contact | null>;
  searchContactsByPartialName: (partialName: string) => Promise<Contact[]>;
  selectContact: (contact: Contact | null) => void;
  clearError: () => void;
  resetContacts: () => void;
  resetLoadingState: () => void;
}

// Track active fetch to prevent race conditions
let activeFetchController: AbortController | null = null;

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  isLoading: false,
  error: null,
  selectedContact: null,

  // Fetch all contacts for the current user
  fetchContacts: async (force = false) => {
    console.log('[ContactStore] fetchContacts called, force:', force);
    console.log('[ContactStore] Timestamp:', new Date().toISOString());

    // Cancel any in-flight request
    if (activeFetchController) {
      console.log('[ContactStore] Aborting previous fetch request');
      try { activeFetchController.abort(); } catch (_) { /* ignore */ }
      activeFetchController = null;
    }

    const currentState = get();
    if (currentState.isLoading && !force) {
      console.log('[ContactStore] Already loading, skipping fetch');
      return;
    }

    // Create new abort controller — its signal is forwarded to the Supabase
    // query so aborting actually cancels the HTTP request.
    const controller = new AbortController();
    activeFetchController = controller;
    console.log('[ContactStore] Created new AbortController');

    try {
      set({ isLoading: true, error: null });
      console.log('[ContactStore] Calling ContactService.getAllContacts');

      const contacts = await ContactService.getAllContacts(controller.signal);

      // Only update state if this request wasn't superseded
      if (!controller.signal.aborted) {
        console.log('[ContactStore] Fetched contacts count:', contacts.length);
        set({ contacts, isLoading: false });
        if (activeFetchController === controller) activeFetchController = null;
      }
    } catch (error) {
      if (controller.signal.aborted) {
        console.log('[ContactStore] Request was aborted, ignoring error');
        return;
      }
      console.error('[ContactStore] Error fetching contacts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contacts';
      set({ error: errorMessage, isLoading: false });
      if (activeFetchController === controller) activeFetchController = null;
    } finally {
      // Guarantee loading is turned off for the CURRENT request
      if (!controller.signal.aborted && get().isLoading) {
        console.log('[ContactStore] Force resetting loading state in finally block');
        set({ isLoading: false });
      }
    }
  },

  // Add a new contact
  addContact: async (contactData: CreateContactData) => {
    console.log('[ContactStore] addContact called with:', contactData);
    try {
      console.log('[ContactStore] Setting isLoading to true');
      set({ isLoading: true, error: null });
      
      console.log('[ContactStore] Calling ContactService.addContact');
      const newContact = await ContactService.addContact(contactData);
      console.log('[ContactStore] ContactService.addContact returned:', newContact);
      
      // Add to local state
      const currentContacts = get().contacts;
      console.log('[ContactStore] Current contacts count:', currentContacts.length);
      const updatedContacts = [...currentContacts, newContact].sort((a, b) => 
        a.contact_name.localeCompare(b.contact_name)
      );
      console.log('[ContactStore] Updated contacts count:', updatedContacts.length);
      
      set({ contacts: updatedContacts, isLoading: false });
      console.log('[ContactStore] Contact added successfully');
      return newContact;
    } catch (error) {
      console.error('[ContactStore] Error adding contact:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add contact';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Update an existing contact
  updateContact: async (contactId: string, updates: UpdateContactData) => {
    console.log('[ContactStore] updateContact called with:', contactId, updates);
    try {
      console.log('[ContactStore] Setting isLoading to true');
      set({ isLoading: true, error: null });
      
      console.log('[ContactStore] Calling ContactService.updateContact');
      const updatedContact = await ContactService.updateContact(contactId, updates);
      console.log('[ContactStore] ContactService.updateContact returned:', updatedContact);
      
      // Update local state
      const currentContacts = get().contacts;
      console.log('[ContactStore] Current contacts count:', currentContacts.length);
      const updatedContacts = currentContacts.map(contact =>
        contact.id === contactId ? updatedContact : contact
      ).sort((a, b) => a.contact_name.localeCompare(b.contact_name));
      console.log('[ContactStore] Updated contacts count:', updatedContacts.length);
      
      set({ contacts: updatedContacts, isLoading: false });
      
      // Update selected contact if it's the one being updated
      if (get().selectedContact?.id === contactId) {
        set({ selectedContact: updatedContact });
      }
      
      console.log('[ContactStore] Contact updated successfully');
      return updatedContact;
    } catch (error) {
      console.error('[ContactStore] Error updating contact:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update contact';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Delete a contact
  deleteContact: async (contactId: string) => {
    try {
      set({ isLoading: true, error: null });
      await ContactService.deleteContact(contactId);
      
      // Remove from local state
      const currentContacts = get().contacts;
      const updatedContacts = currentContacts.filter(contact => contact.id !== contactId);
      
      set({ contacts: updatedContacts, isLoading: false });
      
      // Clear selected contact if it's the one being deleted
      if (get().selectedContact?.id === contactId) {
        set({ selectedContact: null });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete contact';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Search for a contact by exact name
  searchContactByName: async (name: string) => {
    try {
      set({ error: null });
      return await ContactService.searchContactByName(name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search contact';
      set({ error: errorMessage });
      throw error;
    }
  },

  // Search for contacts by partial name
  searchContactsByPartialName: async (partialName: string) => {
    try {
      set({ error: null });
      return await ContactService.searchContactsByPartialName(partialName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search contacts';
      set({ error: errorMessage });
      throw error;
    }
  },

  // Select a contact
  selectContact: (contact: Contact | null) => {
    set({ selectedContact: contact });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Reset contacts state
  resetContacts: () => {
    set({ contacts: [], selectedContact: null, error: null, isLoading: false });
  },

  // Reset loading state
  resetLoadingState: () => {
    console.log('[ContactStore] Resetting loading state');
    // Also clear any active abort controller
    if (activeFetchController) {
      console.log('[ContactStore] Clearing abort controller');
      try {
        activeFetchController.abort();
      } catch (error) {
        // Ignore abort errors
      }
      activeFetchController = null;
    }
    set({ isLoading: false, error: null });
  },
}));
