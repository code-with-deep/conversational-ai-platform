import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Cpu, GitCompare, Send, Share2, Sparkles, Database, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import api from '../lib/api';
import { getMemoryLabel, cn } from '../lib/utils';
import { useConversationStore } from '../stores/conversationStore';
import { useUIStore } from '../stores/uiStore';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import MessageBubble from '../components/chat/MessageBubble';
import type { CompareResult, MemoryType } from '../types';

const strategies: Array<{ value: MemoryType; icon: typeof Cpu }> = [
  { value: 'buffer', icon: Cpu },
  { value: 'summary', icon: Layers },
  { value: 'entity', icon: Database },
  { value: 'kg', icon: Share2 },
  { value: 'hybrid', icon: Sparkles },
];

const ComparisonPage = () => {
  const addToast = useUIStore((state) => state.addToast);
  const { conversations, fetchConversations } = useConversationStore();

  const [conversationId, setConversationId] = useState('');
  const [strategyA, setStrategyA] = useState<MemoryType>('buffer');
  const [strategyB, setStrategyB] = useState<MemoryType>('hybrid');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  useEffect(() => {
    void fetchConversations({ per_page: 100 });
  }, [fetchConversations]);

  const selectedConversationId = useMemo(() => {
    if (conversationId && conversations.some((conversation) => conversation.id === conversationId)) {
      return conversationId;
    }
    return conversations[0]?.id || '';
  }, [conversationId, conversations]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [selectedConversationId, conversations],
  );

  const handleCompare = async () => {
    if (!selectedConversationId) {
      addToast({ type: 'warning', message: 'Select a conversation to compare.' });
      return;
    }
    if (strategyA === strategyB) {
      addToast({ type: 'warning', message: 'Pick two different memory strategies.' });
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const { data } = await api.post<CompareResult>('/compare/memory', {
        conversation_id: selectedConversationId,
        strategy_a: strategyA,
        strategy_b: strategyB,
      });
      setResult(data);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || 'Comparison failed. Please try again.'
        : error instanceof Error
        ? error.message
        : 'Comparison failed. Please try again.';
      addToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <GitCompare className="w-8 h-8 text-accent" />
            Strategy <span className="gradient-text">Workbench</span>
          </h1>
          <p className="text-text-secondary font-medium">
            Replay a real conversation with two different memory engines and compare the output.
          </p>
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-8 border border-border/30 shadow-2xl space-y-8">
        <div className="space-y-3">
          <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Conversation</label>
          <select
            value={selectedConversationId}
            onChange={(event) => setConversationId(event.target.value)}
            disabled={!conversations.length}
            className="w-full h-12 bg-bg-tertiary border border-border/30 rounded-2xl px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          >
            {!conversations.length && <option value="">No conversations available</option>}
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {conversation.title}
              </option>
            ))}
          </select>
          {selectedConversation && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">{selectedConversation.message_count} messages</Badge>
              <Badge variant="outline">{getMemoryLabel(selectedConversation.memory_type)}</Badge>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Primary Engine (A)</label>
            <div className="grid grid-cols-5 gap-2">
              {strategies.map((strategy) => (
                <button
                  key={strategy.value}
                  onClick={() => setStrategyA(strategy.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all',
                    strategyA === strategy.value
                      ? 'bg-accent/10 border-accent text-accent shadow-glow'
                      : 'bg-bg-tertiary/30 border-border/20 text-text-muted hover:border-accent/30',
                  )}
                >
                  <strategy.icon className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">{strategy.value}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Challenger Engine (B)</label>
            <div className="grid grid-cols-5 gap-2">
              {strategies.map((strategy) => (
                <button
                  key={strategy.value}
                  onClick={() => setStrategyB(strategy.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all',
                    strategyB === strategy.value
                      ? 'bg-purple-600/10 border-purple-600 text-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                      : 'bg-bg-tertiary/30 border-border/20 text-text-muted hover:border-purple-600/30',
                  )}
                >
                  <strategy.icon className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">{strategy.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative pt-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border/30" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-bg-secondary px-4 text-xs font-black text-text-muted uppercase tracking-[0.3em]">Replay</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm text-text-secondary">
            {result?.user_message || 'The latest user message from the selected conversation will be replayed for both engines.'}
          </div>
          <Button
            variant="primary"
            onClick={handleCompare}
            loading={isLoading}
            disabled={!selectedConversationId}
            className="px-10 rounded-2xl shadow-glow font-black uppercase tracking-widest"
            icon={<Send className="w-4 h-4" />}
          >
            Compare
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {(isLoading || result) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-accent" />
                  </div>
                  <h3 className="font-bold text-lg">{getMemoryLabel(strategyA)}</h3>
                </div>
                {result && (
                  <Badge variant="outline" className="text-[9px] font-black">
                    {result.result_a.token_usage.total_tokens || 0} Tokens
                  </Badge>
                )}
              </div>

              <div className="glass-strong rounded-3xl min-h-[400px] border border-accent/20 overflow-hidden flex flex-col">
                {isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
                    <Cpu className="w-12 h-12 text-accent animate-pulse" />
                    <p className="text-xs font-black text-accent uppercase tracking-widest animate-pulse">Computing Inference...</p>
                  </div>
                ) : result && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <MessageBubble message={{ role: 'assistant', content: result.result_a.response }} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-lg">{getMemoryLabel(strategyB)}</h3>
                </div>
                {result && (
                  <Badge variant="outline" className="text-[9px] font-black">
                    {result.result_b.token_usage.total_tokens || 0} Tokens
                  </Badge>
                )}
              </div>

              <div className="glass-strong rounded-3xl min-h-[400px] border border-purple-600/20 overflow-hidden flex flex-col">
                {isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
                    <Cpu className="w-12 h-12 text-purple-400 animate-pulse" />
                    <p className="text-xs font-black text-purple-400 uppercase tracking-widest animate-pulse">Computing Inference...</p>
                  </div>
                ) : result && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <MessageBubble message={{ role: 'assistant', content: result.result_b.response }} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComparisonPage;
