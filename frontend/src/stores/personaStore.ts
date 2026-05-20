import { create } from 'zustand';
import api from '../lib/api';
import type { Persona } from '../types';

interface PersonaState {
  personas: Persona[];
  isLoading: boolean;

  fetchPersonas: () => Promise<void>;
  createPersona: (data: Partial<Persona>) => Promise<Persona>;
  updatePersona: (id: string, data: Partial<Persona>) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
}

export const usePersonaStore = create<PersonaState>((set) => ({
  personas: [],
  isLoading: false,

  fetchPersonas: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Persona[]>('/personas/');
      set({ personas: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createPersona: async (createData) => {
    const { data } = await api.post<Persona>('/personas/', createData);
    set((s) => ({ personas: [...s.personas, data] }));
    return data;
  },

  updatePersona: async (id, updateData) => {
    const { data } = await api.put<Persona>(`/personas/${id}`, updateData);
    set((s) => ({ personas: s.personas.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
  },

  deletePersona: async (id) => {
    await api.delete(`/personas/${id}`);
    set((s) => ({ personas: s.personas.filter((p) => p.id !== id) }));
  },
}));
