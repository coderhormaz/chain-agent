import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoTrash, IoArrowForward, IoSparkles, IoWallet, IoImage, IoCube, IoSend } from 'react-icons/io5';
import { Users, Bot, Zap, History, Plus } from 'lucide-react';
import { useConversationStore } from '../../store/conversationStore';
import { geminiAI } from '../../services/geminiAI';
import { UploadButton, ImagePreview } from '../UploadButton';
import MessageRenderer from '../MessageRenderer';
import { ContactsModal } from './ContactsModal';
import ChatHistoryPanel from './ChatHistoryPanel';

const AIChat: React.FC = () => {
  const { 
    messages, 
    pendingAction, 
    isProcessing, 
    addMessage, 
    setPendingAction, 
    setProcessing,
    confirmAction,
    rejectAction,
    clearConversation,
    // Chat history
    conversations,
    activeConversationId,
    isLoadingHistory,
    historyPanelOpen,
    loadConversations,
    selectConversation,
    startNewConversation,
    deleteConversation,
    setHistoryPanelOpen,
  } = useConversationStore();
  
  const [inputValue, setInputValue] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{url: string, fileName: string, ipfsUrl?: string, file: File} | null>(null);
  const [isWaitingForNFTDetails, setIsWaitingForNFTDetails] = useState(false);
  const [pendingNFTDetails, setPendingNFTDetails] = useState<{name?: string, description?: string} | null>(null);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [historyInitialized, setHistoryInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    if (!historyInitialized) {
      setHistoryInitialized(true);
      loadConversations().then(() => {
        const state = useConversationStore.getState();
        // Validate that the persisted activeConversationId still exists
        // (handles: deleted conversation, different user signed in, first visit)
        const hasValidActive = state.activeConversationId &&
          state.conversations.some((c) => c.id === state.activeConversationId);

        if (!hasValidActive && state.conversations.length === 0) {
          startNewConversation();
        } else if (!hasValidActive && state.conversations.length > 0) {
          selectConversation(state.conversations[0].id);
        }
      });
    }
  }, [historyInitialized, loadConversations, startNewConversation, selectConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    // Prevent sending empty messages
    if (!inputValue.trim() || isProcessing) {
      return;
    }

    const userInput = inputValue.trim();
    setInputValue('');

    // Add user message
    addMessage({
      type: 'user',
      content: userInput
    });

    // Check if this is a confirmation response
    if (pendingAction?.isWaitingForConfirmation) {
      await handleConfirmationResponse(userInput);
      return;
    }

    // Check if we're waiting for NFT details after upload
    if (isWaitingForNFTDetails) {
      await handleNFTDetailsAfterUpload(userInput);
      return;
    }

    // Process with Gemini AI
    setProcessing(true);
    
    try {
      const conversationContext = messages.slice(-10); // Last 10 messages for context
      const result = await geminiAI.processUserInput(userInput, conversationContext);
      console.log('AI Result:', result); // Debug log

      // Handle special upload_nft action first
      if (result.action && result.action.action === 'upload_nft' && result.action.isComplete && result.requiresConfirmation) {
        // Store NFT details from the action for later use, but only if they're valid
        if (result.action.details && result.action.details.name) {
          // Check if the name is actually a valid NFT name and not a command
          const isValidNFTName = result.action.details.name && 
                                !result.action.details.name.toLowerCase().match(/^(mint|create|make|upload)\s+(nft|an?\s+nft)$/);
          
          if (isValidNFTName) {
            setPendingNFTDetails({
              name: result.action.details.name,
              description: result.action.details.description
            });
          }
        }
        
        addMessage({
          type: 'ai',
          content: result.response,
          action: result.action,
          showUpload: true,
          requiresConfirmation: false
        });
        return;
      }

      // Add AI response for other cases
      const aiMessage = {
        type: 'ai' as const,
        content: result.response,
        action: result.action || undefined,
        requiresConfirmation: result.requiresConfirmation
      };

      addMessage(aiMessage);

      // Handle confirmation flow for other actions
      if (result.action && result.action.isComplete && result.requiresConfirmation) {
        
        // Generate confirmation message (now async)
        try {
          const confirmationMessage = await geminiAI.generateConfirmationMessage(result.action);
          
          addMessage({
            type: 'ai',
            content: confirmationMessage
          });

          setPendingAction({
            action: result.action,
            messageId: Date.now().toString(),
            isWaitingForConfirmation: true
          });
        } catch (error) {
          console.error('Error generating confirmation message:', error);
          addMessage({
            type: 'ai',
            content: 'Error generating confirmation. Please try again.'
          });
        }
      }

    } catch (error) {
      console.error('Error processing message:', error);
      addMessage({
        type: 'ai',
        content: 'I apologize, but I encountered an error. Please check your internet connection and try again.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmationResponse = async (input: string) => {
    const normalizedInput = input.toLowerCase().trim();
    
    if (['yes', 'y', 'confirm', 'proceed', 'ok', 'sure'].includes(normalizedInput)) {
      // User confirmed - execute the action
      try {
        setProcessing(true);
        await confirmAction({ nftImageFile: uploadedImage?.file || null }); // This now handles the blockchain execution
        // The confirmAction method will add success/failure messages automatically
      } catch (error) {
        console.error('Error executing action:', error);
        addMessage({
          type: 'ai',
          content: `✗ **Execution Failed**

An error occurred while executing the blockchain transaction. Please try again.`,
          status: 'error'
        });
      } finally {
        setProcessing(false);
      }
    } else if (['no', 'n', 'cancel', 'abort', 'stop'].includes(normalizedInput)) {
      // User rejected
      rejectAction();
      addMessage({
        type: 'ai',
        content: `✗ **Action Cancelled**

No problem! The action has been cancelled. Is there something else I can help you with?`,
        status: 'error'
      });
    } else {
      // Unclear response, ask again
      addMessage({
        type: 'ai',
        content: `I didn't understand your response. Please reply with **"Yes"** to confirm or **"No"** to cancel the action.`
      });
    }
  };

  // Handle image upload completion
  const handleUploadComplete = async (url: string, fileName: string, ipfsHash: string | undefined, file: File) => {
    // url is a local blob URL for display; ipfsHash is needed for blockchain
    const ipfsUrl = ipfsHash ? `https://dweb.link/ipfs/${ipfsHash}` : url;
    setUploadedImage({ url, fileName, ipfsUrl, file });
    
    // Mark the upload message as completed
    const uploadMessage = messages.find(msg => msg.showUpload && !msg.hasUploaded);
    if (uploadMessage) {
      useConversationStore.getState().updateMessage(uploadMessage.id, { hasUploaded: true });
    }
    
    // Check if we already have NFT details from the original request
    if (pendingNFTDetails && pendingNFTDetails.name && pendingNFTDetails.name.trim().length > 0) {
      // We have valid details - proceed directly to confirmation
      const name = pendingNFTDetails.name;
      const description = pendingNFTDetails.description || `NFT created with opBNB AI Assistant`;

      // Create NFT action with uploaded image
      const nftAction = {
        action: 'mint_nft' as const,
        confidence: 0.95,
        details: {
          name: name,
          description: description,
          imageUrl: ipfsUrl,
          attributes: []
        },
        missingFields: [],
        isComplete: true
      };

      try {
        // Generate confirmation
        const confirmationMessage = await geminiAI.generateConfirmationMessage(nftAction);
        
        addMessage({
          type: 'ai',
          content: `✓ **Image uploaded successfully to Lighthouse IPFS!**

Your image "${fileName}" has been stored on the decentralized network.

${confirmationMessage}`,
          uploadedImage: { url, fileName }
        });

        setPendingAction({
          action: nftAction,
          messageId: Date.now().toString(),
          isWaitingForConfirmation: true
        });

        // Clear pending NFT details
        setPendingNFTDetails(null);
      } catch (error) {
        console.error('Error generating confirmation message:', error);
        addMessage({
          type: 'ai',
          content: `✓ **Image uploaded successfully!** 

Your image "${fileName}" has been stored on Lighthouse IPFS. There was an error generating the confirmation. Please try again.`,
          uploadedImage: { url, fileName }
        });
      }
    } else {
      // No details available - ask for them
      setIsWaitingForNFTDetails(true);
      
      addMessage({
        type: 'ai',
        content: `✓ **Image uploaded successfully to Lighthouse IPFS!**

Your image has been stored on the decentralized network. Now I need a few more details to mint your NFT:

▸ **Please provide:**
1. **NFT Name** - What should your NFT be called?
2. **Description** - Tell me about your NFT (optional)

You can provide both in one message using any of these formats:
• "name hormaz description cool nft"
• "Name: My Art, Description: Beautiful digital artwork"  
• "call it Digital Art description Amazing piece"
• Just the name: "My Amazing NFT"`,
        uploadedImage: { url, fileName }
      });
    }
  };

  // Handle upload error
  const handleUploadError = (error: string) => {
    addMessage({
      type: 'ai',
      content: `✗ **Upload Failed**

${error}

Please try again with a different image or check your internet connection.`,
      status: 'error'
    });
  };

  // Handle NFT details after upload
  const handleNFTDetailsAfterUpload = async (userInput: string) => {
    if (!uploadedImage) return;

    try {
      setProcessing(true);
      
      // Use AI to parse NFT details from user input
      const parsedDetails = await geminiAI.parseNFTDetails(userInput);
      console.log('AI NFT Details Result:', parsedDetails);

      let name = parsedDetails.name;
      const description = parsedDetails.description;

      // Fallback: simple keyword extraction if AI parsing fails
      if (!name) {
        const lowerInput = userInput.toLowerCase();
        
        if (lowerInput.includes('confirm') || lowerInput.includes('mint') || lowerInput.includes('proceed')) {
          addMessage({
            type: 'ai',
            content: `I need at least a name for your NFT. Please tell me what to call it, like: "Name it Digital Art"`
          });
          return;
        } else if (lowerInput.includes('skip') || lowerInput === 'no') {
          addMessage({
            type: 'ai',
            content: `What would you like to name your NFT? For example: "Call it My Artwork"`
          });
          return;
        } else if (userInput.length < 50 && !userInput.includes('description')) {
          // Likely just a name
          name = userInput.trim();
        } else {
          // Ask for clarification
          addMessage({
            type: 'ai',
            content: `I need a name for your NFT. Please provide it clearly, like: "name MyNFT description cool artwork" or just "MyNFT"`
          });
          return;
        }
      }

      if (!name || name.length === 0) {
        addMessage({
          type: 'ai',
          content: `I need a name for your NFT. Please say something like: "Name it Hormaz" or "Call it Digital Art"`
        });
        return;
      }

      // Create NFT action with uploaded image
      const nftAction = {
        action: 'mint_nft' as const,
        confidence: 0.95,
        details: {
          name: name,
          description: description || `NFT created with opBNB AI Assistant`,
          imageUrl: uploadedImage.ipfsUrl || uploadedImage.url,
          attributes: []
        },
        missingFields: [],
        isComplete: true
      };

      // Generate confirmation
      const confirmationMessage = await geminiAI.generateConfirmationMessage(nftAction);
      
      addMessage({
        type: 'ai',
        content: confirmationMessage
      });

      setPendingAction({
        action: nftAction,
        messageId: Date.now().toString(),
        isWaitingForConfirmation: true
      });

      setIsWaitingForNFTDetails(false);
    } catch (error) {
      console.error('Error processing NFT details:', error);
      addMessage({
        type: 'ai',
        content: 'Error processing NFT details. Please try again.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleClearChat = () => {
    clearConversation();
  };

  return (
    <>
      {/* Chat History Panel */}
      <ChatHistoryPanel
        isOpen={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        isLoading={isLoadingHistory}
        onSelectConversation={(id) => selectConversation(id)}
        onNewConversation={() => startNewConversation()}
        onDeleteConversation={(id) => deleteConversation(id)}
      />

      {/* ── Premium Chat Header ── */}
      <div className="chat-header">
        <div className="chat-title">
          <button
            className="chat-action-btn chat-action-btn--history"
            onClick={() => setHistoryPanelOpen(true)}
            title="Chat History"
          >
            <History size={15} />
          </button>
          <div className="chat-header-avatar">
            <Bot size={16} />
            <span className="chat-header-pulse" />
          </div>
          <div className="chat-header-info">
            <h2>Chain Agent</h2>
            <span className="chat-header-status">
              <span className="chat-status-dot" />
              {isProcessing ? 'Thinking...' : 'Online'}
            </span>
          </div>
        </div>
        <div className="chat-actions">
          <button
            className="chat-action-btn"
            onClick={() => setIsContactsModalOpen(true)}
          >
            <Users size={14} />
            <span>Contacts</span>
          </button>
          <button
            className="chat-action-btn"
            onClick={() => startNewConversation()}
          >
            <Plus size={14} />
            <span>New Chat</span>
          </button>
          <button
            className="chat-action-btn chat-action-btn--danger"
            onClick={handleClearChat}
          >
            <IoTrash />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="chat-messages">
        {/* Empty State */}
        {messages.length === 0 && !isProcessing && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">
              <IoSparkles size={28} />
            </div>
            <h3 className="chat-empty-title">How can I help you today?</h3>
            <p className="chat-empty-desc">
              I can help you with blockchain operations on opBNB — send BNB, create tokens, mint NFTs, and more.
            </p>
            <div className="chat-suggestions">
              {[
                { icon: <IoSend size={14} />, label: 'Send BNB', prompt: 'Send 0.01 BNB to a wallet' },
                { icon: <IoCube size={14} />, label: 'Create Token', prompt: 'Create a new token called MyToken' },
                { icon: <IoImage size={14} />, label: 'Mint NFT', prompt: 'Mint an NFT with an image' },
                { icon: <IoWallet size={14} />, label: 'Check Balance', prompt: 'What is my wallet balance?' },
              ].map((suggestion) => (
                <button
                  key={suggestion.label}
                  className="chat-suggestion-chip"
                  onClick={() => {
                    setInputValue(suggestion.prompt);
                  }}
                >
                  <span className="chip-icon">{suggestion.icon}</span>
                  <span>{suggestion.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message List */}
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              className={`chat-bubble ${message.type} ${message.status || 'info'}`}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              layout
            >
              {/* AI Avatar */}
              {message.type === 'ai' && (
                <div className="bubble-avatar">
                  <Zap size={12} />
                </div>
              )}

              <div className="bubble-body">
                <div className="bubble-content">
                  <MessageRenderer content={message.content} />
                </div>

                <div className="bubble-meta">
                  <span className="bubble-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {message.action && (
                    <span className="bubble-action-tag">
                      <Zap size={9} />
                      {message.action.action.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {message.showUpload && (
                  <UploadButton
                    onUploadComplete={handleUploadComplete}
                    onUploadError={handleUploadError}
                    hasUploaded={message.hasUploaded || false}
                  />
                )}
                {message.uploadedImage && (
                  <ImagePreview
                    url={message.uploadedImage.url}
                    fileName={message.uploadedImage.fileName}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        {isProcessing && (
          <motion.div
            className="chat-bubble ai typing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bubble-avatar">
              <Zap size={12} />
            </div>
            <div className="bubble-body">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">Chain Agent is thinking...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Premium Input Area ── */}
      <div className="chat-input-area">
        {pendingAction?.isWaitingForConfirmation && (
          <div className="confirmation-banner">
            <Zap size={13} />
            <span>Awaiting your confirmation — reply <strong>Yes</strong> or <strong>No</strong></span>
          </div>
        )}
        <form 
          className="chat-input-form"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <div className="chat-input-row">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                pendingAction?.isWaitingForConfirmation 
                  ? "Type 'Yes' to confirm or 'No' to cancel..." 
                  : "Ask me anything about blockchain..."
              }
              className="chat-textarea"
              disabled={isProcessing}
              rows={1}
            />
            <motion.button
              type="submit"
              className="chat-send-btn"
              disabled={!inputValue.trim() || isProcessing}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
            >
              <IoArrowForward size={16} />
            </motion.button>
          </div>
        </form>
      </div>

      {/* Contacts Modal */}
      <ContactsModal 
        isOpen={isContactsModalOpen} 
        onClose={() => setIsContactsModalOpen(false)} 
      />
    </>
  );
};

export default AIChat;
