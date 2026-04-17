import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Trash2,
  X,
  Search,
  Sparkles,
  Clock,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
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
  if (diff < 7 * dayMs) return 'This Week';
  if (diff < 30 * dayMs) return 'This Month';
  return 'Older';
}

function groupConversations(conversations: ConversationSummary[]) {
  const groups: Record<string, ConversationSummary[]> = {};
  const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];

  for (const c of conversations) {
    const group = getDateGroup(c.updatedAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(c);
  }

  return order
    .filter((g) => groups[g]?.length)
    .map((g) => ({ label: g, items: groups[g] }));
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Contextual emoji for the conversation title */
function getTitleIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('mint') || t.includes('nft')) return '🖼️';
  if (t.includes('token') || t.includes('create token')) return '🪙';
  if (t.includes('send') || t.includes('transfer')) return '💸';
  if (t.includes('balance')) return '💰';
  if (t.includes('certificate')) return '🎓';
  if (t.includes('swap')) return '🔄';
  if (t.includes('price') || t.includes('market')) return '📊';
  return '';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const groups = groupConversations(filtered);

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
            className="hp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            className="hp-panel"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* ── Header ── */}
            <div className="hp-header">
              <button className="hp-back-btn" onClick={onClose} title="Close">
                <ArrowLeft size={16} />
              </button>
              <span className="hp-header-title">History</span>
              {conversations.length > 0 && (
                <span className="hp-header-count">{conversations.length}</span>
              )}
            </div>

            {/* ── New Chat ── */}
            <div className="hp-actions">
              <button
                className="hp-new-chat-btn"
                onClick={() => {
                  onNewConversation();
                  onClose();
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>New Chat</span>
              </button>
            </div>

            {/* ── Search (only when there are enough conversations) ── */}
            {conversations.length > 3 && (
              <div className="hp-search-wrapper">
                <Search size={13} className="hp-search-icon" />
                <input
                  className="hp-search-input"
                  type="text"
                  placeholder="Search conversations…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                {searchQuery && (
                  <button
                    className="hp-search-clear"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* ── Conversation List ── */}
            <div className="hp-list">
              {isLoading ? (
                <div className="hp-state-msg">
                  <Loader2 size={18} className="hp-spinner" />
                  <span>Loading…</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="hp-state-msg hp-empty">
                  <div className="hp-empty-glow">
                    <Sparkles size={22} strokeWidth={1.5} />
                  </div>
                  <p>No conversations yet</p>
                  <span>Start chatting to see your history here</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="hp-state-msg">
                  <Search size={18} strokeWidth={1.5} />
                  <p>No results</p>
                  <span>Try a different search term</span>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.label} className="hp-group">
                    <div className="hp-group-label">{group.label}</div>
                    <div className="hp-group-items">
                      {group.items.map((conv) => {
                        const isActive = conv.id === activeConversationId;
                        const isDeleting = deletingId === conv.id;
                        const icon = getTitleIcon(conv.title);

                        return (
                          <motion.div
                            key={conv.id}
                            className={[
                              'hp-item',
                              isActive && 'hp-item--active',
                              isDeleting && 'hp-item--deleting',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => {
                              if (!isDeleting) {
                                onSelectConversation(conv.id);
                                onClose();
                              }
                            }}
                            layout
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20, height: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            {/* Icon */}
                            <div className="hp-item-icon">
                              {icon ? (
                                <span className="hp-item-emoji">{icon}</span>
                              ) : (
                                <MessageSquare size={13} />
                              )}
                            </div>

                            {/* Text */}
                            <div className="hp-item-text">
                              <span className="hp-item-title">{conv.title}</span>
                              <span className="hp-item-meta">
                                <Clock size={9} />
                                {formatTime(conv.updatedAt)}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="hp-item-actions">
                              {isDeleting ? (
                                <div className="hp-delete-confirm">
                                  <button
                                    className="hp-btn hp-btn--yes"
                                    onClick={(e) => handleDelete(e, conv.id)}
                                    title="Confirm delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                  <button
                                    className="hp-btn hp-btn--no"
                                    onClick={handleCancelDelete}
                                    title="Cancel"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="hp-btn hp-btn--delete"
                                  onClick={(e) => handleDelete(e, conv.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
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
