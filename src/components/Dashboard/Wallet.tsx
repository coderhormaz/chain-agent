import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { IoCopy, IoCheckmarkCircle, IoTrendingUp, IoTrendingDown, IoEye } from 'react-icons/io5';
import { useWalletStore } from '../../store/walletStore';
import { ethers } from 'ethers';
import { TransactionService, type Transaction } from '../../services/transactionService';
import { WalletService } from '../../lib/wallet';

const Wallet: React.FC = () => {
  const { wallet, balance, balanceUSD, bnbPrice, isLoadingPrice, setBalance, updateBNBPrice } = useWalletStore();
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState<string>('');
  const [sendAmount, setSendAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!wallet?.address) return;
    
    try {
      setIsLoadingBalance(true);
      // opBNB Mainnet RPC
      const provider = new ethers.JsonRpcProvider('https://opbnb-mainnet-rpc.bnbchain.org');
      const balanceWei = await provider.getBalance(wallet.address);
      const balanceEth = ethers.formatEther(balanceWei);
      const formattedBalance = parseFloat(balanceEth).toFixed(6);
      setBalance(formattedBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0.000000');
    } finally {
      setIsLoadingBalance(false);
    }
  }, [wallet?.address, setBalance]);

  const fetchTransactions = useCallback(async () => {
    if (!wallet?.address) return;
    
    try {
      setIsLoadingTransactions(true);
      console.log('Fetching transactions for wallet:', wallet.address);
      const txs = await TransactionService.fetchTransactions(wallet.address);
      console.log('Transactions fetched:', txs.length);
      setTransactions(txs);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Set empty array on error - don't show error to user
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [wallet?.address]);

  useEffect(() => {
    if (wallet?.address) {
      fetchBalance();
      fetchTransactions();
      // Update BNB price on component mount
      updateBNBPrice();
      
      // Update price every 5 minutes
      const priceInterval = setInterval(updateBNBPrice, 5 * 60 * 1000);
      
      return () => clearInterval(priceInterval);
    }
  }, [wallet?.address, updateBNBPrice, fetchBalance, fetchTransactions]);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      
      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedText(null);
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
      
      setCopiedText(text);
      setTimeout(() => {
        setCopiedText(null);
      }, 2000);
    }
  };

  const handleSendBNB = async () => {
    if (!wallet?.privateKey || !recipientAddress || !sendAmount) return;
    
    try {
      setIsLoadingBalance(true);
      const provider = new ethers.JsonRpcProvider('https://opbnb-mainnet-rpc.bnbchain.org');
      
      // Decrypt private key before using it
      const decryptedPrivateKey = WalletService.decryptPrivateKey(wallet.privateKey);
      const walletInstance = new ethers.Wallet(decryptedPrivateKey, provider);
      
      const tx = await walletInstance.sendTransaction({
        to: recipientAddress,
        value: ethers.parseEther(sendAmount)
      });
      
      console.log('Transaction sent:', tx.hash);
      setShowSendModal(false);
      setSendAmount('');
      setRecipientAddress('');
      fetchBalance();
      fetchTransactions();
    } catch (error) {
      console.error('Error sending transaction:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const showPrivateKeyModal = () => {
    // Show the warning modal first
    setShowWarningModal(true);
  };

  const handleConfirmReveal = () => {
    if (wallet?.privateKey) {
      // Decrypt the private key before showing
      const decrypted = WalletService.decryptPrivateKey(wallet.privateKey);
      setDecryptedPrivateKey(decrypted);
      setShowWarningModal(false);
      setShowPrivateKey(true);
    }
  };

  const handleCancelReveal = () => {
    setShowWarningModal(false);
  };

  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h1>My Wallet</h1>
        <motion.button
          className="refresh-btn"
          onClick={fetchBalance}
          disabled={isLoadingBalance}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isLoadingBalance ? '⟳' : '↻'} Refresh
        </motion.button>
      </div>

      <div className="wallet-cards">
        {/* Balance Card */}
        <motion.div
          className="wallet-card balance-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
            flexWrap: 'wrap',
            gap: 'var(--space-3)'
          }}>
            <span style={{ fontSize: 'var(--text-xl)', fontWeight: '600' }}>Wallet Balance</span>
            {bnbPrice && (
              <span className="bnb-price-indicator">
                {bnbPrice.change24h >= 0 ? <IoTrendingUp /> : <IoTrendingDown />} ${bnbPrice.price.toLocaleString('en-US', { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })}
              </span>
            )}
          </h3>
          <div className="balance-amount">
            {isLoadingBalance ? (
              <div className="loading">Loading...</div>
            ) : (
              <span>{balance} BNB</span>
            )}
          </div>
          <p className="balance-usd" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-3)'
          }}>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: '600' }}>
              {isLoadingPrice ? 'Loading price...' : balanceUSD}
            </span>
            {bnbPrice && (
              <span className={`price-change ${bnbPrice.change24h >= 0 ? 'positive' : 'negative'}`}>
                {bnbPrice.change24h >= 0 ? ' (+' : ' ('}
                {bnbPrice.change24h.toFixed(2)}% 24h)
              </span>
            )}
          </p>
        </motion.div>

        {/* Address Card */}
        <motion.div
          className="wallet-card address-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h3>Wallet Address</h3>
          <div className="address-display">
            <span className="address-text">
              {wallet?.address ? shortenAddress(wallet.address) : 'Not connected'}
            </span>
            {wallet?.address && (
              <motion.button
                className={`copy-btn ${copiedText === wallet.address ? 'copied' : ''}`}
                onClick={() => copyToClipboard(wallet.address)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={copiedText === wallet.address ? "Address Copied!" : "Copy Wallet Address"}
              >
                {copiedText === wallet.address ? <IoCheckmarkCircle /> : <IoCopy />}
              </motion.button>
            )}
          </div>
          <div className="wallet-actions">
            <motion.button
              className="action-btn primary"
              onClick={() => setShowSendModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Send BNB
            </motion.button>
            <motion.button
              className="action-btn secondary"
              onClick={() => window.open(`https://opbnb.bscscan.com/address/${wallet?.address}`, '_blank')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View on Explorer
            </motion.button>
            <motion.button
              className="action-btn danger"
              onClick={showPrivateKeyModal}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IoEye /> Reveal Private Key
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Transactions */}
      <motion.div
        className="transactions-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Recent Transactions</h3>
          <motion.button
            className="refresh-btn"
            onClick={fetchTransactions}
            disabled={isLoadingTransactions}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          >
            {isLoadingTransactions ? '⟳' : '↻'} Refresh
          </motion.button>
        </div>
        <div className="transactions-list">
          {isLoadingTransactions ? (
            <div className="loading-transactions">
              <div className="loading">Loading transactions...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="no-transactions">
              <p>No transactions found</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>
                Transactions will appear here once you send or receive BNB
              </p>
            </div>
          ) : (
            transactions.map((tx, index) => (
              <motion.div
                key={tx.hash}
                className="transaction-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => window.open(TransactionService.getExplorerUrl(tx.hash), '_blank')}
                style={{ cursor: 'pointer' }}
              >
                <div className="tx-info">
                  <div className="tx-type">{tx.type}</div>
                  <div className="tx-amount">{tx.amount}</div>
                </div>
                <div className="tx-details">
                  <div className="tx-hash" title={tx.hash}>
                    {TransactionService.shortenHash(tx.hash)}
                  </div>
                  <div className="tx-address">
                    {tx.from && tx.type === 'Received' && `From: ${shortenAddress(tx.from)}`}
                    {tx.to && tx.type === 'Sent' && `To: ${shortenAddress(tx.to)}`}
                    {tx.type === 'Contract Interaction' && `Contract: ${tx.to ? shortenAddress(tx.to) : 'N/A'}`}
                  </div>
                  <div className="tx-time">
                    {tx.timestamp.toLocaleDateString()} {tx.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                <div className={`tx-status ${tx.status.toLowerCase()}`}>
                  {tx.status}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <motion.div
            className="modal send-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3>Send BNB</h3>
            <div className="modal-form">
              <div className="form-group">
                <label>Recipient Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="form-group">
                <label>Amount (BNB)</label>
                <input
                  type="number"
                  step="0.001"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div className="modal-actions">
                <button
                  className="modal-btn secondary"
                  onClick={() => setShowSendModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="modal-btn primary"
                  onClick={handleSendBNB}
                  disabled={!recipientAddress || !sendAmount || isLoadingBalance}
                >
                  {isLoadingBalance ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Security Warning Modal */}
      {showWarningModal && (
        <motion.div
          className="security-warning-modal-compact"
          onClick={handleCancelReveal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="modal-content-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="warning-header-compact">
              <span className="warning-icon-compact">⚠️</span>
              <div>
                <h3>Security Confirmation</h3>
                <p>Critical wallet information</p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="warning-content-compact">
              <div className="alert-box">
                <strong>🔐 Your private key = Complete wallet control</strong>
                <p>Anyone with this key can access all funds</p>
              </div>

              <div className="rules-compact">
                <div className="rule-group">
                  <h4>❌ Never</h4>
                  <div className="rule">Share with anyone</div>
                  <div className="rule">Screenshot or store in cloud</div>
                </div>
                <div className="rule-group">
                  <h4>✅ Always</h4>
                  <div className="rule">Check surroundings</div>
                  <div className="rule">Write on paper, store safely</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="modal-actions-compact">
              <button
                className="modal-btn secondary"
                onClick={handleCancelReveal}
              >
                Cancel
              </button>
              <button
                className="modal-btn danger"
                onClick={handleConfirmReveal}
              >
                Reveal Key
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Private Key Modal */}
      {showPrivateKey && decryptedPrivateKey && (
        <motion.div
          className="private-key-modal-compact"
          onClick={() => {
            setShowPrivateKey(false);
            setDecryptedPrivateKey('');
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="modal-content-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pk-header-compact">
              <span className="pk-icon">🔐</span>
              <div>
                <h3>Your Private Key</h3>
                <p>Store securely • Never share</p>
              </div>
            </div>

            {/* Private Key Display */}
            <div className="pk-display-section">
              <div className="pk-display-box">
                <code className="pk-code">{decryptedPrivateKey}</code>
                <button
                  className={`pk-copy-btn ${copiedText === decryptedPrivateKey ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(decryptedPrivateKey)}
                >
                  {copiedText === decryptedPrivateKey ? (
                    <><IoCheckmarkCircle size={16} /> Copied</>
                  ) : (
                    <><IoCopy size={16} /> Copy</>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="pk-tips">
              <div className="pk-tip">📝 Write on paper</div>
              <div className="pk-tip">🔒 Store in safe</div>
              <div className="pk-tip">❌ No screenshots</div>
              <div className="pk-tip">🚫 Never share</div>
            </div>

            {/* Action */}
            <div className="modal-actions-compact">
              <button
                className="modal-btn danger full-width"
                onClick={() => {
                  setShowPrivateKey(false);
                  setDecryptedPrivateKey(''); // Clear decrypted key from memory
                }}
              >
                Close & Clear
              </button>
            </div>

            {/* Trust Badge */}
            <div className="pk-footer">
              🔐 End-to-end encrypted • Never stored
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Wallet;
