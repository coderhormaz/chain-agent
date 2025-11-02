import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, User, Wallet, DollarSign } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface TransactionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  transactionDetails: {
    recipientName?: string;
    recipientAddress: string;
    amount: string;
    token: string;
    estimatedFee?: string;
  };
}

export const TransactionConfirmationModal: React.FC<TransactionConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transactionDetails,
}) => {
  const { theme } = useTheme();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (isConfirming) return;

    setIsConfirming(true);
    setError('');

    try {
      await onConfirm();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      setError(errorMessage);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    if (!isConfirming) {
      onClose();
      setError('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-[0_20px_60px_-15px_rgba(34,197,94,0.3)] border border-green-500/30"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-green-500/20 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <Send className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Transaction</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">Review before sending</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isConfirming}
              className="w-8 h-8 !p-0 rounded-lg !bg-green-500 dark:!bg-gray-800 hover:!bg-green-600 dark:hover:!bg-gray-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed !border-0"
            >
              <X 
                className="w-5 h-5" 
                style={{ 
                  stroke: theme === 'dark' ? '#f3f4f6' : '#ffffff', 
                  strokeWidth: 2.5 
                }} 
              />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">Transaction Failed</p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Transaction Details */}
            <div className="space-y-3">
              {/* Recipient */}
              <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-green-50/50 dark:from-gray-800 dark:to-green-900/20 border border-green-200 dark:border-green-500/30">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    {transactionDetails.recipientName ? (
                      <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Recipient</p>
                    {transactionDetails.recipientName && (
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                        {transactionDetails.recipientName}
                      </p>
                    )}
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-mono break-all">
                      {transactionDetails.recipientAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-green-50/50 dark:from-gray-800 dark:to-green-900/20 border border-green-200 dark:border-green-500/30">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Amount</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {transactionDetails.amount} {transactionDetails.token}
                    </p>
                  </div>
                </div>
              </div>

              {/* Network Fee */}
              {transactionDetails.estimatedFee && (
                <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-green-50/50 dark:from-gray-800 dark:to-green-900/20 border border-green-200 dark:border-green-500/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Estimated Network Fee</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{transactionDetails.estimatedFee}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Please verify all transaction details carefully. This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={isConfirming}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirming}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-medium shadow-lg shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Confirming...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirm & Send
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
