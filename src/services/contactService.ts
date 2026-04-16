import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ensureSession } from './supabaseHelpers';

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
   * Get the current user's ID from the auth store (synchronous, never hangs).
   * The Supabase client handles JWT/session internally for every REST call,
   * so we only need the user ID for the `user_id` column value.
   */
  private static getCurrentUserId(): string {
    const authUser = useAuthStore.getState().user;
    if (!authUser) {
      throw new Error('Please sign in to manage contacts');
    }
    return authUser.id;
  }

  /**
   * Add a new contact for the current user
   */
  static async addContact(contactData: CreateContactData): Promise<Contact> {
    console.log('[ContactService] addContact called with:', contactData);
    const userId = this.getCurrentUserId();

    // Validate wallet address format
    if (!this.isValidWalletAddress(contactData.wallet_address)) {
      throw new Error('Invalid wallet address format');
    }

    const insertData = {
      user_id: userId,
      contact_name: contactData.contact_name.trim(),
      wallet_address: contactData.wallet_address.toLowerCase()
    };

    // Ensure we have a valid session before the insert
    await ensureSession();

    const { data, error } = await supabase
      .from('contacts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[ContactService] Insert error:', error.code, error.message);

      // Handle JWT expiration — refresh and retry once
      if (error.message?.includes('JWT expired') || error.code === 'PGRST301' ||
          error.code === '42501' || error.message?.includes('policy')) {
        console.log('[ContactService] Auth issue, refreshing session and retrying...');
        try {
          await supabase.auth.refreshSession();
          const retry = await supabase
            .from('contacts')
            .insert(insertData)
            .select()
            .single();
          if (!retry.error) {
            return retry.data;
          }
          console.error('[ContactService] Retry also failed:', retry.error);
        } catch (refreshErr) {
          console.error('[ContactService] Refresh failed:', refreshErr);
        }
        throw new Error('Permission denied. Please sign out and sign back in.');
      }

      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.message.includes('unique_user_contact_name') || error.message.includes('contacts_user_id_contact_name_key')) {
          throw new Error('A contact with this name already exists');
        } else if (error.message.includes('unique_user_wallet') || error.message.includes('contacts_user_id_wallet_address_key')) {
          throw new Error('This wallet address is already in your contacts');
        }
      }

      throw new Error(error.message || 'Failed to add contact');
    }

    console.log('[ContactService] Contact added successfully:', data);
    return data;
  }

  /**
   * Get all contacts for the current user.
   */
  static async getAllContacts(): Promise<Contact[]> {
    console.log('[ContactService] getAllContacts called');
    const userId = this.getCurrentUserId();

    // Ensure session is valid before querying
    await ensureSession();

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('contact_name', { ascending: true });

    if (error) {
      console.error('[ContactService] Error:', error.code, error.message);

      // Auth/RLS issues — try refreshing and retrying once
      if (error.message?.includes('JWT expired') || error.code === 'PGRST301' ||
          error.code === '42501' || error.message?.includes('policy')) {
        console.log('[ContactService] Auth issue, refreshing and retrying...');
        try {
          await supabase.auth.refreshSession();
          const retry = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', userId)
            .order('contact_name', { ascending: true });
          if (!retry.error) {
            return retry.data || [];
          }
        } catch (refreshErr) {
          console.error('[ContactService] Refresh failed:', refreshErr);
        }
        throw new Error('Session expired. Please sign out and sign back in.');
      }
      throw new Error(error.message || 'Failed to fetch contacts');
    }

    console.log('[ContactService] Found', data?.length || 0, 'contacts');
    return data || [];
  }

  /**
   * Search for a contact by name (case-insensitive, supports partial match)
   */
  static async searchContactByName(name: string): Promise<Contact | null> {
    const userId = this.getCurrentUserId();
    const searchName = name.trim();
    await ensureSession();

    // First try exact match (case-insensitive)
    let { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .ilike('contact_name', searchName)
      .maybeSingle();

    // If no exact match, try partial match
    if (!data && !error) {
      const { data: partialData, error: partialError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .ilike('contact_name', `%${searchName}%`)
        .limit(1)
        .maybeSingle();
      data = partialData;
      error = partialError;
    }

    if (error) {
      throw new Error(error.message || 'Failed to search contact');
    }

    return data;
  }

  /**
   * Search contacts by partial name match (for autocomplete)
   */
  static async searchContactsByPartialName(partialName: string): Promise<Contact[]> {
    const userId = this.getCurrentUserId();
    await ensureSession();

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .ilike('contact_name', `%${partialName.trim()}%`)
      .order('contact_name', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to search contacts');
    }

    return data || [];
  }

  /**
   * Update an existing contact
   */
  static async updateContact(contactId: string, updates: UpdateContactData): Promise<Contact> {
    const userId = this.getCurrentUserId();

    if (updates.wallet_address && !this.isValidWalletAddress(updates.wallet_address)) {
      throw new Error('Invalid wallet address format');
    }

    const updateData: Record<string, string> = {};
    if (updates.contact_name) updateData.contact_name = updates.contact_name.trim();
    if (updates.wallet_address) updateData.wallet_address = updates.wallet_address.toLowerCase();

    await ensureSession();

    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('unique_user_contact_name') || error.message.includes('contacts_user_id_contact_name_key')) {
          throw new Error('A contact with this name already exists');
        } else if (error.message.includes('unique_user_wallet') || error.message.includes('contacts_user_id_wallet_address_key')) {
          throw new Error('This wallet address is already in your contacts');
        }
      }
      throw new Error(error.message || 'Failed to update contact');
    }

    return data;
  }

  /**
   * Delete a contact
   */
  static async deleteContact(contactId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    await ensureSession();

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to delete contact');
    }
  }

  /**
   * Get a single contact by ID
   */
  static async getContactById(contactId: string): Promise<Contact | null> {
    const userId = this.getCurrentUserId();
    await ensureSession();

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message || 'Failed to fetch contact');
    }

    return data;
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
      const userId = this.getCurrentUserId();
      await ensureSession();

      const { count, error } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }
}
