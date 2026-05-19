import { useEffect, useState } from 'react';
import { Check, Search, Sparkles } from 'lucide-react';

import { cn, getDomainColor } from '../../lib/utils';
import { usePersonaStore } from '../../stores/personaStore';
import Badge from '../ui/Badge';

interface PersonaSelectorProps {
  selectedId?: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

const PersonaSelector = ({ selectedId, onSelect, className }: PersonaSelectorProps) => {
  const { personas, fetchPersonas, isLoading } = usePersonaStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    void fetchPersonas();
  }, [fetchPersonas]);

  const filtered = personas.filter((persona) =>
    persona.name.toLowerCase().includes(search.toLowerCase()) ||
    persona.domain.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search personas..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full bg-bg-tertiary border border-border/50 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {isLoading && personas.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 glass rounded-2xl animate-pulse" />
          ))
        ) : filtered.map((persona) => (
          <button
            key={persona.id}
            onClick={() => onSelect(persona.id)}
            className={cn(
              'flex flex-col items-start p-4 rounded-2xl border transition-all duration-300 text-left group relative overflow-hidden',
              selectedId === persona.id
                ? 'bg-accent-subtle border-accent/50 shadow-lg'
                : 'bg-bg-tertiary/30 border-border/50 hover:bg-bg-tertiary/50 hover:border-accent/30',
            )}
          >
            {selectedId === persona.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-accent text-white rounded-full flex-center shadow-lg animate-fade-in">
                <Check className="w-3 h-3" />
              </div>
            )}

            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex-center text-white font-bold shadow-md"
                style={{ backgroundColor: getDomainColor(persona.domain) }}
              >
                {persona.avatar_url ? (
                  <img src={persona.avatar_url} alt={persona.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  persona.name[0].toUpperCase()
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-text-primary group-hover:text-accent transition-colors">
                  {persona.name}
                </h4>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-auto">
                  {persona.domain}
                </Badge>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {persona.personality}
            </p>

            {persona.is_builtin && (
              <div className="mt-3 flex items-center gap-1 text-[9px] font-black text-accent uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                Official
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PersonaSelector;
