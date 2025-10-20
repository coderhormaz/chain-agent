import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BlockchainAction } from '../services/geminiAI';

export interface ConversationMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  action?: BlockchainAction;
  requiresConfirmation?: boolean;
  showUpload?: boolean;
  uploadedImage?: {url: string, fileName: string};
  status?: 'success' | 'error' | 'info';
}

export interface PendingAction {
  action: BlockchainAction;
  messageId: string;
  isWaitingForConfirmation: boolean;
}

interface ConversationState {
  messages: ConversationMessage[];
  pendingAction: PendingAction | null;
  isProcessing: boolean;
  
  // Actions
  addMessage: (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<ConversationMessage>) => void;
  setPendingAction: (action: PendingAction | null) => void;
  setProcessing: (processing: boolean) => void;
  clearConversation: () => void;
  confirmAction: () => Promise<void>;
  rejectAction: () => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      messages: [
        {
          id: 'welcome',
          type: 'ai',
          content: 'Hello! I\'m your opBNB AI Assistant powered by Gemini. I can help you:\n\n◎ Create BEP-20 tokens\n■ Mint NFTs with Lighthouse IPFS storage\n⚡ Send BNB transactions\n◆ Check balances and transaction history\n\nJust tell me what you\'d like to do in natural language!',
          timestamp: new Date()
        }
      ],
      pendingAction: null,
      isProcessing: false,

      addMessage: (message) => {
        const newMessage: ConversationMessage = {
          ...message,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date()
        };
        set((state) => ({
          messages: [...state.messages, newMessage]
        }));
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          )
        }));
      },

      setPendingAction: (pendingAction) => {
        set({ pendingAction });
      },

      setProcessing: (isProcessing) => {
        set({ isProcessing });
      },

      clearConversation: () => {
        set({
          messages: [
            {
              id: 'welcome',
              type: 'ai',
              content: 'Hello! I\'m your opBNB AI Assistant powered by Gemini. I can help you:\n\n◎ Create BEP-20 tokens\n■ Mint NFTs with Lighthouse IPFS storage\n⚡ Send BNB transactions\n◆ Check balances and transaction history\n\nJust tell me what you\'d like to do in natural language!',
              timestamp: new Date()
            }
          ],
          pendingAction: null,
          isProcessing: false
        });
      },

      confirmAction: async () => {
        const state = get();
        if (!state.pendingAction) return;

        try {
          set({ isProcessing: true });
          
          // Import blockchain service
          const { BlockchainService } = await import('../services/blockchainService');
          const { useWalletStore } = await import('./walletStore');
          const { WalletService } = await import('../lib/wallet');
          
          // Get wallet data
          const walletState = useWalletStore.getState();
          if (!walletState.wallet?.privateKey) {
            throw new Error('Wallet not connected');
          }

          // Decrypt private key
          const privateKey = WalletService.decryptPrivateKey(walletState.wallet.privateKey);
          
          let result;
          const action = state.pendingAction.action;

          // Execute based on action type
          switch (action.action) {
            case 'create_token':
              result = await BlockchainService.createToken(action.details, privateKey);
              break;
              
            case 'mint_nft':
              result = await BlockchainService.mintNFT(
                action.details, 
                walletState.wallet.address, 
                privateKey
              );
              break;
              
            case 'send_transaction':
              result = await BlockchainService.sendTransaction(action.details, privateKey);
              break;
              
            default:
              throw new Error(`Unsupported action: ${action.action}`);
          }

          // Create result message
          let successMessage: ConversationMessage;
          
          if (result.success) {
            let content = `✓ **Transaction Successful!**\n\n`;
            content += `▸ **Transaction Hash**: \`${result.hash}\`\n`;
            
            if (result.contractAddress) {
              content += `◆ **Contract Address**: \`${result.contractAddress}\`\n`;
            }
            
            if (result.tokenId) {
              content += `◈ **Token ID**: \`${result.tokenId}\`\n`;
            }
            
            if (result.explorerUrl) {
              content += `\n[View on Explorer](${result.explorerUrl})`;
            }

            successMessage = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'ai',
              content,
              timestamp: new Date(),
              status: 'success'
            };
          } else {
            successMessage = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'ai',
              content: `✗ **Transaction Failed**\n\n${result.error}`,
              timestamp: new Date(),
              status: 'error'
            };
          }

          set((state) => ({
            messages: [...state.messages, successMessage],
            pendingAction: null,
            isProcessing: false
          }));
        } catch (error: any) {
          console.error('Action execution failed:', error);
          
          const errorMessage: ConversationMessage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: 'ai',
            content: `✗ **Transaction Failed**\n\n${error.message || 'Unknown error occurred'}`,
            timestamp: new Date(),
            status: 'error'
          };

          set((state) => ({
            messages: [...state.messages, errorMessage],
            pendingAction: null,
            isProcessing: false
          }));
        }
      },

      rejectAction: () => {
        set({ pendingAction: null });
      }
    }),
    {
      name: 'conversation-storage',
      partialize: (state) => ({
        messages: state.messages.slice(-50).map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString() // Convert Date to string for storage
        }))
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as any;
        if (persisted?.messages) {
          // Convert timestamp strings back to Date objects
          persisted.messages = persisted.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }
        return { ...currentState, ...persisted };
      }
    }
  )
);
