import { useEffect, useState } from 'react';
import { Activity, BrainCircuit, ChevronDown, MessageSquare, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import ChatWindow from '../components/chat/ChatWindow';
import PersonaSelector from '../components/chat/PersonaSelector';
import MemoryInspector from '../components/memory/MemoryInspector';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { cn } from '../lib/utils';
import { useConversationStore } from '../stores/conversationStore';
import { usePersonaStore } from '../stores/personaStore';
import { useUIStore } from '../stores/uiStore';

const WorkspacePage = () => {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('id');
  const personaId = searchParams.get('persona');
  const navigate = useNavigate();

  const {
    fetchConversation,
    activeConversation,
    clearActive,
    updateConversation,
    createConversation,
  } = useConversationStore();
  const { memoryPanelOpen, setMemoryPanelOpen } = useUIStore();
  const { personas, fetchPersonas } = usePersonaStore();
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [isCreatingFromPersona, setIsCreatingFromPersona] = useState(false);

  useEffect(() => {
    void fetchPersonas();
  }, [fetchPersonas]);

  useEffect(() => {
    if (conversationId) {
      void fetchConversation(conversationId);
      return;
    }

    clearActive();
  }, [clearActive, conversationId, fetchConversation]);

  useEffect(() => {
    if (!conversationId || !personaId || isCreatingFromPersona) {
      return;
    }

    const persona = personas.find((item) => item.id === personaId);
    if (!persona) {
      return;
    }

    const createFromPersona = async () => {
      setIsCreatingFromPersona(true);
      try {
        const conversation = await createConversation({
          title: `${persona.name} Session`,
          persona_id: persona.id,
          memory_type: persona.default_memory,
        });
        navigate(`/workspace?id=${conversation.id}`, { replace: true });
      } finally {
        setIsCreatingFromPersona(false);
      }
    };

    void createFromPersona();
  }, [conversationId, createConversation, isCreatingFromPersona, navigate, personaId, personas]);

  const activePersona = personas.find((persona) => persona.id === activeConversation?.persona_id);

  const handlePersonaChange = async (nextPersonaId: string) => {
    if (!activeConversation) {
      return;
    }

    await updateConversation(activeConversation.id, { persona_id: nextPersonaId });
    await fetchConversation(activeConversation.id);
    setPersonaModalOpen(false);
  };

  if (!conversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-accent blur-3xl opacity-20 animate-pulse" />
          <div className="relative w-24 h-24 bg-bg-secondary rounded-[2rem] flex-center border border-border shadow-2xl rotate-3">
            <MessageSquare className="w-12 h-12 text-accent" />
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-black tracking-tight">Ready to evolve?</h2>
          <p className="text-text-secondary text-lg font-medium leading-relaxed">
            Select a conversation from the sidebar or start a new thread to begin building your memory graph.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="mt-10 rounded-2xl px-10 py-6 text-lg font-bold shadow-glow btn-glow group transition-all"
          onClick={async () => {
            try {
              const conversation = await createConversation({ title: 'New Conversation' });
              navigate(`/workspace?id=${conversation.id}`);
            } catch {
              navigate('/workspace');
            }
          }}
          icon={<Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />}
        >
          New Conversation
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-bg-primary/40 backdrop-blur-sm rounded-3xl border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-bg-secondary/30">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setPersonaModalOpen(true)}
              className="group relative w-12 h-12 flex-shrink-0"
            >
              <div className="absolute inset-0 bg-accent/20 blur-lg rounded-full group-hover:bg-accent/40 transition-all" />
              <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex-center text-white font-black text-xl shadow-lg group-hover:scale-105 transition-transform">
                {activePersona?.name[0].toUpperCase() || 'A'}
              </div>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black truncate tracking-tight">
                  {activeConversation?.title || 'Loading...'}
                </h1>
                <button
                  onClick={() => setPersonaModalOpen(true)}
                  className="p-1 hover:bg-bg-elevated rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-success" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-success">
                    Live Session
                  </span>
                </div>
                <span className="w-1 h-1 bg-border rounded-full" />
                <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                  {activeConversation?.message_count || 0} Messages
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMemoryPanelOpen(!memoryPanelOpen)}
            className={cn(
              'rounded-xl border-border/50 transition-all font-bold',
              memoryPanelOpen && 'bg-accent/10 border-accent/30 text-accent ring-1 ring-accent/20',
            )}
            icon={<BrainCircuit className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Inspect Memory</span>
          </Button>
        </div>

        <div className="flex-1 min-h-0 relative">
          <ChatWindow />
        </div>
      </div>

      {memoryPanelOpen && (
        <div
          className={cn(
            'fixed inset-y-0 right-0 z-40 w-full md:w-[450px] lg:relative lg:inset-auto lg:z-0 lg:flex-shrink-0 animate-fade-in lg:animate-none',
            'lg:w-[400px] xl:w-[500px]',
          )}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMemoryPanelOpen(false)}
          />
          <div className="relative h-full bg-bg-secondary lg:bg-transparent border-l border-border lg:border-none shadow-2xl lg:shadow-none overflow-hidden flex flex-col">
            <div className="lg:hidden p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold">Memory Inspector</h3>
              <button onClick={() => setMemoryPanelOpen(false)} className="p-2 hover:bg-bg-hover rounded-lg">
                <ChevronDown className="rotate-90 w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <MemoryInspector conversationId={activeConversation?.id} />
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={personaModalOpen}
        onClose={() => setPersonaModalOpen(false)}
        title="Persona Settings"
        size="md"
      >
        <div className="space-y-6 p-2">
          <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
            <p className="text-sm text-text-secondary leading-relaxed font-medium">
              Switching personas updates the tone, expertise, and default context strategy for this conversation.
            </p>
          </div>
          <PersonaSelector
            selectedId={activeConversation?.persona_id}
            onSelect={handlePersonaChange}
          />
        </div>
      </Modal>
    </div>
  );
};

export default WorkspacePage;
