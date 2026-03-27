import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Users, Edit2, Trash2, Search, Save } from 'lucide-react';
import { useContactsStore } from '../../store/contactStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import type { Contact, CreateContactData, UpdateContactData } from '../../services/contactService';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'all' | 'add' | 'edit';

export const ContactsModal: React.FC<ContactsModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const {
    contacts,
    isLoading,
    error,
    selectedContact,
    fetchContacts,
    addContact,
    updateContact,
    deleteContact,
    selectContact,
    clearError,
    resetLoadingState,
  } = useContactsStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  // Add/Edit form state
  const [formData, setFormData] = useState<CreateContactData>({
    contact_name: '',
    wallet_address: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState(false);

  // ── Fetch contacts when modal opens, cancel when it closes ──
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    console.log('[ContactsModal] Modal opened, fetching contacts');
    setAuthError(false);

    // Cancel any stale in-flight request then kick off a fresh one
    resetLoadingState();

    const attemptFetch = async (retryCount = 0) => {
      if (cancelled) return;
      try {
        await fetchContacts(true);
      } catch (err) {
        if (cancelled) return;
        console.error('[ContactsModal] Fetch error:', err);
        const msg = err instanceof Error ? err.message : '';
        if ((msg.includes('sign in') || msg.includes('expired') || msg.includes('not authenticated')) && retryCount < 2) {
          console.log('[ContactsModal] Auth error, retrying...');
          setTimeout(() => attemptFetch(retryCount + 1), 1000);
        } else {
          setAuthError(true);
        }
      }
    };

    // Small delay lets the store's resetLoadingState settle
    const id = setTimeout(() => attemptFetch(), 100);

    return () => {
      cancelled = true;
      clearTimeout(id);
      resetLoadingState();       // invalidate in-flight request when modal closes
    };
  }, [isOpen]);

  // Update filtered contacts when contacts or search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = contacts.filter(
        (contact) =>
          contact.contact_name.toLowerCase().includes(lowercaseQuery) ||
          contact.wallet_address.toLowerCase().includes(lowercaseQuery)
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  // Reset form when tab changes
  useEffect(() => {
    if (activeTab === 'add') {
      resetForm();
    } else if (activeTab === 'edit' && selectedContact) {
      setFormData({
        contact_name: selectedContact.contact_name,
        wallet_address: selectedContact.wallet_address
      });
    }
  }, [activeTab, selectedContact]);

  const resetForm = () => {
    setFormData({
      contact_name: '',
      wallet_address: ''
    });
    setFormError('');
  };

  const handleClose = () => {
    console.log('[ContactsModal] Closing modal');
    onClose();
    resetForm();
    setActiveTab('all');
    setSearchQuery('');
    selectContact(null);
    clearError();
    setFormSuccess('');
    setIsSubmitting(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (formError) setFormError('');
  };

  const validateForm = (): boolean => {
    if (!formData.contact_name.trim()) {
      setFormError('Contact name is required');
      return false;
    }
    if (!formData.wallet_address.trim()) {
      setFormError('Wallet address is required');
      return false;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.wallet_address)) {
      setFormError('Invalid wallet address format');
      return false;
    }
    return true;
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleAddContact called');
    console.log('isSubmitting:', isSubmitting);
    console.log('formData:', formData);
    
    if (isSubmitting) {
      console.log('Already submitting, returning');
      return;
    }
    
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }

    console.log('Starting contact addition...');
    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      console.log('Calling addContact with:', formData);
      const newContact = await addContact(formData);
      console.log('Contact added successfully:', newContact);
      setFormSuccess(`Contact "${newContact.contact_name}" added successfully!`);
      resetForm();
      // Switch to All tab after a short delay to show success message
      setTimeout(() => {
        setActiveTab('all');
        setFormSuccess('');
      }, 1500);
    } catch (error) {
      console.error('Error adding contact in modal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add contact';
      console.error('Error message:', errorMessage);
      setFormError(errorMessage);
    } finally {
      console.log('Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleUpdateContact called');
    console.log('isSubmitting:', isSubmitting);
    console.log('selectedContact:', selectedContact);
    console.log('formData:', formData);
    
    if (isSubmitting) {
      console.log('Already submitting, returning');
      return;
    }
    
    if (!selectedContact) {
      console.log('No contact selected');
      return;
    }
    
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }

    console.log('Starting contact update...');
    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const updates: UpdateContactData = {
        contact_name: formData.contact_name,
        wallet_address: formData.wallet_address
      };
      console.log('Calling updateContact with:', selectedContact.id, updates);
      const updatedContact = await updateContact(selectedContact.id, updates);
      console.log('Contact updated successfully:', updatedContact);
      setFormSuccess(`Contact "${updatedContact.contact_name}" updated successfully!`);
      selectContact(null);
      resetForm();
      // Switch to All tab after a short delay to show success message
      setTimeout(() => {
        setActiveTab('all');
        setFormSuccess('');
      }, 1500);
    } catch (error) {
      console.error('Error updating contact in modal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update contact';
      console.error('Error message:', errorMessage);
      setFormError(errorMessage);
    } finally {
      console.log('Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await deleteContact(contactId);
      if (selectedContact?.id === contactId) {
        selectContact(null);
        setActiveTab('all');
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleEditClick = (contact: Contact) => {
    selectContact(contact);
    setActiveTab('edit');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-[0_20px_60px_-15px_rgba(34,197,94,0.3)] border border-green-500/30"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-green-500/20 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col justify-center mt-0.5">
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-none mb-0.5">Contacts</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-none">{contacts.length} saved</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 !p-0 rounded-lg !bg-green-500 dark:!bg-gray-800 hover:!bg-green-600 dark:hover:!bg-gray-700 flex items-center justify-center transition-colors !border-0"
            >
              <X 
                className="w-5 h-5" 
                style={{ 
                  stroke: theme === 'dark' ? '#f3f4f6' : '#ffffff', 
                  strokeWidth: 2.5 
                }} 
              />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-500/30'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline-block mr-1.5" />
              All
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'add'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-500/30'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <UserPlus className="w-4 h-4 inline-block mr-1.5" />
              Add
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
            {/* All Contacts Tab */}
            {activeTab === 'all' && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-green-500/30 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                  />
                </div>

                {/* Auth Error Message with Retry */}
                {authError && (
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-400">
                    <p className="text-sm font-medium mb-2">Session Disconnected</p>
                    <p className="text-xs mb-3">Your session was disconnected. Click retry to reconnect.</p>
                    <button
                      onClick={async () => {
                        setAuthError(false);
                        resetLoadingState();
                        
                        try {
                          // Force refresh the session before retrying
                          console.log('[ContactsModal] Forcing session refresh before retry...');
                          const { data: { session }, error } = await supabase.auth.refreshSession();
                          
                          if (!error && session?.user) {
                            console.log('[ContactsModal] ✅ Session refreshed, updating auth store');
                            useAuthStore.getState().setUser(session.user);
                          }
                        } catch (error) {
                          console.error('[ContactsModal] Session refresh failed:', error);
                        }
                        
                        // Now retry fetching contacts
                        setTimeout(() => fetchContacts(true), 100);
                      }}
                      className="px-3 py-1.5 rounded-md bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {error && !authError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Loading State - using local loading state with safety timeout */}
                {isLoading && !authError && (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-3 border-green-200 dark:border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
                  </div>
                )}

                {/* Contacts List */}
                {!isLoading && filteredContacts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      {searchQuery ? 'No contacts found' : 'No contacts yet'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-xs mx-auto">
                      {searchQuery 
                        ? 'Try a different search term' 
                        : 'Add contacts to easily send transactions using names instead of long wallet addresses'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setActiveTab('add')}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all inline-flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Your First Contact
                      </button>
                    )}
                  </div>
                )}

                {!isLoading && filteredContacts.length > 0 && (
                  <div className="space-y-2">
                    {filteredContacts.map((contact) => (
                      <motion.div
                        key={contact.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-gradient-to-r from-gray-50 to-green-50/50 dark:from-gray-800 dark:to-green-900/10 border border-green-500/20 hover:border-green-500/40 hover:shadow-md hover:shadow-green-500/10 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {contact.contact_name}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate mt-0.5">
                              {contact.wallet_address}
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleEditClick(contact)}
                              className="w-7 h-7 !p-0 rounded-md !bg-blue-100 dark:!bg-blue-900/30 hover:!bg-blue-200 dark:hover:!bg-blue-900/50 flex items-center justify-center transition-colors !border-0"
                            >
                              <Edit2 
                                className="w-3.5 h-3.5" 
                                style={{ 
                                  stroke: theme === 'dark' ? '#60a5fa' : '#2563eb',
                                  strokeWidth: 2 
                                }} 
                              />
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="w-7 h-7 !p-0 rounded-md !bg-red-100 dark:!bg-red-900/30 hover:!bg-red-200 dark:hover:!bg-red-900/50 flex items-center justify-center transition-colors !border-0"
                            >
                              <Trash2 
                                className="w-3.5 h-3.5" 
                                style={{ 
                                  stroke: theme === 'dark' ? '#f87171' : '#dc2626',
                                  strokeWidth: 2 
                                }} 
                              />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add/Edit Contact Form */}
            {(activeTab === 'add' || activeTab === 'edit') && (
              <form onSubmit={activeTab === 'add' ? handleAddContact : handleUpdateContact} className="space-y-3">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 text-sm">
                    {formSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleFormChange}
                    placeholder="John Doe"
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-green-500/30 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Wallet Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="wallet_address"
                    value={formData.wallet_address}
                    onChange={handleFormChange}
                    placeholder="0x..."
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-green-500/30 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('all');
                      resetForm();
                      selectContact(null);
                    }}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium shadow-lg shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {activeTab === 'add' ? 'Adding...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {activeTab === 'add' ? 'Add' : 'Save'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
