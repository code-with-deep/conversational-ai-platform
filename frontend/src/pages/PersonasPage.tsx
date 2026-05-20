import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Edit2, Plus, Search, Settings2, Sparkles, Trash2, Users, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { getDomainColor } from '../lib/utils';
import { usePersonaStore } from '../stores/personaStore';
import { useUIStore } from '../stores/uiStore';
import type { DomainType, MemoryType, Persona } from '../types';

type PersonaFormState = {
  name: string;
  personality: string;
  system_prompt: string;
  domain: DomainType;
  default_memory: MemoryType;
  temperature: number;
};

const defaultFormState: PersonaFormState = {
  name: '',
  personality: '',
  system_prompt: '',
  domain: 'general',
  default_memory: 'hybrid',
  temperature: 0.7,
};

const PersonasPage = () => {
  const { personas, fetchPersonas, createPersona, updatePersona, deletePersona } = usePersonaStore();
  const addToast = useUIStore((state) => state.addToast);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [formData, setFormData] = useState<PersonaFormState>(defaultFormState);

  useEffect(() => {
    void fetchPersonas();
  }, [fetchPersonas]);

  const filtered = useMemo(
    () =>
      personas.filter((persona) =>
        persona.name.toLowerCase().includes(search.toLowerCase()) ||
        persona.personality.toLowerCase().includes(search.toLowerCase()),
      ),
    [personas, search],
  );

  const openCreateModal = () => {
    setEditingPersona(null);
    setFormData(defaultFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (persona: Persona) => {
    setEditingPersona(persona);
    setFormData({
      name: persona.name,
      personality: persona.personality,
      system_prompt: persona.system_prompt,
      domain: persona.domain,
      default_memory: persona.default_memory,
      temperature: persona.temperature,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingPersona) {
        await updatePersona(editingPersona.id, formData);
        addToast({ type: 'success', message: `Persona "${formData.name}" updated.` });
      } else {
        await createPersona(formData);
        addToast({ type: 'success', message: `Persona "${formData.name}" created.` });
      }
      setIsModalOpen(false);
      setEditingPersona(null);
      setFormData(defaultFormState);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || 'Unable to save persona.'
        : error instanceof Error
        ? error.message
        : 'Unable to save persona.';
      addToast({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (persona: Persona) => {
    if (!window.confirm(`Delete "${persona.name}" permanently?`)) {
      return;
    }

    try {
      await deletePersona(persona.id);
      addToast({ type: 'success', message: 'Persona deleted.' });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || 'Failed to delete persona.'
        : error instanceof Error
        ? error.message
        : 'Failed to delete persona.';
      addToast({ type: 'error', message });
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-4">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">AI Personas</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight">Personas</h1>
          <p className="text-text-secondary text-lg font-medium max-w-xl leading-relaxed">
            Create, refine, and deploy specialized AI collaborators with tailored memory strategies.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="rounded-2xl px-10 h-14 font-black text-xs uppercase tracking-widest shadow-glow btn-glow group transition-all"
          onClick={openCreateModal}
          icon={<Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />}
        >
          Create Persona
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-bg-secondary/30 p-4 rounded-[2rem] border border-border/50 backdrop-blur-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search personas..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-bg-primary/50 border border-border/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all shadow-panel"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-tertiary/50 border border-border/50">
            <Activity className="w-3.5 h-3.5 text-success" />
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
              {filtered.length} Active Agents
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <AnimatePresence>
          {filtered.map((persona, index) => (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="card-premium flex flex-col group relative overflow-hidden"
            >
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-opacity group-hover:opacity-40"
                style={{ backgroundColor: getDomainColor(persona.domain) }}
              />

              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="relative">
                  <div
                    className="absolute inset-0 blur-lg rounded-2xl opacity-40 group-hover:opacity-70 transition-opacity"
                    style={{ backgroundColor: getDomainColor(persona.domain) }}
                  />
                  <div
                    className="relative w-16 h-16 rounded-2xl flex-center text-white text-2xl font-black shadow-2xl border border-white/10 group-hover:scale-110 transition-transform duration-500"
                    style={{ backgroundColor: getDomainColor(persona.domain) }}
                  >
                    {persona.avatar_url ? (
                      <img src={persona.avatar_url} alt={persona.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      persona.name[0].toUpperCase()
                    )}
                  </div>
                </div>

                {!persona.is_builtin ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(persona)}
                      className="h-9 w-9 flex-center rounded-xl text-text-muted hover:text-accent hover:bg-accent/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(persona)}
                      className="h-9 w-9 flex-center text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent/10 border border-accent/20">
                    <Sparkles className="w-3 h-3 text-accent" />
                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">Built-in</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-5 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-text-primary tracking-tight group-hover:text-accent transition-colors">
                    {persona.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{persona.domain}</span>
                    <div className="w-1 h-1 bg-border rounded-full" />
                    <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">{persona.usage_count} Deployments</span>
                  </div>
                </div>

                <div className="bg-bg-tertiary/30 rounded-2xl p-4 border border-border/50 text-sm text-text-secondary leading-relaxed font-medium min-h-[110px]">
                  {persona.personality}
                </div>

                <div className="pt-6 border-t border-border/20 flex items-center gap-6">
                  <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
                    <Zap className="w-4 h-4 text-yellow-400/70" />
                    {persona.default_memory}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
                    <Settings2 className="w-4 h-4 text-accent/70" />
                    Temperature {persona.temperature}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-2">
                <Link to={`/workspace?persona=${persona.id}`} className="w-full">
                  <Button variant="secondary" className="w-full h-12 rounded-xl font-bold border-border/50 group-hover:border-accent/50 transition-all">
                    Deploy
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          onClick={openCreateModal}
          className="group relative flex flex-col items-center justify-center py-16 px-8 rounded-3xl border-2 border-dashed border-border/30 hover:border-accent/40 transition-all hover:bg-accent/[0.02]"
        >
          <div className="w-16 h-16 rounded-[2rem] bg-bg-tertiary flex-center mb-6 group-hover:scale-110 group-hover:shadow-glow transition-all">
            <Plus className="w-8 h-8 text-text-muted group-hover:text-accent" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-text-primary group-hover:text-accent transition-colors">Create New</h3>
            <p className="text-sm text-text-secondary font-medium">Define a custom persona with specific expertise.</p>
          </div>
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPersona ? 'Edit Persona' : 'Create New Persona'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-8 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-text-muted px-1">Name</label>
              <input
                placeholder="e.g. Quantum Strategist"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                required
                className="w-full h-12 bg-bg-tertiary border border-border/50 rounded-xl px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-text-muted px-1">Domain</label>
              <select
                className="w-full h-12 bg-bg-tertiary border border-border/50 rounded-xl px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all appearance-none"
                value={formData.domain}
                onChange={(event) => setFormData({ ...formData, domain: event.target.value as DomainType })}
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="creative">Creative</option>
                <option value="business">Business</option>
                <option value="education">Education</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-text-muted px-1">
              Personality & Traits
            </label>
            <textarea
              className="w-full bg-bg-tertiary border border-border/50 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all min-h-[100px] resize-none"
              placeholder="Describe the persona's traits and approach."
              value={formData.personality}
              onChange={(event) => setFormData({ ...formData, personality: event.target.value })}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-text-muted px-1">
              Core Directives
            </label>
            <textarea
              className="w-full bg-bg-tertiary border border-border/50 rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all min-h-[150px] custom-scrollbar"
              placeholder="You are a precise, helpful assistant for..."
              value={formData.system_prompt}
              onChange={(event) => setFormData({ ...formData, system_prompt: event.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-text-muted px-1">Default Memory</label>
              <select
                className="w-full h-12 bg-bg-tertiary border border-border/50 rounded-xl px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all appearance-none"
                value={formData.default_memory}
                onChange={(event) => setFormData({ ...formData, default_memory: event.target.value as MemoryType })}
              >
                <option value="buffer">Standard Buffer</option>
                <option value="summary">Recursive Summary</option>
                <option value="entity">Entity Awareness</option>
                <option value="kg">Knowledge Graph</option>
                <option value="hybrid">Neural Hybrid</option>
              </select>
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-text-muted px-1 flex justify-between">
                <span>Temperature</span>
                <span className="text-accent font-black tracking-tighter">{formData.temperature}</span>
              </label>
              <div className="px-1">
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(event) => setFormData({ ...formData, temperature: Number(event.target.value) })}
                  className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between mt-2 text-[8px] text-text-muted uppercase font-black tracking-widest opacity-50">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow btn-glow" loading={isSubmitting}>
              {editingPersona ? 'Save Changes' : 'Create Persona'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PersonasPage;
