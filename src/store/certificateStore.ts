import { create } from 'zustand';
import { CertificateService, type CertificateData, type IssuerRecord } from '../services/certificateService';

interface CertificateState {
  // Certificates I received (as student)
  myCertificates: CertificateData[];
  // Certificates I issued (as issuer)
  issuedCertificates: CertificateData[];
  // Issuer role status
  issuerRecord: IssuerRecord | null;
  isApprovedIssuer: boolean;
  // Loading states
  isLoadingMyCerts: boolean;
  isLoadingIssuedCerts: boolean;
  isLoadingIssuerStatus: boolean;

  // Actions
  fetchMyCertificates: (walletAddress: string) => Promise<void>;
  fetchIssuedCertificates: (walletAddress: string) => Promise<void>;
  checkIssuerStatus: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useCertificateStore = create<CertificateState>()((set) => ({
  myCertificates: [],
  issuedCertificates: [],
  issuerRecord: null,
  isApprovedIssuer: false,
  isLoadingMyCerts: false,
  isLoadingIssuedCerts: false,
  isLoadingIssuerStatus: false,

  fetchMyCertificates: async (walletAddress: string) => {
    set({ isLoadingMyCerts: true });
    try {
      const certs = await CertificateService.getCertificatesForRecipient(walletAddress);
      set({ myCertificates: certs });
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    } finally {
      set({ isLoadingMyCerts: false });
    }
  },

  fetchIssuedCertificates: async (walletAddress: string) => {
    set({ isLoadingIssuedCerts: true });
    try {
      const certs = await CertificateService.getCertificatesForIssuer(walletAddress);
      set({ issuedCertificates: certs });
    } catch (error) {
      console.error('Failed to fetch issued certificates:', error);
    } finally {
      set({ isLoadingIssuedCerts: false });
    }
  },

  checkIssuerStatus: async (userId: string) => {
    set({ isLoadingIssuerStatus: true });
    try {
      // Check Supabase issuer record (app-level gating)
      const record = await CertificateService.checkIssuerStatus(userId);
      set({
        issuerRecord: record,
        isApprovedIssuer: record?.approved ?? false
      });
    } catch (error) {
      console.error('Failed to check issuer status:', error);
    } finally {
      set({ isLoadingIssuerStatus: false });
    }
  },

  reset: () => set({
    myCertificates: [],
    issuedCertificates: [],
    issuerRecord: null,
    isApprovedIssuer: false
  })
}));
