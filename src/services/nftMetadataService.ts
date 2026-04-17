import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { isAuthError } from './supabaseHelpers';

type NFTMetadataJson = Record<string, unknown>;

export interface NFTMetadataRow {
  id: string;
  user_id: string;
  token_id: string;
  contract_address: string;
  name: string | null;
  description: string | null;
  image_ipfs_hash: string | null;
  image_url: string | null;
  metadata_ipfs_hash: string | null;
  metadata_json: NFTMetadataJson | null;
  created_at: string;
}

export interface ListNFTMetadataOptions {
  contractAddress?: string;
}

export interface SaveNFTMetadataData {
  token_id: string;
  contract_address: string;
  name?: string;
  description?: string;
  image_ipfs_hash?: string;
  image_url?: string;
  metadata_ipfs_hash?: string;
  metadata_json?: NFTMetadataJson;
}

export class NFTMetadataService {
  private static getCurrentUserId(): string {
    const authUser = useAuthStore.getState().user;
    if (!authUser) {
      throw new Error('Please sign in to manage NFTs');
    }
    return authUser.id;
  }

  /**
   * Save (upsert) NFT metadata into Supabase cache.
   * Uses ON CONFLICT to update if the same contract+tokenId already exists.
   */
  static async saveMetadata(data: SaveNFTMetadataData): Promise<void> {
    try {
      // Ensure Supabase auth session is active (RLS needs auth.uid())
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (!refreshed) {
          console.error('[NFTMetadataService] No active Supabase session — cannot save metadata');
          return;
        }
      }

      const userId = this.getCurrentUserId();

      const row = {
        user_id: userId,
        token_id: data.token_id,
        contract_address: data.contract_address.toLowerCase(),
        name: data.name || null,
        description: data.description || null,
        image_ipfs_hash: data.image_ipfs_hash || null,
        image_url: data.image_url || null,
        metadata_ipfs_hash: data.metadata_ipfs_hash || null,
        metadata_json: data.metadata_json || null,
      };

      console.log('[NFTMetadataService] Saving metadata for token', data.token_id, ':', {
        name: row.name,
        image_url: row.image_url,
        has_metadata_json: !!row.metadata_json,
      });

      const { error } = await supabase
        .from('nft_metadata')
        .upsert(row, { onConflict: 'contract_address,token_id' });

      if (error) {
        console.error('[NFTMetadataService] saveMetadata error:', error);
        if (isAuthError(error)) {
          console.log('[NFTMetadataService] Auth issue, refreshing and retrying...');
          await supabase.auth.refreshSession();
          const retry = await supabase
            .from('nft_metadata')
            .upsert(row, { onConflict: 'contract_address,token_id' });
          if (retry.error) {
            console.error('[NFTMetadataService] Retry failed:', retry.error);
          } else {
            console.log('[NFTMetadataService] ✅ Retry succeeded for token', data.token_id);
          }
          return;
        }
      } else {
        console.log('[NFTMetadataService] ✅ Metadata saved for token', data.token_id);
      }
    } catch (e) {
      console.error('[NFTMetadataService] saveMetadata failed:', e);
    }
  }

  /**
   * Get all cached NFT metadata for the current user, keyed by "contract:tokenId".
   */
  static async getMetadataByUser(): Promise<Map<string, NFTMetadataRow>> {
    const map = new Map<string, NFTMetadataRow>();
    try {
      // Ensure Supabase auth session is ready before querying (RLS needs auth.uid())
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Try refreshing the session
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (!refreshed) {
          console.warn('[NFTMetadataService] No active Supabase session — cache unavailable');
          return map;
        }
      }

      const userId = this.getCurrentUserId();

      const { data, error } = await supabase
        .from('nft_metadata')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        if (isAuthError(error)) {
          await supabase.auth.refreshSession();
          const retry = await supabase
            .from('nft_metadata')
            .select('*')
            .eq('user_id', userId);
          if (!retry.error && retry.data) {
            for (const row of retry.data) {
              map.set(`${row.contract_address}:${row.token_id}`, row);
            }
          }
          return map;
        }
        console.error('[NFTMetadataService] getMetadataByUser error:', error);
        return map;
      }

      if (data) {
        for (const row of data) {
          map.set(`${row.contract_address}:${row.token_id}`, row);
        }
      }
    } catch (e) {
      console.error('[NFTMetadataService] getMetadataByUser failed:', e);
    }
    return map;
  }

  /**
   * Load cached NFT metadata rows for the current user.
   * This is the DB-first source used by the NFT page.
   */
  static async listMetadataByUser(options: ListNFTMetadataOptions = {}): Promise<NFTMetadataRow[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (!refreshed) {
          console.warn('[NFTMetadataService] No active Supabase session — cannot list NFT metadata');
          return [];
        }
      }

      const userId = this.getCurrentUserId();
      let query = supabase
        .from('nft_metadata')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.contractAddress) {
        query = query.eq('contract_address', options.contractAddress.toLowerCase());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[NFTMetadataService] listMetadataByUser error:', error);
        if (isAuthError(error)) {
          await supabase.auth.refreshSession();
          let retry = supabase
            .from('nft_metadata')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (options.contractAddress) {
            retry = retry.eq('contract_address', options.contractAddress.toLowerCase());
          }

          const retryResult = await retry;
          if (retryResult.error) {
            console.error('[NFTMetadataService] listMetadataByUser retry failed:', retryResult.error);
            return [];
          }
          return (retryResult.data as NFTMetadataRow[] | null) || [];
        }
        return [];
      }

      return (data as NFTMetadataRow[] | null) || [];
    } catch (e) {
      console.error('[NFTMetadataService] listMetadataByUser failed:', e);
      return [];
    }
  }

  /**
   * Delete cached metadata for a specific NFT.
   */
  static async deleteMetadata(contractAddress: string, tokenId: string): Promise<void> {
    try {
      this.getCurrentUserId();

      const { error } = await supabase
        .from('nft_metadata')
        .delete()
        .eq('contract_address', contractAddress.toLowerCase())
        .eq('token_id', tokenId);

      if (error) {
        console.error('[NFTMetadataService] deleteMetadata error:', error);
      }
    } catch (e) {
      console.error('[NFTMetadataService] deleteMetadata failed:', e);
    }
  }

  /**
   * Upload an NFT image to Supabase Storage and return the public URL.
   * Path: nft-images/{userId}/{tokenId}.{ext}
   */
  static async uploadImageToStorage(file: File, tokenId: string): Promise<string | null> {
    try {
      // Ensure Supabase auth session is active (RLS on storage.objects)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (!refreshed) {
          console.error('[NFTMetadataService] No active session — cannot upload image');
          return null;
        }
      }

      const userId = this.getCurrentUserId();
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${userId}/${tokenId}.${ext}`;

      console.log('[NFTMetadataService] Uploading image to storage:', filePath, 'size:', file.size);

      const { error } = await supabase.storage
        .from('nft-images')
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
        });

      if (error) {
        console.error('[NFTMetadataService] uploadImageToStorage error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('nft-images')
        .getPublicUrl(filePath);

      console.log('[NFTMetadataService] ✅ Image uploaded to Supabase Storage:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (e) {
      console.error('[NFTMetadataService] uploadImageToStorage failed:', e);
      return null;
    }
  }
}
