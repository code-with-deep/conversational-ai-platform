import { create } from 'zustand';
import api from '../lib/api';
import type { Conversation, ConversationDetail, Message, PaginatedResponse } from '../types';

interface ConversationState {
  conversations: Conversation[];
  activeConversation: ConversationDetail | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  pagination: { page: number; pages: number; total: number };

  fetchConversations: (params?: { search?: string; pinned?: boolean; archived?: boolean; page?: number; per_page?: number }) => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  createConversation: (data: { title?: string; persona_id?: string; memory_type?: string }) => Promise<Conversation>;
  updateConversation: (id: string, data: Partial<Conversation>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  addMessage: (msg: Message) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (token: string) => void;
  clearActive: () => void;
}

export const useConversationStore = create<ConversationState>()((set) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  pagination: { page: 1, pages: 0, total: 0 },

  fetchConversations: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<PaginatedResponse<Conversation>>('/conversations/', { params });
      set({
        conversations: data.data,
        pagination: { page: data.meta.page, pages: data.meta.pages, total: data.meta.total },
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchConversation: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<ConversationDetail>(`/conversations/${id}`);
      const messages = (data.messages || []).map((m: Message) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        token_count: m.token_count || 0,
        created_at: m.created_at || new Date().toISOString(),
      }));
      set({ activeConversation: data, messages, isLoading: false });
    } catch {
      set({ activeConversation: null, messages: [], isLoading: false });
    }
  },

  createConversation: async (createData) => {
    const { data } = await api.post<Conversation>('/conversations/', createData);
    set((s) => ({ conversations: [data, ...s.conversations] }));
    return data;
  },

  updateConversation: async (id, updateData) => {
    const { data } = await api.put<Conversation>(`/conversations/${id}`, updateData);
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, ...data } : c)),
      activeConversation: s.activeConversation?.id === id ? { ...s.activeConversation, ...data } : s.activeConversation,
    }));
  },

  deleteConversation: async (id) => {
    await api.delete(`/conversations/${id}`);
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversation: s.activeConversation?.id === id ? null : s.activeConversation,
      messages: s.activeConversation?.id === id ? [] : s.messages,
    }));
  },

  addMessage: (msg) => {
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (token) => set((s) => ({ streamingContent: s.streamingContent + token })),
  clearActive: () => set({ activeConversation: null, messages: [], streamingContent: '' }),
}));
