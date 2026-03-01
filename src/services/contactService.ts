import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't settle
 * within `ms` milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export interface Contact {
  id: string;
  user_id: string;
  contact_name: string;
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactData {
  contact_name: string;
  wallet_address: string;
}

export interface UpdateContactData {
  contact_name?: string;
  wallet_address?: string;
}

export class ContactService {
  /**
   * Helper method to get current authenticated user
   * Simplified - RLS is disabled so just need user ID
   */
  private static async getCurrentUser() {
    console.log('[ContactService] Getting current user...');
    
    // Get user from auth store
    const authUser = useAuthStore.getState().user;
    
    if (!authUser) {
      console.error('[ContactService] No user in store');
      throw new Error('Please sign in to manage contacts');
    }
    
    console.log('[ContactService] User:', authUser.id);
    return authUser;
  }

  /**
   * Add a new contact for the current user
   */
  static async addContact(contactData: CreateContactData): Promise<Contact> {
    console.log('[ContactService] addContact called with:', contactData);
    try {
      const user = await this.getCurrentUser();
      console.log('[ContactService] User ID:', user.id);

      // Validate wallet address format
      console.log('[ContactService] Validating wallet address:', contactData.wallet_address);
      if (!this.isValidWalletAddress(contactData.wallet_address)) {
        console.error('[ContactService] Invalid wallet address format');
        throw new Error('Invalid wallet address format');
      }
      console.log('[ContactService] Wallet address valid');

      const insertData = {
        user_id: user.id,
        contact_name: contactData.contact_name.trim(),
        wallet_address: contactData.wallet_address.toLowerCase()
      };
      console.log('[ContactService] Inserting contact:', insertData);

      // Simple insert - no session checks needed since RLS is disabled
      const { data, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select()
        .single();

      console.log('[ContactService] Supabase response - data:', data, 'error:', error);

      if (error) {
        console.error('[ContactService] Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          full: error
        });
        
        // Handle specific errors
        if (error.code === '23505') {
          if (error.message.includes('unique_user_contact_name') || error.message.includes('contacts_user_id_contact_name_key')) {
            throw new Error('A contact with this name already exists');
          } else if (error.message.includes('unique_user_wallet') || error.message.includes('contacts_user_id_wallet_address_key')) {
            throw new Error('This wallet address is already in your contacts');
          }
        }

        // Handle RLS policy errors
        if (error.code === '42501' || error.message?.includes('policy')) {
          throw new Error('Permission denied. Please refresh the page and try again.');
        }
        
        throw new Error(error.message || 'Failed to add contact');
      }

      console.log('[ContactService] Contact added successfully:', data);
      return data;
    } catch (error) {
      console.error('[ContactService] addContact error:', error);
      
      // Handle timeout errors
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          console.error('[ContactService] Operation timed out');
          throw new Error('Operation timed out. Please check your connection and try again.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get all contacts for the current user.
   * The Supabase client now has a custom lock with a 5-second timeout, so
   * internal getSession() calls can no longer hang forever. We still wrap
   * the whole operation in a generous 15-second timeout as a safety net.
   */
  static async getAllContacts(): Promise<Contact[]> {
    console.log('[ContactService] getAllContacts called');

    try {
      const user = await this.getCurrentUser();
      console.log('[ContactService] Fetching contacts for user:', user.id);

      const query = supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('contact_name', { ascending: true });

      // Safety-net timeout — should never trigger now that the lock has a cap
      const { data, error } = await withTimeout(Promise.resolve(query), 15000, 'Contacts query');

      if (error) {
        console.error('[ContactService] Error:', error);
        throw new Error(error.message || 'Failed to fetch contacts');
      }

      console.log('[ContactService] Found', data?.length || 0, 'contacts');
      return data || [];
    } catch (error) {
      console.error('[ContactService] getAllContacts failed:', error);
      throw error;
    }
  }

  /**
   * Search for a contact by name (case-insensitive, supports partial match)
   */
  static async searchContactByName(name: string): Promise<Contact | null> {
    console.log('[ContactService] searchContactByName called with:', name);
    try {
      const user = await this.getCurrentUser();
      console.log('[ContactService] User ID:', user.id);
      
      const searchName = name.trim();
      console.log('[ContactService] Searching for contact with name:', searchName);

      // First try exact match (case-insensitive)
      let { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .ilike('contact_name', searchName)
        .maybeSingle();

      console.log('[ContactService] Exact match result - data:', data, 'error:', error);

      // If no exact match, try partial match
      if (!data && !error) {
        console.log('[ContactService] No exact match, trying partial match...');
        const { data: partialData, error: partialError } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', user.id)
          .ilike('contact_name', `%${searchName}%`)
          .limit(1)
          .maybeSingle();
        
        console.log('[ContactService] Partial match result - data:', partialData, 'error:', partialError);
        data = partialData;
        error = partialError;
      }

      if (error) {
        console.error('[ContactService] Supabase error:', error);
        throw new Error(error.message || 'Failed to search contact');
      }

      console.log('[ContactService] Returning contact:', data);
      return data;
    } catch (error) {
      console.error('[ContactService] searchContactByName error:', error);
      throw error;
    }
  }

  /**
   * Search contacts by partial name match (for autocomplete)
   */
  static async searchContactsByPartialName(partialName: string): Promise<Contact[]> {
    try {
      const user = await this.getCurrentUser();

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .ilike('contact_name', `%${partialName.trim()}%`)
        .order('contact_name', { ascending: true });

      if (error) {
        console.error('Error searching contacts:', error);
        throw new Error(error.message || 'Failed to search contacts');
      }

      return data || [];
    } catch (error) {
      console.error('ContactService.searchContactsByPartialName error:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact
   */
  static async updateContact(contactId: string, updates: UpdateContactData): Promise<Contact> {
    console.log('[ContactService] updateContact called with:', contactId, updates);
    try {
      console.log('[ContactService] Getting current user...');
      const user = await this.getCurrentUser();
      console.log('[ContactService] User ID:', user.id);

      // Validate wallet address if it's being updated
      if (updates.wallet_address) {
        console.log('[ContactService] Validating wallet address:', updates.wallet_address);
        if (!this.isValidWalletAddress(updates.wallet_address)) {
          console.error('[ContactService] Invalid wallet address format');
          throw new Error('Invalid wallet address format');
        }
        console.log('[ContactService] Wallet address valid');
      }

      // Prepare update data
      const updateData: any = {};
      if (updates.contact_name) updateData.contact_name = updates.contact_name.trim();
      if (updates.wallet_address) updateData.wallet_address = updates.wallet_address.toLowerCase();
      console.log('[ContactService] Update data prepared:', updateData);

      console.log('[ContactService] Updating in Supabase...');
      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId)
        .eq('user_id', user.id)
        .select()
        .single();

      console.log('[ContactService] Supabase response - data:', data, 'error:', error);

      if (error) {
        console.error('[ContactService] Supabase error:', error);
        
        // Handle specific errors
        if (error.code === '23505') {
          if (error.message.includes('unique_user_contact_name') || error.message.includes('contacts_user_id_contact_name_key')) {
            throw new Error('A contact with this name already exists');
          } else if (error.message.includes('unique_user_wallet') || error.message.includes('contacts_user_id_wallet_address_key')) {
            throw new Error('This wallet address is already in your contacts');
          }
        }
        
        throw new Error(error.message || 'Failed to update contact');
      }

      console.log('[ContactService] Contact updated successfully:', data);
      return data;
    } catch (error) {
      console.error('[ContactService] updateContact error:', error);
      throw error;
    }
  }

  /**
   * Delete a contact
   */
  static async deleteContact(contactId: string): Promise<void> {
    try {
      const user = await this.getCurrentUser();

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting contact:', error);
        throw new Error(error.message || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('ContactService.deleteContact error:', error);
      throw error;
    }
  }

  /**
   * Get a single contact by ID
   */
  static async getContactById(contactId: string): Promise<Contact | null> {
    try {
      const user = await this.getCurrentUser();

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching contact:', error);
        throw new Error(error.message || 'Failed to fetch contact');
      }

      return data;
    } catch (error) {
      console.error('ContactService.getContactById error:', error);
      throw error;
    }
  }

  /**
   * Validate Ethereum wallet address format
   */
  static isValidWalletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get contact count for current user
   */
  static async getContactCount(): Promise<number> {
    try {
      const user = await this.getCurrentUser();

      const { count, error } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error counting contacts:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('ContactService.getContactCount error:', error);
      return 0;
    }
  }
}
