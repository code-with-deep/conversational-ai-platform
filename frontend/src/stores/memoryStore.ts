import { create } from 'zustand';
import api from '../lib/api';
import type { MemoryState, Entity, KGTriple, Summary, TokenUsage } from '../types';

interface MemoryStoreState {
  memoryState: MemoryState | null;
  entities: Entity[];
  triples: KGTriple[];
  summary: Summary | null;
  tokenUsage: TokenUsage | null;
  isLoading: boolean;

  fetchMemoryState: (conversationId: string) => Promise<void>;
  fetchEntities: (conversationId: string) => Promise<void>;
  fetchTriples: (conversationId: string) => Promise<void>;
  fetchSummary: (conversationId: string) => Promise<void>;
  fetchTokenUsage: (conversationId: string) => Promise<void>;
  refreshAll: (conversationId: string) => Promise<void>;
  clear: () => void;
}

export const useMemoryStore = create<MemoryStoreState>((set) => ({
  memoryState: null,
  entities: [],
  triples: [],
  summary: null,
  tokenUsage: null,
  isLoading: false,

  fetchMemoryState: async (conversationId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<MemoryState>(`/conversations/${conversationId}/memory`);
      set({
        memoryState: data,
        entities: data.entities,
        triples: data.triples,
        summary: data.summary,
        tokenUsage: data.token_usage,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchEntities: async (conversationId) => {
    const { data } = await api.get<Entity[]>(`/conversations/${conversationId}/entities`);
    set({ entities: data });
  },

  fetchTriples: async (conversationId) => {
    const { data } = await api.get<KGTriple[]>(`/conversations/${conversationId}/graph`);
    set({ triples: data });
  },

  fetchSummary: async (conversationId) => {
    const { data } = await api.get<Summary | null>(`/conversations/${conversationId}/summary`);
    set({ summary: data });
  },

  fetchTokenUsage: async (conversationId) => {
    const { data } = await api.get<TokenUsage | null>(`/conversations/${conversationId}/tokens`);
    set({ tokenUsage: data });
  },

  refreshAll: async (conversationId) => {
    try {
      const [entities, triples, summary, tokens] = await Promise.all([
        api.get<Entity[]>(`/conversations/${conversationId}/entities`),
        api.get<KGTriple[]>(`/conversations/${conversationId}/graph`),
        api.get<Summary | null>(`/conversations/${conversationId}/summary`),
        api.get<TokenUsage | null>(`/conversations/${conversationId}/tokens`),
      ]);
      set({
        entities: entities.data,
        triples: triples.data,
        summary: summary.data,
        tokenUsage: tokens.data,
      });
    } catch { /* silently fail on refresh */ }
  },

  clear: () => set({ memoryState: null, entities: [], triples: [], summary: null, tokenUsage: null }),
}));
