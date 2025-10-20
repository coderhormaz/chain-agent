import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloudUpload, IoClose } from 'react-icons/io5';
import { LighthouseService } from '../services/lighthouseService';

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
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

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    } else {
      onUploadError?.('Please drop an image file');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="premium-upload-container">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
      />
      
      <motion.div
        className={`premium-upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? triggerFileSelect : undefined}
        whileHover={!isUploading ? { scale: 1.01 } : {}}
        whileTap={!isUploading ? { scale: 0.99 } : {}}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              className="upload-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <motion.div 
                className="upload-spinner-ring"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="url(#gradient)"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="31.4 31.4"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="100%" stopColor="#764ba2" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
              <div className="upload-progress-info">
                <p className="upload-status">Uploading to IPFS...</p>
                <p className="upload-percentage">{uploadProgress}%</p>
              </div>
              <motion.div 
                className="upload-progress-bar"
                initial={{ width: 0 }}
              >
                <motion.div
                  className="upload-progress-fill"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="upload-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <motion.div 
                className="upload-icon"
                animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 18C5.17107 18.4117 4 19.0443 4 19.7537C4 20.9943 7.58172 22 12 22C16.4183 22 20 20.9943 20 19.7537C20 19.0443 18.8289 18.4117 17 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 15V3M12 3L8 7M12 3L16 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
              <div className="upload-text">
                <h4>{isDragging ? 'Drop your image here' : 'Upload Image'}</h4>
                <p>
                  {isDragging 
                    ? 'Release to upload' 
                    : 'Click to browse or drag & drop'}
                </p>
                <div className="upload-specs">
                  <span className="upload-spec">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    JPG, PNG, GIF, WebP
                  </span>
                  <span className="upload-spec">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                    </svg>
                    Max 10MB
                  </span>
                </div>
              </div>
              <div className="lighthouse-badge-upload">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Secured by Lighthouse IPFS
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
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
          <p className="chat-preview-storage"><IoCloudUpload /> Stored on Lighthouse IPFS</p>
          {onRemove && (
            <button className="chat-preview-remove" onClick={onRemove}>
              <IoClose />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
