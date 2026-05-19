import { useEffect, useState } from 'react';
import { 
  History, 
  Search, 
  MessageSquare, 
  Calendar, 
  Trash2, 
  Pin, 
  Archive,
  ArrowUpRight,
  MoreVertical,
  FileJson
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '../stores/conversationStore';
import { useUIStore } from '../stores/uiStore';
import { cn, formatDate, getMemoryLabel } from '../lib/utils';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/api';

const HistoryPage = () => {
  const { conversations, fetchConversations, deleteConversation, updateConversation, pagination } = useConversationStore();
  const addToast = useUIStore((state) => state.addToast);
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<{ pinned?: boolean; archived?: boolean }>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchConversations({ search, ...filter, page });
  }, [fetchConversations, search, filter, page]);

  const handleExport = async (id: string, title: string) => {
    try {
      const { data } = await api.get(`/conversations/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_export.json`;
      a.click();
      addToast({ type: 'success', message: 'Conversation exported.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to export conversation.' });
    }
  };

  const handleTogglePin = async (id: string, current: boolean) => {
    await updateConversation(id, { is_pinned: !current });
    addToast({ type: 'success', message: current ? 'Pinned removed.' : 'Conversation pinned.' });
  };

  const handleToggleArchive = async (id: string, current: boolean) => {
    await updateConversation(id, { is_archived: !current });
    addToast({ type: 'success', message: current ? 'Restored from archive.' : 'Conversation archived.' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-accent" />
            Neural <span className="gradient-text">History</span>
          </h1>
          <p className="text-text-secondary font-medium">
             Search, filter, and manage all your conversations.
          </p>
        </div>
        <div className="flex gap-3">
           <Link to="/workspace">
              <Button variant="primary" className="rounded-xl shadow-glow">New Chat</Button>
           </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search in titles and content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-tertiary border border-border/30 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all shadow-xl"
            />
         </div>
         <div className="flex items-center gap-2 w-full lg:w-auto">
            <button 
              onClick={() => setFilter({})}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                Object.keys(filter).length === 0 ? 'bg-accent text-white border-accent' : 'bg-bg-tertiary border-border/30 text-text-muted'
              )}
            >
              All
            </button>
            <button 
              onClick={() => setFilter({ pinned: true })}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                filter.pinned ? 'bg-accent text-white border-accent' : 'bg-bg-tertiary border-border/30 text-text-muted'
              )}
            >
              <Pin className="w-3 h-3" /> Pinned
            </button>
            <button 
              onClick={() => setFilter({ archived: true })}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                filter.archived ? 'bg-accent text-white border-accent' : 'bg-bg-tertiary border-border/30 text-text-muted'
              )}
            >
              <Archive className="w-3 h-3" /> Archived
            </button>
         </div>
      </div>

      {/* History List */}
      <div className="glass-strong rounded-3xl border border-border/30 overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-border/30 bg-bg-secondary/50">
                     <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Conversation</th>
                     <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Strategy</th>
                     <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Activity</th>
                     <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Stats</th>
                     <th className="px-6 py-4 text-right"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/10">
                  <AnimatePresence mode="popLayout">
                    {conversations.map((conv, i) => (
                      <motion.tr 
                        key={conv.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.03 }}
                        className="group hover:bg-bg-tertiary/20 transition-colors"
                      >
                         <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0 group-hover:bg-accent-subtle group-hover:text-accent transition-colors">
                                  <MessageSquare className="w-5 h-5" />
                               </div>
                               <div className="min-w-0">
                                  <Link to={`/workspace?id=${conv.id}`} className="font-bold text-text-primary hover:text-accent transition-colors truncate block max-w-md">
                                     {conv.title}
                                  </Link>
                                  <div className="flex items-center gap-2 mt-1">
                                     {conv.is_pinned && <Badge variant="primary" className="h-4 px-1.5 text-[8px] font-black">Pinned</Badge>}
                                     {conv.is_archived && <Badge variant="secondary" className="h-4 px-1.5 text-[8px] font-black">Archived</Badge>}
                                  </div>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-5">
                            <Badge variant="outline" className="text-[10px] font-bold border-border/50 bg-bg-tertiary/30">
                               {getMemoryLabel(conv.memory_type)}
                            </Badge>
                         </td>
                         <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-text-secondary">
                               <Calendar className="w-3.5 h-3.5" />
                               <span className="text-xs font-medium">{formatDate(conv.created_at)}</span>
                            </div>
                         </td>
                         <td className="px-6 py-5">
                            <div className="flex gap-4">
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-text-muted uppercase">Msgs</span>
                                  <span className="text-xs font-bold">{conv.message_count}</span>
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-text-muted uppercase">Tokens</span>
                                  <span className="text-xs font-bold">{(conv.total_tokens_used / 1000).toFixed(1)}k</span>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                               <Link to={`/workspace?id=${conv.id}`}>
                                  <Button variant="ghost" size="sm" className="p-2 h-auto text-text-tertiary hover:text-accent">
                                     <ArrowUpRight className="w-4 h-4" />
                                  </Button>
                               </Link>
                               <div className="relative group/menu">
                                  <Button variant="ghost" size="sm" className="p-2 h-auto text-text-tertiary">
                                     <MoreVertical className="w-4 h-4" />
                                  </Button>
                                  <div className="absolute right-0 top-full mt-1 w-48 glass-strong rounded-xl border border-border/50 shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-modal p-1.5 space-y-1 text-left">
                                     <button 
                                       onClick={() => handleTogglePin(conv.id, conv.is_pinned)}
                                       className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
                                     >
                                        <Pin className="w-3.5 h-3.5" /> {conv.is_pinned ? 'Unpin' : 'Pin to Sidebar'}
                                     </button>
                                     <button 
                                       onClick={() => handleToggleArchive(conv.id, conv.is_archived)}
                                       className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
                                     >
                                        <Archive className="w-3.5 h-3.5" /> {conv.is_archived ? 'Restore' : 'Archive Chat'}
                                     </button>
                                     <button 
                                       onClick={() => handleExport(conv.id, conv.title)}
                                       className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all"
                                     >
                                        <FileJson className="w-3.5 h-3.5" /> Export Data (JSON)
                                     </button>
                                     <div className="h-[1px] bg-border/20 mx-2" />
                                     <button 
                                       onClick={async () => {
                                         if (!window.confirm('Delete permanently?')) {
                                           return;
                                         }
                                         await deleteConversation(conv.id);
                                         addToast({ type: 'success', message: 'Conversation deleted.' });
                                       }}
                                       className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-danger hover:bg-danger-subtle transition-all"
                                     >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                                     </button>
                                  </div>
                               </div>
                            </div>
                         </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
               </tbody>
            </table>
         </div>

         {/* Pagination */}
         <div className="px-6 py-4 bg-bg-secondary/30 border-t border-border/30 flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">
               Showing {conversations.length} of {pagination.total} conversations
            </span>
            <div className="flex gap-2">
               <Button 
                 variant="secondary" 
                 size="sm" 
                 disabled={page === 1}
                 onClick={() => setPage(p => p - 1)}
               >
                 Previous
               </Button>
               <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                        page === p ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-tertiary'
                      )}
                    >
                      {p}
                    </button>
                  ))}
               </div>
               <Button 
                 variant="secondary" 
                 size="sm"
                 disabled={page === pagination.pages}
                 onClick={() => setPage(p => p + 1)}
               >
                 Next
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default HistoryPage;
