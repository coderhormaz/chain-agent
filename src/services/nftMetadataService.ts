import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ensureSession, isAuthError } from './supabaseHelpers';

export interface NFTMetadataRow {
  id: string;
  user_id: string;
  token_id: string;
  contract_address: string;
  name: string | null;
  description: string | null;
  image_ipfs_hash: string | null;
  metadata_ipfs_hash: string | null;
  metadata_json: Record<string, any> | null;
  created_at: string;
}

export interface SaveNFTMetadataData {
  token_id: string;
  contract_address: string;
  name?: string;
  description?: string;
  image_ipfs_hash?: string;
  metadata_ipfs_hash?: string;
  metadata_json?: Record<string, any>;
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
      const userId = this.getCurrentUserId();
      await ensureSession();

      const row = {
        user_id: userId,
        token_id: data.token_id,
        contract_address: data.contract_address.toLowerCase(),
        name: data.name || null,
        description: data.description || null,
        image_ipfs_hash: data.image_ipfs_hash || null,
        metadata_ipfs_hash: data.metadata_ipfs_hash || null,
        metadata_json: data.metadata_json || null,
      };

      const { error } = await supabase
        .from('nft_metadata')
        .upsert(row, { onConflict: 'contract_address,token_id' });

      if (error) {
        if (isAuthError(error)) {
          console.log('[NFTMetadataService] Auth issue, refreshing and retrying...');
          await supabase.auth.refreshSession();
          const retry = await supabase
            .from('nft_metadata')
            .upsert(row, { onConflict: 'contract_address,token_id' });
          if (retry.error) {
            console.error('[NFTMetadataService] Retry failed:', retry.error);
          }
          return;
        }
        console.error('[NFTMetadataService] saveMetadata error:', error);
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
      const userId = this.getCurrentUserId();
      await ensureSession();

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
   * Delete cached metadata for a specific NFT.
   */
  static async deleteMetadata(contractAddress: string, tokenId: string): Promise<void> {
    try {
      this.getCurrentUserId();
      await ensureSession();

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
}
