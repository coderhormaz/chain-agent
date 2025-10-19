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
        console.warn('⚠️ Lighthouse API key not configured, using data URL fallback');
        return this.createDataUrlFallback(file);
      }

      // Upload to Lighthouse
      console.log('📤 Uploading to Lighthouse IPFS with key:', this.apiKey.substring(0, 15) + '...');
      const uploadResponse = await lighthouse.upload(
        [file],
        this.apiKey
      );

      console.log('✅ Upload response:', uploadResponse);

      // Extract IPFS hash
      const ipfsHash = uploadResponse.data.Hash;
      const fileName = uploadResponse.data.Name;

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
      
      // If upload fails, fall back to data URL
      console.log('⚠️ Falling back to data URL (embedded image)');
      return this.createDataUrlFallback(file);
    }
  }

  /**
   * Create a data URL fallback when Lighthouse upload fails
   * @param file - The image file
   * @returns Upload result with data URL
   */
  private static async createDataUrlFallback(file: File): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const dataUrl = reader.result as string;
        console.log('✅ Created data URL fallback');
        console.log('📏 Data URL length:', dataUrl.length);
        
        resolve({
          success: true,
          url: dataUrl,
          error: 'Using embedded data URL (Lighthouse not configured)'
        });
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
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
