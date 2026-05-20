import { useEffect, useState } from 'react';
import { Database, FileText, RefreshCw, Share2, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '../../lib/utils';
import { useMemoryStore } from '../../stores/memoryStore';
import Button from '../ui/Button';
import EntityList from './EntityList';
import KnowledgeGraph from './KnowledgeGraph';
import SummaryView from './SummaryView';
import TokenUsageView from './TokenUsageView';

interface MemoryInspectorProps {
  conversationId?: string | null;
}

const MemoryInspector = ({ conversationId }: MemoryInspectorProps) => {
  const [activeTab, setActiveTab] = useState<'entities' | 'graph' | 'summary' | 'tokens'>('entities');
  const { fetchMemoryState, isLoading, refreshAll } = useMemoryStore();

  useEffect(() => {
    if (conversationId) {
      void fetchMemoryState(conversationId);
    }
  }, [conversationId, fetchMemoryState]);

  const tabs = [
    { id: 'entities', label: 'Entities', icon: Database },
    { id: 'graph', label: 'Graph', icon: Share2 },
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'tokens', label: 'Tokens', icon: Zap },
  ] as const;

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-center px-6 text-text-secondary">
        Select a conversation to inspect its memory state.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col glass-strong rounded-3xl border border-border/50 overflow-hidden shadow-2xl">
      <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between bg-bg-secondary/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex-center">
            <Share2 className="w-4 h-4 text-accent" />
          </div>
          <h3 className="font-bold text-sm text-text-primary uppercase tracking-widest">Memory Engine</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshAll(conversationId)}
          className={cn('p-1.5 h-auto text-text-tertiary', isLoading && 'animate-spin')}
          icon={<RefreshCw className="w-4 h-4" />}
        />
      </div>

      <div className="flex p-1.5 bg-bg-tertiary/20 border-b border-border/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all duration-200',
              activeTab === tab.id
                ? 'bg-bg-elevated text-text-primary shadow-lg border border-border/30'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            <tab.icon className={cn('w-3.5 h-3.5', activeTab === tab.id ? 'text-accent' : 'text-text-muted')} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-y-auto custom-scrollbar p-6"
          >
            {activeTab === 'entities' && <EntityList />}
            {activeTab === 'graph' && <KnowledgeGraph />}
            {activeTab === 'summary' && <SummaryView />}
            {activeTab === 'tokens' && <TokenUsageView />}
          </motion.div>
        </AnimatePresence>

        {isLoading && (
          <div className="absolute inset-0 bg-bg-primary/40 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-accent animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Syncing Neural State</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-border/30 bg-bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-bold text-text-muted uppercase">Connected</span>
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">v1.4.0</span>
      </div>
    </div>
  );
};

export default MemoryInspector;
