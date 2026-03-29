import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { BlockchainService } from './blockchainService';
import { LighthouseService } from './lighthouseService';

// Certificate metadata stored on IPFS
export interface CertificateMetadata {
  recipientName: string;
  recipientWallet: string;
  institution: string;
  course: string;
  grade?: string;
  certificateType: 'completion' | 'achievement' | 'credential' | 'degree';
  dateIssued: string;
  dateExpiry?: string;
  description?: string;
  imageUrl?: string;
  issuerWallet: string;
}

// On-chain + IPFS combined certificate data
export interface CertificateData {
  certId: number;
  issuer: string;
  recipient: string;
  ipfsHash: string;
  issuedAt: number;
  revoked: boolean;
  isValid: boolean;
  metadata?: CertificateMetadata;
}

export interface IssuerRecord {
  id: string;
  user_id: string;
  institution_name: string;
  institution_type: string;
  description?: string;
  approved: boolean;
  approved_at?: string;
  created_at: string;
}

export class CertificateService {
  private static getCurrentUserId(): string {
    const authUser = useAuthStore.getState().user;
    if (!authUser) throw new Error('Please sign in first');
    return authUser.id;
  }

  // ── Issuer Management ────────────────────────────────────

  /** Check if the current user is an approved issuer (from Supabase) */
  static async checkIssuerStatus(userId: string): Promise<IssuerRecord | null> {
    const { data, error } = await supabase
      .from('certificate_issuers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to check issuer status:', error);
      return null;
    }
    return data;
  }

  /** Request to become a certificate issuer */
  static async requestIssuerRole(
    institutionName: string,
    institutionType: string,
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    const userId = this.getCurrentUserId();

    const { error } = await supabase
      .from('certificate_issuers')
      .insert({
        user_id: userId,
        institution_name: institutionName,
        institution_type: institutionType,
        description: description || null
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'You have already submitted an issuer request.' };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  // ── Certificate Issuance ─────────────────────────────────

  /** Issue a certificate: upload metadata to IPFS then write to blockchain */
  static async issueCertificate(
    metadata: CertificateMetadata,
    privateKey: string
  ): Promise<{ success: boolean; certId?: string; hash?: string; explorerUrl?: string; error?: string }> {
    // 1. Upload metadata JSON to IPFS
    const ipfsResult = await LighthouseService.uploadJSON(metadata, `cert_${Date.now()}.json`);
    if (!ipfsResult.success || !ipfsResult.ipfsHash) {
      return { success: false, error: `Failed to upload certificate metadata: ${ipfsResult.error}` };
    }

    console.log('🎓 Certificate metadata uploaded to IPFS:', ipfsResult.ipfsHash);

    // 2. Issue on-chain
    const result = await BlockchainService.issueCertificate(
      metadata.recipientWallet,
      ipfsResult.ipfsHash,
      privateKey
    );

    return {
      success: result.success,
      certId: result.certId,
      hash: result.hash,
      explorerUrl: result.explorerUrl,
      error: result.error
    };
  }

  // ── Certificate Verification ─────────────────────────────

  /** Verify a certificate by ID and fetch its IPFS metadata */
  static async verifyCertificate(certId: number): Promise<CertificateData> {
    const onChain = await BlockchainService.verifyCertificate(certId);

    const cert: CertificateData = {
      certId,
      issuer: onChain.issuer,
      recipient: onChain.recipient,
      ipfsHash: onChain.ipfsHash,
      issuedAt: onChain.issuedAt,
      revoked: onChain.revoked,
      isValid: onChain.isValid
    };

    // Fetch IPFS metadata if certificate exists
    if (onChain.exists && onChain.ipfsHash) {
      try {
        const url = `https://gateway.lighthouse.storage/ipfs/${onChain.ipfsHash}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          cert.metadata = await response.json();
        }
      } catch (e) {
        console.error('Failed to fetch certificate metadata from IPFS:', e);
      }
    }

    return cert;
  }

  // ── Certificate Listings ─────────────────────────────────

  /** Get all certificates received by a wallet address */
  static async getCertificatesForRecipient(walletAddress: string): Promise<CertificateData[]> {
    const ids = await BlockchainService.getCertificatesByRecipient(walletAddress);
    return this.fetchCertificateDetails(ids);
  }

  /** Get all certificates issued by a wallet address */
  static async getCertificatesForIssuer(walletAddress: string): Promise<CertificateData[]> {
    const ids = await BlockchainService.getCertificatesByIssuer(walletAddress);
    return this.fetchCertificateDetails(ids);
  }

  /** Revoke a certificate */
  static async revokeCertificate(
    certId: number,
    privateKey: string
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    const result = await BlockchainService.revokeCertificate(certId, privateKey);
    return { success: result.success, hash: result.hash, error: result.error };
  }

  // ── Helpers ──────────────────────────────────────────────

  private static async fetchCertificateDetails(certIds: number[]): Promise<CertificateData[]> {
    if (certIds.length === 0) return [];

    const results = await Promise.all(
      certIds.map(id => this.verifyCertificate(id))
    );

    // Sort newest first
    return results.sort((a, b) => b.issuedAt - a.issuedAt);
  }
}
