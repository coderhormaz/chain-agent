import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IoCube, IoCopy, IoCheckmarkCircle, IoRefresh, IoWallet, IoTime } from 'react-icons/io5';
import { BlockchainService } from '../../services/blockchainService';
import { useWalletStore } from '../../store/walletStore';
import { WalletService } from '../../lib/wallet';

interface Token {
  id: string;
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
  contractAddress: string;
  createdAt: Date;
}

const Tokens: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { wallet } = useWalletStore();
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    totalSupply: '',
    decimals: '18'
  });

  useEffect(() => {
    if (wallet?.address) {
      fetchUserTokens();
    } else {
      setIsLoading(false);
    }
  }, [wallet?.address]);

  const fetchUserTokens = async () => {
    if (!wallet?.address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching tokens from blockchain for address:', wallet.address);
      const fetchedTokens = await BlockchainService.getUserCreatedTokens(wallet.address);
      
      // Transform blockchain data to component format
      const formattedTokens: Token[] = fetchedTokens.map((token) => ({
        id: token.address,
        name: token.name,
        symbol: token.symbol,
        totalSupply: token.totalSupply,
        decimals: token.decimals,
        contractAddress: token.address,
        createdAt: new Date() // We don't have creation date from blockchain, so use current date
      }));
      
      console.log('Fetched tokens:', formattedTokens);
      setTokens(formattedTokens);
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateToken = async () => {
    if (!formData.name || !formData.symbol || !formData.totalSupply) return;
    if (!wallet?.privateKey) {
      alert('Please connect your wallet first');
      return;
    }

    setIsCreating(true);
    setError(null);
    
    try {
      console.log('Creating token with blockchain service...');
      
      // Decrypt private key before using it
      const decryptedPrivateKey = WalletService.decryptPrivateKey(wallet.privateKey);
      
      const result = await BlockchainService.createToken(
        {
          name: formData.name,
          symbol: formData.symbol,
          totalSupply: formData.totalSupply,
          decimals: formData.decimals
        },
        decryptedPrivateKey
      );

      if (result.success) {
        console.log('Token created successfully:', result);
        alert(`Token created successfully! Transaction: ${result.hash}`);
        
        // Close modal and reset form
        setShowCreateModal(false);
        setFormData({ name: '', symbol: '', totalSupply: '', decimals: '18' });
        
        // Refresh token list from blockchain
        await fetchUserTokens();
      } else {
        throw new Error(result.error || 'Token creation failed');
      }
    } catch (err) {
      console.error('Token creation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create token';
      setError(errorMessage);
      alert(`Failed to create token: ${errorMessage}`);
    } finally {
      setIsCreating(false);
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
    <div className="tokens-container">
      <div className="page-header">
        <h1>Tokens</h1>
        <div className="page-header-actions">
          <button
            className="page-header-btn"
            onClick={fetchUserTokens}
            disabled={isLoading || !wallet}
          >
            <IoRefresh size={15} /> Refresh
          </button>
          <button
            className="page-header-btn page-header-btn--primary"
            onClick={() => setShowCreateModal(true)}
            disabled={!wallet}
          >
            + Create Token
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ 
          padding: '12px 16px', 
          marginBottom: '16px', 
          backgroundColor: 'rgba(239, 68, 68, 0.08)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          borderRadius: '10px',
          color: '#ef4444',
          fontSize: '13px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {!wallet ? (
        <div className="no-tokens">
          <div className="no-tokens-icon"><IoWallet size={40} /></div>
          <h3>Wallet Not Connected</h3>
          <p>Connect your wallet to view tokens</p>
        </div>
      ) : isLoading ? (
        <div className="tokens-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="token-card loading">
              <div className="token-header">
                <div className="skeleton-circle" />
                <div className="token-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="skeleton-line w-60" />
                  <div className="skeleton-line w-40 h-8" />
                </div>
              </div>
              <div className="token-details">
                <div className="token-detail">
                  <div className="skeleton-line w-40 h-8" />
                  <div className="skeleton-line w-60 h-8" />
                </div>
                <div className="token-detail">
                  <div className="skeleton-line w-40 h-8" />
                  <div className="skeleton-line w-40 h-8" />
                </div>
                <div className="token-detail">
                  <div className="skeleton-line w-40 h-8" />
                  <div className="skeleton-line w-60 h-8" />
                </div>
              </div>
              <div className="token-actions">
                <div className="skeleton-line" style={{ flex: 1, height: '28px', borderRadius: '8px' }} />
                <div className="skeleton-line" style={{ flex: 1, height: '28px', borderRadius: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tokens-grid">
          {tokens.length === 0 ? (
            <div className="no-tokens">
              <div className="no-tokens-icon"><IoCube size={40} /></div>
              <h3>No tokens yet</h3>
              <p>Create your first BEP-20 token on opBNB</p>
              <button
                className="empty-state-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Create Token
              </button>
            </div>
          ) : (
          tokens.map((token, index) => (
            <motion.div
              key={token.id}
              className="token-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <div className="token-header">
                <div className="token-icon"><IoCube size={32} /></div>
                <div className="token-info">
                  <h3>{token.name}</h3>
                  <p className="token-symbol">{token.symbol}</p>
                </div>
              </div>
              
              <div className="token-details">
                <div className="token-detail">
                  <span className="label">Total Supply:</span>
                  <span className="value">{parseInt(token.totalSupply).toLocaleString()}</span>
                </div>
                <div className="token-detail">
                  <span className="label">Decimals:</span>
                  <span className="value">{token.decimals}</span>
                </div>
                <div className="token-detail">
                  <span className="label">Contract:</span>
                  <div className="address-row">
                    <span className="value">{shortenAddress(token.contractAddress)}</span>
                    <motion.button
                      className={`copy-btn ${copiedAddress === token.contractAddress ? 'copied' : ''}`}
                      onClick={() => copyToClipboard(token.contractAddress)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title={copiedAddress === token.contractAddress ? "Contract Copied!" : "Copy Contract Address"}
                    >
                      {copiedAddress === token.contractAddress ? <IoCheckmarkCircle /> : <IoCopy />}
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="token-actions">
                <button
                  className="action-btn primary"
                  onClick={() => window.open(`https://opbnb.bscscan.com/token/${token.contractAddress}`, '_blank')}
                >
                  Explorer
                </button>
                <button
                  className={`action-btn secondary ${copiedAddress === token.contractAddress ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(token.contractAddress)}
                >
                  {copiedAddress === token.contractAddress ? <><IoCheckmarkCircle /> Copied</> : <><IoCopy /> Copy</>}
                </button>
              </div>
            </motion.div>
          ))
        )}
        </div>
      )}

      {/* Create Token Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <motion.div
            className="modal create-token-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3>Create BEP-20 Token</h3>
            <div className="modal-form">
              <div className="form-group">
                <label>Token Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., My Awesome Token"
                />
              </div>
              <div className="form-group">
                <label>Token Symbol</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  placeholder="e.g., MAT"
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label>Total Supply</label>
                <input
                  type="number"
                  value={formData.totalSupply}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalSupply: e.target.value }))}
                  placeholder="e.g., 1000000"
                />
              </div>
              <div className="form-group">
                <label>Decimals</label>
                <select
                  value={formData.decimals}
                  onChange={(e) => setFormData(prev => ({ ...prev, decimals: e.target.value }))}
                >
                  <option value="18">18 (Standard)</option>
                  <option value="8">8</option>
                  <option value="6">6</option>
                  <option value="0">0</option>
                </select>
              </div>
              
              <div className="creation-info">
                <p>▸ This will deploy a new BEP-20 token contract on opBNB</p>
                <p>$ Estimated gas fee: ~0.001 BNB</p>
              </div>

              <div className="modal-actions">
                <button
                  className="modal-btn secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  className="modal-btn primary"
                  onClick={handleCreateToken}
                  disabled={!formData.name || !formData.symbol || !formData.totalSupply || isCreating}
                >
                  {isCreating ? 'Creating Token...' : 'Create Token'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Tokens;
