import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BlockchainAction } from '../services/geminiAI';
import { ConversationService } from '../services/conversationService';

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
  hasUploaded?: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: Date;
}

export interface PendingAction {
  action: BlockchainAction;
  messageId: string;
  isWaitingForConfirmation: boolean;
}

const WELCOME_MESSAGE: ConversationMessage = {
  id: 'welcome',
  type: 'ai',
  content: 'Hello! I\'m your opBNB Chain Agent. I can help you:\n\n◎ Create BEP-20 tokens\n■ Mint NFTs with Lighthouse IPFS storage\n⚡ Send BNB transactions\n🎓 Issue & verify blockchain certificates\n◆ Check balances and transaction history\n\nJust tell me what you\'d like to do in natural language!',
  timestamp: new Date()
};

interface ConversationState {
  messages: ConversationMessage[];
  pendingAction: PendingAction | null;
  isProcessing: boolean;

  // Chat history state
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  isLoadingHistory: boolean;
  historyPanelOpen: boolean;
  _titleGenerated: boolean;
  
  // Actions
  addMessage: (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<ConversationMessage>) => void;
  setPendingAction: (action: PendingAction | null) => void;
  setProcessing: (processing: boolean) => void;
  clearConversation: () => void;
  confirmAction: () => Promise<void>;
  rejectAction: () => void;

  // Chat history actions
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setHistoryPanelOpen: (open: boolean) => void;
  persistMessage: (message: ConversationMessage) => Promise<void>;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      messages: [{ ...WELCOME_MESSAGE, timestamp: new Date() }],
      pendingAction: null,
      isProcessing: false,

      // Chat history
      conversations: [],
      activeConversationId: null,
      isLoadingHistory: false,
      historyPanelOpen: false,
      _titleGenerated: false,

      // ── Chat history actions ──

      loadConversations: async () => {
        try {
          set({ isLoadingHistory: true });
          const rows = await ConversationService.getConversations();
          const conversations: ConversationSummary[] = rows.map((r) => ({
            id: r.id,
            title: r.title,
            updatedAt: new Date(r.updated_at),
          }));
          set({ conversations, isLoadingHistory: false });
        } catch (err) {
          console.warn('[ConversationStore] loadConversations failed:', err);
          set({ isLoadingHistory: false });
        }
      },

      selectConversation: async (id: string) => {
        try {
          set({ isLoadingHistory: true });
          const rows = await ConversationService.getMessages(id);
          const messages: ConversationMessage[] = rows.map((r) => ({
            id: r.id,
            type: r.type,
            content: r.content,
            timestamp: new Date(r.created_at),
            action: r.action ? (r.action as unknown as BlockchainAction) : undefined,
            requiresConfirmation: r.requires_confirmation || false,
            status: (r.status as ConversationMessage['status']) || undefined,
          }));
          // If empty, show welcome
          if (messages.length === 0) {
            messages.push({ ...WELCOME_MESSAGE, timestamp: new Date() });
          }
          set({
            activeConversationId: id,
            messages,
            pendingAction: null,
            isProcessing: false,
            isLoadingHistory: false,
            _titleGenerated: true, // existing conversations already have titles
          });
        } catch (err) {
          console.warn('[ConversationStore] selectConversation failed:', err);
          set({ isLoadingHistory: false });
        }
      },

      startNewConversation: async () => {
        try {
          const row = await ConversationService.createConversation('New Chat');
          const summary: ConversationSummary = {
            id: row.id,
            title: row.title,
            updatedAt: new Date(row.updated_at),
          };
          set((state) => ({
            conversations: [summary, ...state.conversations],
            activeConversationId: row.id,
            messages: [{ ...WELCOME_MESSAGE, timestamp: new Date() }],
            pendingAction: null,
            isProcessing: false,
            _titleGenerated: false,
          }));
        } catch (err) {
          console.warn('[ConversationStore] startNewConversation failed:', err);
          // Fallback: just reset messages locally
          set({
            activeConversationId: null,
            messages: [{ ...WELCOME_MESSAGE, timestamp: new Date() }],
            pendingAction: null,
            isProcessing: false,
            _titleGenerated: false,
          });
        }
      },

