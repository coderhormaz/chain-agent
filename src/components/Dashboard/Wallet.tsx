import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { IoCopy, IoCheckmarkCircle, IoTrendingUp, IoTrendingDown, IoEye, IoSend, IoWallet, IoMail, IoCash, IoClose, IoRefresh, IoArrowUp, IoArrowDown, IoSwapVertical, IoFlame } from 'react-icons/io5';
import { useWalletStore } from '../../store/walletStore';
import { ethers } from 'ethers';
import { TransactionService, type Transaction } from '../../services/transactionService';
import { WalletService } from '../../lib/wallet';

// ── Transaction Analytics Component ──
const TransactionAnalytics: React.FC<{ transactions: Transaction[]; bnbPrice: number }> = ({ transactions, bnbPrice }) => {
  const stats = useMemo(() => {
    let sent = 0, received = 0, contractCalls = 0, totalGasBNB = 0;

    for (const tx of transactions) {
      // Parse amount from strings like "+0.001631 BNB" or "-0.000000 BNB"
      const amtMatch = tx.amount.match(/([+-]?[\d.]+)/);
      const amt = amtMatch ? Math.abs(parseFloat(amtMatch[1])) : 0;

      if (tx.type === 'Sent') sent += amt;
      else if (tx.type === 'Received') received += amt;
      else contractCalls++;

      // Gas cost estimation from gasUsed * gasPrice
      if (tx.gasUsed && tx.gasPrice) {
        const gasUsed = BigInt(tx.gasUsed);
        const gasPrice = BigInt(tx.gasPrice);
        const gasCostWei = gasUsed * gasPrice;
        totalGasBNB += parseFloat(ethers.formatEther(gasCostWei));
      }
    }

    return {
      totalTx: transactions.length,
      sent: sent.toFixed(6),
      received: received.toFixed(6),
      contractCalls,
      totalGasBNB: totalGasBNB.toFixed(6),
      totalGasUSD: (totalGasBNB * bnbPrice).toFixed(4),
      sentUSD: (sent * bnbPrice).toFixed(2),
      receivedUSD: (received * bnbPrice).toFixed(2),
      netFlow: (received - sent).toFixed(6),
      netFlowUSD: ((received - sent) * bnbPrice).toFixed(2),
      isPositiveFlow: received >= sent
    };
  }, [transactions, bnbPrice]);

  return (
    <div className="analytics-grid">
      <div className="analytics-stat">
        <div className="analytics-stat-icon analytics-stat-icon--sent"><IoArrowUp size={16} /></div>
        <div className="analytics-stat-info">
          <span className="analytics-stat-label">Total Sent</span>
          <span className="analytics-stat-value">{stats.sent} BNB</span>
          <span className="analytics-stat-usd">≈ ${stats.sentUSD}</span>
        </div>
      </div>
      <div className="analytics-stat">
        <div className="analytics-stat-icon analytics-stat-icon--received"><IoArrowDown size={16} /></div>
        <div className="analytics-stat-info">
          <span className="analytics-stat-label">Total Received</span>
          <span className="analytics-stat-value">{stats.received} BNB</span>
          <span className="analytics-stat-usd">≈ ${stats.receivedUSD}</span>
        </div>
      </div>
      <div className="analytics-stat">
        <div className="analytics-stat-icon analytics-stat-icon--net"><IoSwapVertical size={16} /></div>
        <div className="analytics-stat-info">
          <span className="analytics-stat-label">Net Flow</span>
          <span className={`analytics-stat-value ${stats.isPositiveFlow ? 'positive' : 'negative'}`}>
            {stats.isPositiveFlow ? '+' : ''}{stats.netFlow} BNB
          </span>
          <span className="analytics-stat-usd">{stats.isPositiveFlow ? '+' : '-'}${Math.abs(parseFloat(stats.netFlowUSD)).toFixed(2)}</span>
        </div>
      </div>
      <div className="analytics-stat">
        <div className="analytics-stat-icon analytics-stat-icon--gas"><IoFlame size={16} /></div>
        <div className="analytics-stat-info">
          <span className="analytics-stat-label">Total Gas Spent</span>
          <span className="analytics-stat-value">{stats.totalGasBNB} BNB</span>
          <span className="analytics-stat-usd">≈ ${stats.totalGasUSD}</span>
        </div>
      </div>
      <div className="analytics-stat analytics-stat--wide">
        <div className="analytics-stat-info" style={{ textAlign: 'center', width: '100%' }}>
          <span className="analytics-stat-label">Transaction Summary</span>
          <div className="analytics-summary-row">
            <span className="analytics-tag analytics-tag--total">{stats.totalTx} Total</span>
            <span className="analytics-tag analytics-tag--sent">{transactions.filter(t => t.type === 'Sent').length} Sent</span>
            <span className="analytics-tag analytics-tag--received">{transactions.filter(t => t.type === 'Received').length} Received</span>
            {stats.contractCalls > 0 && <span className="analytics-tag analytics-tag--contract">{stats.contractCalls} Contracts</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [addressError, setAddressError] = useState('');
  const [amountError, setAmountError] = useState('');

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

  const validateAddress = (address: string) => {
    if (!address) {
      setAddressError('');
      return false;
    }
    if (!address.startsWith('0x') || address.length !== 42) {
      setAddressError('Invalid Ethereum address format');
      return false;
    }
    if (!ethers.isAddress(address)) {
      setAddressError('Invalid checksum address');
      return false;
    }
    setAddressError('');
    return true;
  };

  const validateAmount = (amount: string) => {
    if (!amount) {
      setAmountError('');
      return false;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      return false;
    }
    if (numAmount > parseFloat(balance)) {
      setAmountError('Amount exceeds available balance');
      return false;
    }
    setAmountError('');
    return true;
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecipientAddress(value);
    validateAddress(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSendAmount(value);
    if (value) validateAmount(value);
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

  const showPrivateKeyModal = () => {
    setShowWarningModal(true);
  };

  return (
    <div className="wallet-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Wallet</h1>
          <span className="page-header-badge">opBNB Mainnet</span>
        </div>
        <button
          className="page-header-btn"
          onClick={fetchBalance}
          disabled={isLoadingBalance}
        >
          <IoRefresh size={15} />
          Refresh
        </button>
      </div>

      <div className="wallet-cards">
        {/* Balance Card */}
        <motion.div
          className="dash-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="dash-card-header">
            <span className="dash-card-label">Balance</span>
            {bnbPrice && (
              <span className="bnb-price-indicator">
                {bnbPrice.change24h >= 0 ? <IoTrendingUp size={14} /> : <IoTrendingDown size={14} />}
                ${bnbPrice.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
          <div className="balance-amount">
            {isLoadingBalance ? (
              <div className="loading">Loading...</div>
            ) : (
              <span>{balance} BNB</span>
            )}
          </div>
          <div className="dash-card-footer">
            <span className="balance-usd-value">
              {isLoadingPrice ? 'Loading price...' : balanceUSD}
            </span>
            {bnbPrice && (
              <span className={`price-change ${bnbPrice.change24h >= 0 ? 'positive' : 'negative'}`}>
                {bnbPrice.change24h >= 0 ? '+' : ''}
                {bnbPrice.change24h.toFixed(2)}% 24h
              </span>
            )}
          </div>
        </motion.div>

        {/* Address Card */}
        <motion.div
          className="dash-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <div className="dash-card-header">
            <span className="dash-card-label">Address</span>
          </div>
          <div className="address-display">
            <span className="address-text">
              {wallet?.address ? shortenAddress(wallet.address) : 'Not connected'}
            </span>
            {wallet?.address && (
              <button
                className={`copy-btn ${copiedText === wallet.address ? 'copied' : ''}`}
                onClick={() => copyToClipboard(wallet.address)}
                title={copiedText === wallet.address ? "Copied!" : "Copy"}
              >
                {copiedText === wallet.address ? <IoCheckmarkCircle size={16} /> : <IoCopy size={16} />}
              </button>
            )}
          </div>
          <div className="wallet-actions">
            <button className="action-btn primary" onClick={() => setShowSendModal(true)}>
              Send BNB
            </button>
            <button
              className="action-btn secondary"
              onClick={() => window.open(`https://opbnb.bscscan.com/address/${wallet?.address}`, '_blank')}
            >
              Explorer
            </button>
            <button
              className="action-btn danger"
              onClick={showPrivateKeyModal}
            >
              <IoEye size={15} /> Reveal Key
            </button>
          </div>
        </motion.div>
      </div>

      {/* Transaction Analytics */}
      {transactions.length > 0 && (
        <motion.div
          className="analytics-section"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
        >
          <div className="section-header">
            <h3>Transaction Analytics</h3>
          </div>
          <TransactionAnalytics transactions={transactions} bnbPrice={bnbPrice?.price || 0} />
        </motion.div>
      )}

      {/* Transactions */}
      <motion.div
        className="transactions-section"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        <div className="section-header">
          <h3>Recent Transactions</h3>
          <button
            className="page-header-btn"
            onClick={fetchTransactions}
            disabled={isLoadingTransactions}
          >
            <IoRefresh size={14} />
            Refresh
          </button>
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
            {/* Premium Header */}
            <div className="send-modal-header">
              <div className="send-header-icon">
                <IoSend size={24} />
              </div>
              <div className="send-header-content">
                <h3>Send BNB</h3>
                <p>Transfer BNB securely</p>
              </div>
            </div>

            {/* Balance Display */}
            <div className="send-balance-display">
              <div className="balance-info">
                <IoWallet size={16} />
                <span className="balance-amount">{balance} BNB</span>
                <span className="balance-usd">≈ {balanceUSD}</span>
              </div>
            </div>

            <div className="modal-form">
              {/* Recipient Address */}
              <div className="form-group">
                <label>
                  <IoMail size={16} />
                  Recipient Address
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={handleAddressChange}
                    placeholder="0x..."
                    className={`premium-input ${addressError ? 'error' : recipientAddress && !addressError ? 'success' : ''}`}
                  />
                </div>
                {addressError && (
                  <div className="form-error-message">
                    {addressError}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="form-group">
                <label>
                  <IoCash size={16} />
                  Amount (BNB)
                </label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    step="0.001"
                    value={sendAmount}
                    onChange={handleAmountChange}
                    placeholder="0.0"
                    className={`premium-input ${amountError ? 'error' : sendAmount && !amountError ? 'success' : ''}`}
                  />
                </div>
                {amountError && (
                  <div className="form-error-message">
                    {amountError}
                  </div>
                )}
                {sendAmount && (
                  <div className="amount-preview">
                    ≈ ${(parseFloat(sendAmount) * (bnbPrice?.price || 0)).toFixed(2)} USD
                  </div>
                )}
              </div>

              {/* Gas Estimation */}
              <div className="gas-estimation">
                <div className="gas-info">
                  <span className="gas-label">Network Fee:</span>
                  <span className="gas-amount">~0.000021 BNB</span>
                  <span className="gas-usd">(≈ ${bnbPrice ? (0.000021 * bnbPrice.price).toFixed(4) : '0.01'})</span>
                </div>
                {sendAmount && bnbPrice && (
                  <div className="gas-info" style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-primary)' }}>
                    <span className="gas-label">Total Cost:</span>
                    <span className="gas-amount">~{(parseFloat(sendAmount) + 0.000021).toFixed(6)} BNB</span>
                    <span className="gas-usd">(≈ ${((parseFloat(sendAmount) + 0.000021) * bnbPrice.price).toFixed(2)})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Actions */}
            <div className="modal-actions send-actions">
              <motion.button
                className="modal-btn secondary cancel-btn"
                onClick={() => setShowSendModal(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <IoClose size={16} />
                Cancel
              </motion.button>
              <motion.button
                className="modal-btn primary send-btn"
                onClick={handleSendBNB}
                disabled={!recipientAddress || !sendAmount || isLoadingBalance || !!addressError || !!amountError}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoadingBalance ? (
                  <>
                    <IoRefresh size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <IoSend size={16} />
                    Send BNB
                  </>
                )}
              </motion.button>
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
