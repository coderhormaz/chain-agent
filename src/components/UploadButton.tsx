import React, { useState, useRef } from 'react';
import { LighthouseService } from '../services/lighthouseService';
import { useWalletStore } from '../store/walletStore';

interface UploadButtonProps {
  onUploadStart?: () => void;
  onUploadComplete?: (url: string, fileName: string) => void;
  onUploadError?: (error: string) => void;
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  onUploadStart,
  onUploadComplete,
  onUploadError,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { wallet } = useWalletStore();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      onUploadError?.('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      onUploadError?.('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    onUploadStart?.();

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // Upload to Lighthouse (IPFS)
      const result = await LighthouseService.uploadImage(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.url) {
        onUploadComplete?.(result.url, file.name);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      onUploadError?.(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-button-container">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
      />
      
      <button
        className={`upload-button ${isUploading ? 'uploading' : ''}`}
        onClick={triggerFileSelect}
        disabled={isUploading || !wallet?.privateKey}
      >
        {isUploading ? (
          <div className="upload-progress">
            <div className="upload-spinner"></div>
            <span>Uploading... {uploadProgress}%</span>
          </div>
        ) : (
          <div className="upload-content">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.5 2H6C5.73478 2 5.48043 2.10536 5.29289 2.29289C5.10536 2.48043 5 2.73478 5 3V21C5 21.2652 5.10536 21.5196 5.29289 21.7071C5.48043 21.8946 5.73478 22 6 22H18C18.2652 22 18.5196 21.8946 18.7071 21.7071C18.8946 21.5196 19 21.2652 19 21V7.5L14.5 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 2V8H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 11V17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 14L12 11L15 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Upload Image to Lighthouse IPFS</span>
          </div>
        )}
      </button>
      
      {isUploading && (
        <div className="upload-progress-bar">
          <div
            className="upload-progress-fill"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

interface ImagePreviewProps {
  url: string;
  fileName: string;
  onRemove?: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  url,
  fileName,
  onRemove,
}) => {
  return (
    <div className="chat-image-preview">
      <div className="chat-preview-container">
        <img src={url} alt={fileName} className="chat-preview-image" />
        <div className="chat-preview-info">
          <p className="chat-preview-filename">{fileName}</p>
          <p className="chat-preview-storage">📡 Stored on Lighthouse IPFS</p>
          {onRemove && (
            <button className="chat-preview-remove" onClick={onRemove}>
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
