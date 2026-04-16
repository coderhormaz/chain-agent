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
   * Helper to detect common API errors and return a friendly message
   */
  private static handleApiError(error: any): UploadResult {
    const errMsg = error?.message || String(error);
    if (errMsg.includes('Trial expired') || errMsg.includes('expired') || errMsg.includes('Unauthorized')) {
      return {
        success: false,
        error: 'Lighthouse API key has expired. Please get a new API key from https://files.lighthouse.storage and update VITE_LIGHTHOUSE_API_KEY in your .env file.'
      };
    }
    return {
      success: false,
      error: `IPFS upload failed: ${errMsg}. Please check your Lighthouse API key and try again.`
    };
  }

  /**
   * Upload an image file to Lighthouse (IPFS)
   * Uses lighthouse.upload() which properly handles browser File objects
   * @param file - The image file to upload
   * @returns Upload result with IPFS URL
   */
  static async uploadImage(file: File): Promise<UploadResult> {
    try {
      console.log('🚀 Starting Lighthouse image upload...');
      console.log('📁 File:', file.name, file.size, 'bytes', file.type);

      if (!this.apiKey || this.apiKey === 'your_lighthouse_api_key_here') {
        return {
          success: false,
          error: 'Lighthouse API key not configured. Please set VITE_LIGHTHOUSE_API_KEY in your .env file.'
        };
      }

      // Validate the file is a real image with actual content
      if (!file || file.size === 0) {
        return { success: false, error: 'Image file is empty or invalid.' };
      }

      if (!file.type || !file.type.startsWith('image/')) {
        return { success: false, error: `Invalid file type "${file.type}". Only image files are accepted.` };
      }

      // Ensure we have a proper File object (not a bare Blob) so the SDK
      // sends the correct filename and MIME type in the multipart upload.
      let uploadFile: File;
      if (file instanceof File && file.name && file.name !== 'blob') {
        uploadFile = file;
      } else {
        // Re-wrap as a proper File to guarantee name + type are preserved
        const ext = file.type.split('/')[1] || 'png';
        uploadFile = new File([file], `nft_image_${Date.now()}.${ext}`, { type: file.type });
        console.log('🔄 Re-wrapped blob as File:', uploadFile.name, uploadFile.type);
      }

      // Use lighthouse.upload() with File objects — this is the correct browser method.
      // It properly sets multipart form data with the File object, preserving
      // filename and MIME type, so images appear correctly in the Lighthouse dashboard.
      // IMPORTANT: Do NOT use lighthouse.uploadBuffer() in the browser — it
      // stringifies Uint8Array instead of sending binary data, corrupting the image.
      console.log('📤 Uploading to Lighthouse IPFS via upload()...');
      console.log('📁 Upload file:', uploadFile.name, uploadFile.size, 'bytes', uploadFile.type);

      let uploadResponse: any;
      try {
        // lighthouse.upload expects an array of File objects in the browser
        uploadResponse = await lighthouse.upload([uploadFile], this.apiKey);
      } catch (uploadErr: any) {
        console.error('❌ lighthouse.upload() threw:', uploadErr);
        return this.handleApiError(uploadErr);
      }

      console.log('✅ Upload response:', JSON.stringify(uploadResponse));

      // Extract IPFS hash — response shape: { data: { Name, Hash, Size } }
      const responseData = uploadResponse?.data;
      const ipfsHash = responseData?.Hash;
      const fileName = responseData?.Name || file.name;

      if (!ipfsHash) {
        console.error('❌ No IPFS hash in response:', uploadResponse);
        return {
          success: false,
          error: 'Lighthouse upload succeeded but returned no IPFS hash. Please try again.'
        };
      }

      const ipfsUrl = `${this.IPFS_GATEWAYS[0]}${ipfsHash}`;

      console.log('🎉 Image uploaded successfully!');
      console.log('🌐 URL:', ipfsUrl);
      console.log('📋 Hash:', ipfsHash, 'Name:', fileName);

      return {
        success: true,
        url: ipfsUrl,
        ipfsHash,
        fileName
      };
    } catch (error: any) {
      console.error('❌ Lighthouse image upload failed:', error);
      return this.handleApiError(error);
    }
  }

  /**
   * Upload a JSON metadata object to Lighthouse (IPFS)
   * Uses lighthouse.uploadText() which is designed for text content
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

      let uploadResponse: any;
      try {
        // uploadText is the correct method for string/JSON content
        uploadResponse = await lighthouse.uploadText(jsonString, this.apiKey, fileName);
      } catch (uploadErr: any) {
        console.error('❌ lighthouse.uploadText() threw:', uploadErr);
        return this.handleApiError(uploadErr);
      }

      console.log('✅ Metadata upload response:', JSON.stringify(uploadResponse));

      const responseData = uploadResponse?.data;
      const ipfsHash = responseData?.Hash;

      if (!ipfsHash) {
        console.error('❌ No IPFS hash in metadata response:', uploadResponse);
        return {
          success: false,
          error: 'Failed to upload metadata to IPFS. No hash returned.'
        };
      }

      const ipfsUrl = `${this.IPFS_GATEWAYS[0]}${ipfsHash}`;

      console.log('🎉 Metadata uploaded! URL:', ipfsUrl);

      return {
        success: true,
        url: ipfsUrl,
        ipfsHash,
        fileName
      };
    } catch (error: any) {
      console.error('❌ Metadata upload failed:', error);
      return this.handleApiError(error);
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
      const url = `${this.IPFS_GATEWAYS[0]}${ipfsHash}`;
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
        url: `${this.IPFS_GATEWAYS[0]}${ipfsHash}`
      };
    }
  }

  /**
   * Ordered list of IPFS gateways to try when fetching content.
   * Lighthouse first (the upload target), then Cloudflare as fallback.
   */
  static readonly IPFS_GATEWAYS = [
    'https://dweb.link/ipfs/',
    'https://w3s.link/ipfs/',
    'https://ipfs.io/ipfs/',
  ];

  /**
   * Convert an ipfs:// URI or bare CID to an HTTP gateway URL,
   * using the first available gateway from the fallback list.
   */
  static ipfsToHttp(ipfsUri: string, gatewayIndex = 0): string {
    const gateway = this.IPFS_GATEWAYS[gatewayIndex] || this.IPFS_GATEWAYS[0];
    if (ipfsUri.startsWith('ipfs://')) {
      return gateway + ipfsUri.slice(7);
    }
    if (ipfsUri.startsWith('https://') || ipfsUri.startsWith('http://')) {
      // Already an HTTP URL — swap its gateway prefix if it's a known IPFS gateway
      for (const gw of this.IPFS_GATEWAYS) {
        if (ipfsUri.startsWith(gw)) {
          const cid = ipfsUri.slice(gw.length);
          return gateway + cid;
        }
      }
      return ipfsUri; // Unknown HTTP URL, return as-is
    }
    // Assume bare CID
    return gateway + ipfsUri;
  }

  /**
   * Fetch content from IPFS, trying each gateway in order until one succeeds.
   * @param ipfsHash - The IPFS CID (without ipfs:// prefix)
   * @param timeoutMs - Per-gateway timeout in milliseconds (default 8000)
   * @returns The Response from the first successful gateway, or null if all fail
   */
  static async fetchFromIPFS(ipfsHash: string, timeoutMs = 8000): Promise<Response | null> {
    for (const gateway of this.IPFS_GATEWAYS) {
      const url = gateway + ipfsHash;
      try {
        console.log(`🌐 Trying IPFS gateway: ${url}`);
        const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (response.ok) {
          console.log(`✅ IPFS fetch succeeded from: ${gateway}`);
          return response;
        }
        console.warn(`⚠️ Gateway ${gateway} returned HTTP ${response.status}`);
      } catch (e) {
        console.warn(`⚠️ Gateway ${gateway} failed:`, e);
      }
    }
    console.error(`❌ All IPFS gateways failed for hash: ${ipfsHash}`);
    return null;
  }
}

export default LighthouseService;
