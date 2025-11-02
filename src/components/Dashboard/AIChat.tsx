import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IoFlash, IoTrash, IoArrowForward } from 'react-icons/io5';
import { Users } from 'lucide-react';
import { useConversationStore } from '../../store/conversationStore';
import { geminiAI } from '../../services/geminiAI';
import { UploadButton, ImagePreview } from '../UploadButton';
import MessageRenderer from '../MessageRenderer';
import { ContactsModal } from './ContactsModal';

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
    clearConversation
  } = useConversationStore();
  
  const [inputValue, setInputValue] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{url: string, fileName: string} | null>(null);
  const [isWaitingForNFTDetails, setIsWaitingForNFTDetails] = useState(false);
  const [pendingNFTDetails, setPendingNFTDetails] = useState<{name?: string, description?: string} | null>(null);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        await confirmAction(); // This now handles the blockchain execution
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
  const handleUploadComplete = async (url: string, fileName: string) => {
    setUploadedImage({ url, fileName });
    
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
          imageUrl: url,
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
      let description = parsedDetails.description;

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
          imageUrl: uploadedImage.url,
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
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon"><IoFlash /></span>
          <h2>opBNB AI Assistant</h2>
        </div>
        <div className="chat-actions">
          <motion.button
            className="contacts-btn px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium shadow-lg shadow-green-500/30 flex items-center gap-2 transition-all text-sm"
            onClick={() => setIsContactsModalOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Users size={16} /> Contacts
          </motion.button>
          <motion.button
            className="clear-chat-btn"
            onClick={handleClearChat}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <IoTrash /> Clear Chat
          </motion.button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            className={`message ${message.type} ${message.status || 'info'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="message-content">
              <MessageRenderer content={message.content} />
            </div>
            <div className="message-time">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            {message.action && (
              <div className="message-action-badge">
                Action: {message.action.action}
              </div>
            )}
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
          </motion.div>
        ))}
        
        {isProcessing && (
          <motion.div
            className="message ai typing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="typing-text">Gemini AI is thinking...</div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="modern-chat-input-wrapper">
        {pendingAction?.isWaitingForConfirmation && (
          <div className="confirmation-banner">
            <span>⏳ Waiting for your confirmation (Yes/No)</span>
          </div>
        )}
        <form 
          className="modern-chat-form"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <div className="modern-input-container">
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
                  : "Type your message here..."
              }
              className="modern-chat-textarea"
              disabled={isProcessing}
              rows={1}
            />
            <motion.button
              type="submit"
              className="modern-send-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Send Message
              <IoArrowForward className="modern-send-icon" />
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
