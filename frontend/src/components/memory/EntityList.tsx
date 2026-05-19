import { useState } from 'react';
import { Search, User, Building2, Cpu, Calendar, Target, HelpCircle, Layers } from 'lucide-react';
import { useMemoryStore } from '../../stores/memoryStore';
import { getEntityTypeColor } from '../../lib/utils';
import Badge from '../ui/Badge';
import type { EntityType } from '../../types';
import type { ComponentType, SVGProps } from 'react';

const typeIcons: Record<EntityType, ComponentType<SVGProps<SVGSVGElement>>> = {
  person: User,
  organization: Building2,
  project: Target,
  technology: Cpu,
  date: Calendar,
  concept: Layers,
  other: HelpCircle,
};

const EntityList = () => {
  const { entities } = useMemoryStore();
  const [search, setSearch] = useState('');

  const filtered = entities.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tracked entities..."
          className="w-full bg-bg-tertiary border border-border/30 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all"
        />
      </div>

      {/* Entity Count */}
      <div className="flex items-center justify-between px-1">
         <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
           {filtered.length} Entities Found
         </span>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-3">
             <div className="w-12 h-12 bg-bg-tertiary rounded-2xl flex items-center justify-center mx-auto opacity-30">
                <Search className="w-6 h-6" />
             </div>
             <p className="text-sm text-text-muted">No entities tracked yet in this context.</p>
          </div>
        ) : (
          filtered.map((entity) => {
            const Icon = typeIcons[entity.entity_type] || HelpCircle;
            const color = getEntityTypeColor(entity.entity_type);

            return (
              <div 
                key={entity.id}
                className="group p-4 rounded-2xl bg-bg-tertiary/30 border border-border/20 hover:border-accent/30 hover:bg-bg-tertiary/50 transition-all cursor-default"
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-lg"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-text-primary truncate group-hover:text-accent transition-colors">
                        {entity.name}
                      </h4>
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 opacity-60">
                        {entity.mention_count}x
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {entity.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                       <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter py-0 px-1.5 h-auto">
                          {entity.entity_type}
                       </Badge>
                       {entity.is_global && (
                         <Badge variant="primary" className="text-[9px] font-black uppercase tracking-tighter py-0 px-1.5 h-auto">
                           Global
                         </Badge>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EntityList;
