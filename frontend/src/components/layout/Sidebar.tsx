import { useEffect, useState } from 'react';
import { ChevronLeft, History, LayoutDashboard, LogOut, MessageSquare, Plus, Search, Users } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useConversationStore } from '../../stores/conversationStore';
import { useUIStore } from '../../stores/uiStore';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { conversations, fetchConversations, createConversation, isLoading } = useConversationStore();
  const { logout, user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Chat', icon: MessageSquare, path: '/workspace' },
    { label: 'History', icon: History, path: '/history' },
    { label: 'Personas', icon: Users, path: '/personas' },
  ];

  const handleNewChat = async () => {
    try {
      const conversation = await createConversation({ title: 'New Conversation' });
      navigate(`/workspace?id=${conversation.id}`);
    } catch {
      navigate('/workspace');
    }
  };

  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-sidebar flex flex-col glass-panel border-r border-border transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-72 translate-x-0' : 'w-20 lg:translate-x-0 -translate-x-full lg:w-20',
      )}
    >
      <div className="flex items-center justify-between h-20 px-4">
        <div className={cn('flex items-center gap-3 overflow-hidden transition-all duration-300', !sidebarOpen && 'lg:opacity-0 lg:w-0')}>
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow btn-glow">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <span className="font-black text-xl tracking-tighter text-gradient">AETHER</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ChevronLeft className={cn('w-5 h-5 transition-transform duration-500', !sidebarOpen && 'rotate-180')} />
        </button>
      </div>

      <div className="px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                isActive ? 'bg-accent/10 text-accent font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              )}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-accent' : 'text-text-tertiary group-hover:text-text-primary')} />
              {sidebarOpen && <span className="text-sm tracking-wide">{item.label}</span>}
              {!sidebarOpen && (
                <div className="absolute left-16 px-3 py-1.5 bg-bg-elevated text-text-primary text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap shadow-xl border border-border z-tooltip">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col min-h-0 px-3 py-6">
        <div className={cn('flex items-center justify-between mb-4 px-3', !sidebarOpen && 'justify-center')}>
          {sidebarOpen && <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Conversations</span>}
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {sidebarOpen && (
          <div className="relative mb-6 px-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full bg-bg-secondary border border-border/50 rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
          {isLoading && conversations.length === 0 ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-11 w-full bg-bg-tertiary/20 animate-pulse rounded-xl mb-1" />
            ))
          ) : (
            filteredConversations.map((conversation) => {
              const isActive = location.search === `?id=${conversation.id}`;
              return (
                <Link
                  key={conversation.id}
                  to={`/workspace?id=${conversation.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                    isActive ? 'bg-bg-elevated text-text-primary shadow-sm border border-border/50' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
                  )}
                >
                  <MessageSquare className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-accent' : 'text-text-muted')} />
                  {sidebarOpen && (
                    <span className="flex-1 text-sm truncate font-medium">
                      {conversation.title}
                    </span>
                  )}
                  {!sidebarOpen && (
                    <div className="absolute left-16 px-3 py-1.5 bg-bg-elevated text-text-primary text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap shadow-xl border border-border z-tooltip">
                      {conversation.title}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border/50">
        <div
          className={cn(
            'flex items-center gap-3 p-2.5 rounded-2xl bg-bg-secondary border border-border transition-all duration-300',
            !sidebarOpen && 'justify-center p-1.5',
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center text-white font-black flex-shrink-0 shadow-lg">
            {user?.username?.[0].toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{user?.username}</p>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider truncate">Premium Plan</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={logout}
              className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        {!sidebarOpen && (
          <button
            onClick={logout}
            className="mt-4 w-full flex justify-center p-2.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
