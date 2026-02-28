// Lighthouse Storage Service - Decentralized IPFS Storage
// Much simpler than Greenfield - just needs an API key!

import lighthouse from '@lighthouse-web3/sdk';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  ipfsHash?: string;
  fileName?: string;
}

export class LighthouseService {
  private static apiKey: string = import.meta.env.VITE_LIGHTHOUSE_API_KEY || '';

  /**
   * Upload an image file to Lighthouse (IPFS)
   * @param file - The image file to upload
   * @returns Upload result with IPFS URL
   */
  static async uploadImage(file: File): Promise<UploadResult> {
    try {
      console.log('🚀 Starting Lighthouse upload...');
      console.log('📁 File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      console.log('🔑 API Key loaded:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT SET');
      console.log('🔑 API Key length:', this.apiKey?.length || 0);

      // Check if API key is configured
      if (!this.apiKey || this.apiKey === 'your_lighthouse_api_key_here') {
        return {
          success: false,
          error: 'Lighthouse API key not configured. Please set VITE_LIGHTHOUSE_API_KEY in your .env file.'
        };
      }

      // Upload to Lighthouse using uploadBuffer for reliable browser support
      console.log('📤 Uploading to Lighthouse IPFS with key:', this.apiKey.substring(0, 15) + '...');
      
      // Convert File to buffer for more reliable upload
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const uploadResponse = await lighthouse.uploadBuffer(
        uint8Array,
        this.apiKey
      );

      console.log('✅ Upload response:', uploadResponse);

      // Extract IPFS hash from response
      const responseData = uploadResponse?.data;
      const ipfsHash = responseData?.Hash;
      const fileName = responseData?.Name || file.name;

      if (!ipfsHash) {
        console.error('❌ No IPFS hash in response:', uploadResponse);
        return {
          success: false,
          error: 'Lighthouse upload returned no IPFS hash. Please try again.'
        };
      }

      // Construct public gateway URL
      const ipfsUrl = `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;
      
      console.log('🎉 Upload successful!');
      console.log('📋 Summary:', {
        success: true,
        ipfsHash,
        fileName,
        url: ipfsUrl
      });

      return {
        success: true,
        url: ipfsUrl,
        ipfsHash,
        fileName
      };

    } catch (error: any) {
      console.error('❌ Lighthouse upload failed:', error);
      return {
        success: false,
        error: `IPFS upload failed: ${error?.message || 'Unknown error'}. Please check your API key and try again.`
      };
    }
  }

  /**
   * Upload a JSON metadata object to Lighthouse (IPFS)
   * Returns a short IPFS URL suitable for on-chain tokenURI storage
   * @param metadata - The metadata object to upload
   * @param fileName - Optional filename for the JSON file
   * @returns Upload result with IPFS URL
   */
  static async uploadJSON(metadata: object, fileName: string = 'metadata.json'): Promise<UploadResult> {
    try {
      console.log('📤 Uploading JSON metadata to Lighthouse IPFS...');

      if (!this.apiKey || this.apiKey === 'your_lighthouse_api_key_here') {
        return {
          success: false,
          error: 'Lighthouse API key not configured. Please set VITE_LIGHTHOUSE_API_KEY in your .env file.'
        };
      }

      const jsonString = JSON.stringify(metadata);
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonString);

      const uploadResponse = await lighthouse.uploadBuffer(
        uint8Array,
        this.apiKey
      );

      console.log('✅ Metadata upload response:', uploadResponse);

      const responseData = uploadResponse?.data;
      const ipfsHash = responseData?.Hash;

      if (!ipfsHash) {
        console.error('❌ No IPFS hash in metadata response:', uploadResponse);
        return {
          success: false,
          error: 'Failed to upload metadata to IPFS. No hash returned.'
        };
      }

      const ipfsUrl = `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;

      console.log('🎉 Metadata uploaded successfully!');
      console.log('🌐 Metadata URL:', ipfsUrl);

      return {
        success: true,
        url: ipfsUrl,
        ipfsHash,
        fileName
      };
    } catch (error: any) {
      console.error('❌ Metadata upload failed:', error);
      return {
        success: false,
        error: `Metadata upload failed: ${error?.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Get file info from IPFS hash
   * @param ipfsHash - The IPFS hash
   * @returns File information
   */
  static async getFileInfo(ipfsHash: string) {
    try {
      if (!this.apiKey || this.apiKey === 'your_lighthouse_api_key_here') {
        throw new Error('Lighthouse API key not configured');
      }

      const fileInfo = await lighthouse.getFileInfo(ipfsHash);
      console.log('📊 File info:', fileInfo);
      return fileInfo;
    } catch (error) {
      console.error('❌ Failed to get file info:', error);
      throw error;
    }
  }

  /**
   * Check upload status
   * @param ipfsHash - The IPFS hash to check
   * @returns Upload status
   */
  static async checkUploadStatus(ipfsHash: string) {
    try {
      const url = `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;
      const response = await fetch(url, { method: 'HEAD' });
      
      return {
        available: response.ok,
        status: response.status,
        url
      };
    } catch (error) {
      console.error('❌ Failed to check upload status:', error);
      return {
        available: false,
        status: 0,
        url: `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`
      };
    }
  }
}

export default LighthouseService;
