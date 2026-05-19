import { FileText, History, Info, Sparkles } from 'lucide-react';
import { useMemoryStore } from '../../stores/memoryStore';
import { formatDate } from '../../lib/utils';
import Badge from '../ui/Badge';

const SummaryView = () => {
  const { summary } = useMemoryStore();

  if (!summary) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-bg-tertiary rounded-2xl flex items-center justify-center mx-auto opacity-30">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-1 px-6">
          <h4 className="font-bold text-text-primary">No summary available</h4>
          <p className="text-xs text-text-secondary">
            Summaries are generated automatically once enough messages have been exchanged.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="glass p-6 rounded-3xl border border-accent/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <Sparkles className="w-20 h-20 text-accent" />
        </div>
        
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="primary" className="text-[9px] font-black uppercase tracking-widest px-2">
              Context Version {summary.version}
            </Badge>
            <span className="text-[10px] font-bold text-text-muted uppercase">
              {formatDate(summary.created_at)}
            </span>
          </div>

          <div className="prose prose-invert prose-sm max-w-none">
             <p className="text-text-primary/90 leading-relaxed italic">
               "{summary.summary_text}"
             </p>
          </div>

          <div className="pt-4 flex items-center gap-6 border-t border-border/20">
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Coverage</span>
                <span className="text-xs font-bold text-text-primary">{summary.messages_covered} Messages</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Weight</span>
                <span className="text-xs font-bold text-text-primary">{summary.token_count} Tokens</span>
             </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-2xl bg-bg-tertiary/20 border border-border/20 flex gap-3">
         <Info className="w-4 h-4 text-accent flex-shrink-0" />
         <p className="text-[11px] text-text-secondary leading-normal">
           This summary is injected into every prompt to maintain long-term coherence without exceeding the token limit.
         </p>
      </div>

      {/* History Timeline */}
      <div className="space-y-4">
         <h4 className="text-xs font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-text-muted" />
            Revision History
         </h4>
         <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border/30">
            <div className="relative">
               <div className="absolute left-[-19px] top-1.5 w-2 h-2 rounded-full bg-accent ring-4 ring-accent-subtle" />
               <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-text-primary">Current Optimized State</span>
                  <span className="text-[10px] text-text-muted">{formatDate(summary.created_at)}</span>
               </div>
            </div>
            <div className="relative opacity-50">
               <div className="absolute left-[-19px] top-1.5 w-2 h-2 rounded-full bg-border" />
               <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-text-secondary">Previous State</span>
                  <span className="text-[10px] text-text-muted">Overwritten during context refresh</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SummaryView;
