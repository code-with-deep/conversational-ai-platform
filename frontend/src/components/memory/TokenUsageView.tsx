import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Zap, AlertTriangle, Info } from 'lucide-react';
import { useMemoryStore } from '../../stores/memoryStore';
import { cn } from '../../lib/utils';

const TokenUsageView = () => {
  const { tokenUsage } = useMemoryStore();

  if (!tokenUsage) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Zap className="w-12 h-12 text-text-muted opacity-20" />
        <p className="text-sm text-text-muted">Token metrics will appear after the first interaction.</p>
      </div>
    );
  }

  const data = [
    { name: 'System', value: tokenUsage.system_tokens, color: '#6366f1' },
    { name: 'Memory', value: tokenUsage.memory_tokens, color: '#10b981' },
    { name: 'Recent', value: tokenUsage.recent_tokens, color: '#3b82f6' },
    { name: 'Response', value: tokenUsage.response_tokens, color: '#f59e0b' },
  ];

  const totalUsed = tokenUsage.total_tokens;
  const budget = tokenUsage.budget_total;
  const usagePercent = Math.min(Math.round((totalUsed / budget) * 100), 100);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Visual Chart */}
      <div className="h-48 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ background: '#111827', border: '1px solid #2a3454', borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ color: '#f1f5f9' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
           <span className="text-xl font-black text-text-primary">{usagePercent}%</span>
           <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Utilized</span>
        </div>
      </div>

      {/* Consumption Details */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-widest px-1">Consumption Profile</h4>
        <div className="grid grid-cols-2 gap-3">
           {data.map((item) => (
             <div key={item.name} className="p-3 rounded-2xl bg-bg-tertiary/20 border border-border/10 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                   <span className="text-[10px] font-bold text-text-secondary uppercase">{item.name}</span>
                </div>
                <span className="text-sm font-black text-text-primary">{item.value.toLocaleString()}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Budget Progress */}
      <div className="space-y-3">
         <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-text-primary">Context Window</span>
            <span className="text-xs font-mono text-text-secondary">{totalUsed.toLocaleString()} / {budget.toLocaleString()}</span>
         </div>
         <div className="h-2 w-full bg-bg-tertiary rounded-full overflow-hidden border border-border/10 p-[1px]">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-1000',
                usagePercent > 90 ? 'bg-danger' : usagePercent > 70 ? 'bg-warning' : 'bg-accent'
              )}
              style={{ width: `${usagePercent}%` }}
            />
         </div>
      </div>

      {/* Warnings */}
      {usagePercent > 85 && (
        <div className="p-4 rounded-2xl bg-danger-subtle border border-danger/20 flex gap-3 animate-pulse">
           <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
           <p className="text-[11px] text-danger font-bold leading-normal">
             Critical: Context window near limit. Automated summarization will be triggered on the next exchange.
           </p>
        </div>
      )}

      {!usagePercent && (
        <div className="p-4 rounded-2xl bg-bg-tertiary/20 border border-border/20 flex gap-3">
           <Info className="w-4 h-4 text-accent flex-shrink-0" />
           <p className="text-[11px] text-text-secondary leading-normal">
             Your context is managed dynamically. AetherMind balances past memory and recent tokens to ensure perfect coherence.
           </p>
        </div>
      )}
    </div>
  );
};

export default TokenUsageView;