      deleteConversation: async (id: string) => {
        try {
          await ConversationService.deleteConversation(id);
          const state = get();
          const remaining = state.conversations.filter((c) => c.id !== id);
          set({ conversations: remaining });

          // If we deleted the active conversation, switch
          if (state.activeConversationId === id) {
            if (remaining.length > 0) {
              // Select the most recent remaining
              await get().selectConversation(remaining[0].id);
            } else {
              // No conversations left — start fresh
              await get().startNewConversation();
            }
          }
        } catch (err) {
          console.warn('[ConversationStore] deleteConversation failed:', err);
        }
      },

      setHistoryPanelOpen: (open: boolean) => {
        set({ historyPanelOpen: open });
      },

      persistMessage: async (message: ConversationMessage) => {
        const state = get();
        if (!state.activeConversationId) return;

        try {
          await ConversationService.addMessage(state.activeConversationId, {
            type: message.type,
            content: message.content,
            action: message.action as Record<string, unknown> | undefined,
            requires_confirmation: message.requiresConfirmation || false,
            status: message.status || null,
          });

          // Update local updatedAt so history panel stays in sync
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === s.activeConversationId
                ? { ...c, updatedAt: new Date() }
                : c
            ),
          }));

          // Auto-title: on first user message for a new conversation
          if (message.type === 'user' && !state._titleGenerated) {
            const title = ConversationService.generateTitle(message.content);
            await ConversationService.updateConversationTitle(
              state.activeConversationId,
              title
            );
            set((s) => ({
              _titleGenerated: true,
              conversations: s.conversations.map((c) =>
                c.id === s.activeConversationId
                  ? { ...c, title }
                  : c
              ),
            }));
          }
        } catch (err) {
          console.warn('[ConversationStore] persistMessage failed:', err);
        }
      },

      // ── Original actions (preserved) ──

      addMessage: (message) => {
        const newMessage: ConversationMessage = {
          ...message,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date()
        };
        set((state) => ({
          messages: [...state.messages, newMessage]
        }));

        // Persist in background (fire-and-forget)
        get().persistMessage(newMessage);
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
        // Start a new conversation instead of just wiping
        get().startNewConversation();
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

            case 'issue_certificate': {
              const { CertificateService } = await import('../services/certificateService');
              const certMeta = {
                recipientName: action.details.recipientName || '',
                recipientWallet: action.details.recipientWallet,
                institution: action.details.institution || '',
                course: action.details.course || '',
                grade: action.details.grade,
                certificateType: action.details.certificateType || 'completion',
                dateIssued: new Date().toISOString(),
                description: action.details.description,
                issuerWallet: walletState.wallet.address
              };
              const certResult = await CertificateService.issueCertificate(certMeta, privateKey);
              result = {
                success: certResult.success,
                hash: certResult.hash,
                explorerUrl: certResult.explorerUrl,
                tokenId: certResult.certId,
                error: certResult.error
              };
              break;
            }
              
            default:
              throw new Error(`Unsupported action: ${action.action}`);
          }

          // Create result message
          let successMessage: ConversationMessage;
          
          if (result.success) {
            let content = '';

            // Certificate-specific success message
            if (action.action === 'issue_certificate') {
              content += `🎓 **Certificate Issued Successfully!**\n\n`;
              content += `▸ **Certificate ID**: \`${result.tokenId}\`\n`;
              content += `▸ **Transaction Hash**: \`${result.hash}\`\n`;
              const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
              content += `\n🔗 **Verification Link**: [${appUrl}/verify/${result.tokenId}](${appUrl}/verify/${result.tokenId})\n`;
              content += `\nAnyone can verify this certificate using the link above — no login required.`;
              if (result.explorerUrl) {
                content += `\n\n[View on Explorer](${result.explorerUrl})`;
              }
            } else {
              content += `✓ **Transaction Successful!**\n\n`;
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

          // Persist the result message
          get().persistMessage(successMessage);
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

          get().persistMessage(errorMessage);
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
          timestamp: msg.timestamp.toISOString()
        })),
        activeConversationId: state.activeConversationId,
        _titleGenerated: state._titleGenerated,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as any;
        if (persisted?.messages) {
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
