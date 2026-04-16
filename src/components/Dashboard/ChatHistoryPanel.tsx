import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Trash2, X, ChevronRight, Clock, Loader2 } from 'lucide-react';
import type { ConversationSummary } from '../../store/conversationStore';

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  isLoading: boolean;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

// ── Date grouping helpers ──
function getDateGroup(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now.getTime() - dayMs);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  if (diff < 7 * dayMs) return 'Previous 7 Days';
  if (diff < 30 * dayMs) return 'Previous 30 Days';
  return 'Older';
}

function groupConversations(conversations: ConversationSummary[]) {
  const groups: Record<string, ConversationSummary[]> = {};
  const order = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

  for (const c of conversations) {
    const group = getDateGroup(c.updatedAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(c);
  }

  return order.filter((g) => groups[g]?.length).map((g) => ({ label: g, items: groups[g] }));
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  isLoading,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const groups = groupConversations(conversations);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId === id) {
      onDeleteConversation(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            className="history-panel"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* Header */}
            <div className="history-panel-header">
              <div className="history-panel-title">
                <Clock size={15} />
                <span>Chat History</span>
              </div>
              <button className="history-close-btn" onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="history-new-chat-wrapper">
              <button
                className="history-new-chat-btn"
                onClick={() => {
                  onNewConversation();
                  onClose();
                }}
              >
                <Plus size={15} />
                <span>New Chat</span>
              </button>
            </div>

            {/* List */}
            <div className="history-list">
              {isLoading ? (
                <div className="history-loading">
                  <Loader2 size={20} className="history-spinner" />
                  <span>Loading history...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="history-empty">
                  <MessageSquare size={28} strokeWidth={1.2} />
                  <p>No conversations yet</p>
                  <span>Start a new chat to begin</span>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.label} className="history-group">
                    <div className="history-group-label">{group.label}</div>
                    {group.items.map((conv) => {
                      const isActive = conv.id === activeConversationId;
                      const isDeleting = deletingId === conv.id;

                      return (
                        <motion.div
                          key={conv.id}
                          className={`history-item ${isActive ? 'history-item--active' : ''} ${isDeleting ? 'history-item--deleting' : ''}`}
                          onClick={() => {
                            if (!isDeleting) {
                              onSelectConversation(conv.id);
                              onClose();
                            }
                          }}
                          layout
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.1 }}
                        >
                          <div className="history-item-content">
                            <div className="history-item-icon">
                              <MessageSquare size={13} />
                            </div>
                            <div className="history-item-text">
                              <span className="history-item-title">{conv.title}</span>
                              <span className="history-item-time">{formatTime(conv.updatedAt)}</span>
                            </div>
                          </div>

                          <div className="history-item-actions">
                            {isDeleting ? (
                              <>
                                <button
                                  className="history-item-btn history-item-btn--confirm"
                                  onClick={(e) => handleDelete(e, conv.id)}
                                  title="Confirm delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <button
                                  className="history-item-btn history-item-btn--cancel"
                                  onClick={handleCancelDelete}
                                  title="Cancel"
                                >
                                  <X size={12} />
                                </button>
                              </>
                            ) : (
                              <button
                                className="history-item-btn"
                                onClick={(e) => handleDelete(e, conv.id)}
                                title="Delete conversation"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>

                          {isActive && (
                            <div className="history-item-indicator">
                              <ChevronRight size={11} />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistoryPanel;
