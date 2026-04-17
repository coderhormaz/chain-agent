import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { isAuthError } from './supabaseHelpers';

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  type: 'user' | 'ai';
  content: string;
  action: Record<string, unknown> | null;
  requires_confirmation: boolean;
  status: string | null;
  created_at: string;
}

export class ConversationService {
  private static getCurrentUserId(): string {
    const authUser = useAuthStore.getState().user;
    if (!authUser) {
      throw new Error('Please sign in to access chat history');
    }
    return authUser.id;
  }

  // ── Conversations CRUD ──

  static async getConversations(): Promise<ConversationRow[]> {
    const userId = this.getCurrentUserId();

    // Only return conversations that have at least one message
    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_messages(id)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      if (isAuthError(error)) {
        await supabase.auth.refreshSession();
        const retry = await supabase
          .from('conversations')
          .select('*, conversation_messages(id)')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        if (!retry.error) {
          return (retry.data || []).filter((c: any) => c.conversation_messages?.length > 0);
        }
      }
      throw new Error(error.message || 'Failed to fetch conversations');
    }
    // Filter out empty conversations (no messages)
    return (data || []).filter((c: any) => c.conversation_messages?.length > 0);
  }

  static async createConversation(title = 'New Chat'): Promise<ConversationRow> {
    const userId = this.getCurrentUserId();

    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title })
      .select()
      .single();

    if (error) {
      if (isAuthError(error)) {
        await supabase.auth.refreshSession();
        const retry = await supabase
          .from('conversations')
          .insert({ user_id: userId, title })
          .select()
          .single();
        if (!retry.error) return retry.data;
      }
      throw new Error(error.message || 'Failed to create conversation');
    }
    return data;
  }

  static async updateConversationTitle(id: string, title: string): Promise<void> {
    const userId = this.getCurrentUserId();

    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (isAuthError(error)) {
        await supabase.auth.refreshSession();
        await supabase
          .from('conversations')
          .update({ title })
          .eq('id', id)
          .eq('user_id', userId);
        return;
      }
      throw new Error(error.message || 'Failed to update title');
    }
  }

  static async deleteConversation(id: string): Promise<void> {
    const userId = this.getCurrentUserId();

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (isAuthError(error)) {
        await supabase.auth.refreshSession();
        await supabase
          .from('conversations')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
        return;
      }
      throw new Error(error.message || 'Failed to delete conversation');
    }
  }

  static async deleteAllConversations(): Promise<void> {
    const userId = this.getCurrentUserId();

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to delete all conversations');
    }
  }

  // ── Messages CRUD ──

  static async getMessages(conversationId: string): Promise<ConversationMessageRow[]> {
    const userId = this.getCurrentUserId();

    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      if (isAuthError(error)) {
        await supabase.auth.refreshSession();
        const retry = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        if (!retry.error) return retry.data || [];
      }
      throw new Error(error.message || 'Failed to fetch messages');
    }
    return data || [];
  }

  static async addMessage(
    conversationId: string,
    message: {
      type: 'user' | 'ai';
      content: string;
      action?: Record<string, unknown> | null;
      requires_confirmation?: boolean;
      status?: string | null;
    }
  ): Promise<ConversationMessageRow> {
    const userId = this.getCurrentUserId();

    const { data, error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        type: message.type,
        content: message.content,
        action: message.action || null,
        requires_confirmation: message.requires_confirmation || false,
        status: message.status || null,
      })
      .select()
      .single();

    if (error) {
      if (isAuthError(error)) {
        await supabase.auth.refreshSession();
        const retry = await supabase
          .from('conversation_messages')
          .insert({
            conversation_id: conversationId,
            user_id: userId,
            type: message.type,
            content: message.content,
            action: message.action || null,
            requires_confirmation: message.requires_confirmation || false,
            status: message.status || null,
          })
          .select()
          .single();
        if (!retry.error) return retry.data;
      }
      throw new Error(error.message || 'Failed to save message');
    }

    // Touch the conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId);

    return data;
  }

  // ── Auto-title ──

  static generateTitle(firstUserMessage: string): string {
    const msg = firstUserMessage.trim();

    // Action-aware title detection
    const patterns: [RegExp, string][] = [
      [/mint(?:ing)?\s+(?:an?\s+)?nft/i, 'Mint NFT'],
      [/create\s+(?:a\s+)?token/i, 'Create Token'],
      [/send\s+([\d.]+)\s*(bnb|tokens?)/i, 'Send $1 $2'],
      [/transfer/i, 'Transfer'],
      [/balance/i, 'Check Balance'],
      [/certificate/i, 'Certificate'],
      [/swap/i, 'Swap'],
      [/price|market/i, 'Price Check'],
    ];

    for (const [regex, prefix] of patterns) {
      const match = msg.match(regex);
      if (match) {
        // If the prefix has capture groups, replace them
        let title = prefix;
        for (let i = 1; i < match.length; i++) {
          title = title.replace(`$${i}`, match[i]);
        }
        // Append context from the message if short enough
        const rest = msg.replace(regex, '').trim();
        const nameMatch = rest.match(/(?:called|named|name)\s+["']?([\w\s]+)["']?/i);
        if (nameMatch) {
          title += `: ${nameMatch[1].trim().substring(0, 25)}`;
        }
        return title;
      }
    }

    // Fallback: first sentence or first 45 chars, cleaned up
    let title = msg.replace(/^(hey|hi|hello|please|can you|i want to|i'd like to|help me)\s*/i, '');
    const sentenceEnd = title.search(/[.!?]/);
    if (sentenceEnd > 0 && sentenceEnd < 55) {
      title = title.substring(0, sentenceEnd + 1);
    } else if (title.length > 45) {
      // Break at last word boundary before 45 chars
      title = title.substring(0, 45).replace(/\s+\S*$/, '') + '…';
    }
    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
}
