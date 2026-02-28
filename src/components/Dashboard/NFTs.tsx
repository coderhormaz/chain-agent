import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IoImage, IoCopy, IoCheckmarkCircle, IoCloudUpload, IoCheckmarkDone, IoClose, IoTime, IoCloudDone } from 'react-icons/io5';
import { useWalletStore } from '../../store/walletStore';
import { WalletService } from '../../lib/wallet';
import { BlockchainService } from '../../services/blockchainService';
import { LighthouseService } from '../../services/lighthouseService';

interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  contractAddress: string;
  tokenId: string;
  metadata: any;
  createdAt: Date;
}

const NFTs: React.FC = () => {
  const { wallet } = useWalletStore();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMintModal, setShowMintModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStage, setMintingStage] = useState<'idle' | 'uploading' | 'minting' | 'success' | 'error'>('idle');
  const [mintingProgress, setMintingProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null as File | null
  });
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    // Fetch user's NFTs from the blockchain
    const fetchNFTs = async () => {
      if (!wallet?.address) {
        console.log('No wallet connected, skipping NFT fetch');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        console.log('Fetching NFTs for address:', wallet.address);
        const userNFTs = await BlockchainService.getUserNFTs(wallet.address);
        
        // Convert blockchain NFTs to component NFT format
        const formattedNFTs: NFT[] = userNFTs.map(nft => {
          console.log('📦 Processing NFT:', {
            tokenId: nft.tokenId,
            name: nft.metadata?.name,
            imageURL: nft.metadata?.image,
            tokenURI: nft.tokenURI
          });
          
          return {
            id: nft.tokenId,
            name: nft.metadata?.name || `NFT #${nft.tokenId}`,
            description: nft.metadata?.description || 'No description',
            image: nft.metadata?.image || 'https://via.placeholder.com/300x300?text=NFT',
            contractAddress: import.meta.env.VITE_NFT_FACTORY_CONTRACT || '0x...',
            tokenId: nft.tokenId,
            metadata: {
              attributes: nft.metadata?.attributes || []
            },
            createdAt: new Date() // We don't have exact creation date from chain
          };
        });

        console.log(`✅ Fetched ${formattedNFTs.length} NFTs from blockchain`);
        console.log('NFT Image URLs:', formattedNFTs.map(nft => ({ id: nft.id, image: nft.image })));
        setNfts(formattedNFTs);
      } catch (error) {
        console.error('Failed to fetch NFTs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [wallet]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMintNFT = async () => {
    if (!formData.name || !formData.description || !formData.image) {
      setErrorMessage('Please fill in all fields and upload an image');
      return;
    }

    // Check if wallet is connected
    if (!wallet?.address || !wallet?.privateKey) {
      setErrorMessage('Please connect your wallet first');
      return;
    }

    setIsMinting(true);
    setMintingStage('uploading');
    setErrorMessage('');
    
    try {
      // Decrypt private key
      const privateKey = WalletService.decryptPrivateKey(wallet.privateKey);
      
      // Step 1: Upload image to Lighthouse IPFS
      setMintingProgress('Uploading image to Lighthouse IPFS...');
      console.log('🚀 Starting image upload to IPFS...');
      
      // Upload to Lighthouse (IPFS)
      const uploadResult = await LighthouseService.uploadImage(formData.image);
      console.log('📤 Upload result received:', uploadResult);

      let imageUrl: string | undefined;
      
      if (uploadResult.success && uploadResult.url && uploadResult.url.startsWith('http')) {
        imageUrl = uploadResult.url;
        console.log('✅ Image uploaded to IPFS:', imageUrl);
      } else {
        // Image upload failed — proceed without image (metadata-only NFT)
        console.warn('⚠️ Image IPFS upload failed:', uploadResult.error);
        console.log('Proceeding to mint NFT without on-chain image...');
        // Show warning but don't block minting
        setMintingProgress('Image upload failed. Minting NFT without image...');
      }
      
      // Step 2: Prepare NFT metadata  
      setMintingProgress('Minting NFT on opBNB blockchain...');
      
      const nftDetails = {
        name: formData.name,
        description: formData.description,
        imageUrl: imageUrl,
        attributes: [
          { trait_type: 'Creator', value: 'opBNB User' },
          { trait_type: 'Storage', value: imageUrl ? 'Lighthouse IPFS' : 'On-chain' },
          { trait_type: 'Creation Date', value: new Date().toISOString() }
        ]
      };

      // Step 3: Mint NFT on opBNB blockchain
      setMintingStage('minting');
      setMintingProgress('Minting NFT on opBNB blockchain...');
      console.log('Starting NFT minting on blockchain...');
      
      const mintResult = await BlockchainService.mintNFT(
        nftDetails,
        wallet.address,
        privateKey
      );

      if (!mintResult.success) {
        throw new Error(mintResult.error || 'Failed to mint NFT');
      }

      console.log('NFT minted successfully:', mintResult);
      
      // Step 4: Add to local list
      const newNFT: NFT = {
        id: mintResult.tokenId || Date.now().toString(),
        name: formData.name,
        description: formData.description,
        image: imageUrl || 'https://via.placeholder.com/300x300?text=NFT',
        contractAddress: import.meta.env.VITE_NFT_FACTORY_CONTRACT || '0x...',
        tokenId: mintResult.tokenId || '0',
        metadata: {
          attributes: nftDetails.attributes
        },
        createdAt: new Date()
      };
      
      setNfts(prev => [newNFT, ...prev]);
      
      // Success!
      setMintingStage('success');
      setMintingProgress(`NFT minted successfully! Token ID: ${mintResult.tokenId}`);
      
      // Show success message for 2 seconds, then close modal
      setTimeout(() => {
        setShowMintModal(false);
        setFormData({ name: '', description: '', image: null });
        setImagePreview('');
        setMintingStage('idle');
        setMintingProgress('');
        setIsMinting(false);
      }, 2000);
      
    } catch (error: any) {
      console.error('NFT minting failed:', error);
      setMintingStage('error');
      setErrorMessage(error.message || 'Failed to mint NFT');
      setIsMinting(false);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      
      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedAddress(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedAddress(text);
      setTimeout(() => {
        setCopiedAddress(null);
      }, 2000);
    }
  };

  return (
    <div className="nfts-container">
      <div className="page-header">
        <h1>NFTs</h1>
        <button
          className="page-header-btn page-header-btn--primary"
          onClick={() => setShowMintModal(true)}
        >
          + Mint NFT
        </button>
      </div>

      <div className="nfts-grid">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="nft-card loading">
              <div className="skeleton-image" />
              <div className="nft-content">
                <div className="skeleton-line w-60" style={{ marginBottom: '6px' }} />
                <div className="skeleton-line w-80 h-8" />
                <div className="nft-details" style={{ border: 'none', padding: '8px 0' }}>
                  <div className="skeleton-line w-80 h-8" />
                  <div className="skeleton-line w-60 h-8" style={{ marginTop: '4px' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="skeleton-line" style={{ flex: 1, height: '28px', borderRadius: '8px' }} />
                  <div className="skeleton-line" style={{ flex: 1, height: '28px', borderRadius: '8px' }} />
                </div>
              </div>
            </div>
          ))
        ) : nfts.length === 0 ? (
          <div className="no-nfts">
            <div className="no-nfts-icon"><IoImage size={40} /></div>
            <h3>No NFTs yet</h3>
            <p>Mint your first NFT with Lighthouse IPFS</p>
            <button
              className="empty-state-btn"
              onClick={() => setShowMintModal(true)}
            >
              Mint NFT
            </button>
          </div>
        ) : (
          nfts.map((nft, index) => (
            <motion.div
              key={nft.id}
              className="nft-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <div className="nft-image">
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  onError={(e) => {
                    console.error('Failed to load NFT image:', nft.image);
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgbG9hZGVkPC90ZXh0Pjwvc3ZnPg==';
                    e.currentTarget.onerror = null;
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="nft-content">
                <h3 className="nft-name">{nft.name}</h3>
                <p className="nft-description">{nft.description}</p>
                
                <div className="nft-details">
                  <div className="nft-detail">
                    <span className="label">Token ID:</span>
                    <span className="value">#{nft.tokenId}</span>
                  </div>
                  <div className="nft-detail">
                    <span className="label">Contract:</span>
                    <div className="address-row">
                      <span className="value">{shortenAddress(nft.contractAddress)}</span>
                      <motion.button
                        className={`copy-btn ${copiedAddress === nft.contractAddress ? 'copied' : ''}`}
                        onClick={() => copyToClipboard(nft.contractAddress)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title={copiedAddress === nft.contractAddress ? "Contract Copied!" : "Copy Contract Address"}
                      >
                        {copiedAddress === nft.contractAddress ? <IoCheckmarkCircle /> : <IoCopy />}
                      </motion.button>
                    </div>
                  </div>
                  <div className="nft-detail">
                    <span className="label">Created:</span>
                    <span className="value">{nft.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>

                {nft.metadata?.attributes && (
                  <div className="nft-attributes">
                    <h4>Attributes</h4>
                    <div className="attributes-grid">
                      {nft.metadata.attributes.map((attr: any, i: number) => (
                        <div key={i} className="attribute">
                          <span className="trait-type">{attr.trait_type}</span>
                          <span className="trait-value">{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="nft-actions">
                  <button
                    className="action-btn primary"
                    onClick={() => window.open(`https://opbnb.bscscan.com/token/${nft.contractAddress}?a=${nft.tokenId}`, '_blank')}
                  >
                    Explorer
                  </button>
                  <button
                    className={`action-btn secondary ${copiedAddress === nft.contractAddress ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(nft.contractAddress)}
                  >
                    {copiedAddress === nft.contractAddress ? <><IoCheckmarkCircle /> Copied</> : <><IoCopy /> Copy</>}
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Mint NFT Modal */}
      {showMintModal && (
        <div className="modal-overlay" onClick={() => setShowMintModal(false)}>
          <motion.div
            className="modal mint-nft-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3>Mint NFT</h3>
            <div className="modal-form">
              <div className="form-group">
                <label>NFT Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., My Digital Art"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your NFT..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Upload Image</label>
                <div className="file-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    id="nft-image-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="nft-image-upload" className="file-upload-label">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                    ) : (
                      <div className="upload-placeholder">
                        <IoCloudUpload size={48} />
                        <p>Click to upload image</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              
              <div className="minting-info">
                <p><IoCloudDone /> Images stored on Lighthouse IPFS</p>
                <p>$ Estimated gas fee: ~0.002 BNB</p>
                <p><IoTime /> Processing time: 1-3 minutes</p>
              </div>

              {/* Progress indicator */}
              {isMinting && (
                <div className="minting-progress">
                  {mintingStage === 'uploading' && (
                    <div className="progress-step">
                      <div className="progress-spinner"></div>
                      <p><IoCloudUpload /> {mintingProgress}</p>
                    </div>
                  )}
                  {mintingStage === 'minting' && (
                    <div className="progress-step">
                      <div className="progress-spinner"></div>
                      <p><IoImage /> {mintingProgress}</p>
                    </div>
                  )}
                  {mintingStage === 'success' && (
                    <div className="progress-step success">
                      <p><IoCheckmarkDone /> {mintingProgress}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Error message */}
              {errorMessage && (
                <div className="error-message">
                  <p><IoClose /> {errorMessage}</p>
                </div>
              )}

              {/* Warning if wallet not connected */}
              {!wallet && (
                <div className="warning-message">
                  <p>⚠️ Please connect your wallet first</p>
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="modal-btn secondary"
                  onClick={() => {
                    setShowMintModal(false);
                    setErrorMessage('');
                    setMintingStage('idle');
                    setMintingProgress('');
                  }}
                  disabled={isMinting}
                >
                  Cancel
                </button>
                <button
                  className="modal-btn primary"
                  onClick={handleMintNFT}
                  disabled={!formData.name || !formData.description || !formData.image || isMinting || !wallet}
                >
                  {isMinting ? (
                    mintingStage === 'uploading' ? 'Uploading...' :
                    mintingStage === 'minting' ? 'Minting...' :
                    'Processing...'
                  ) : 'Mint NFT'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default NFTs;
