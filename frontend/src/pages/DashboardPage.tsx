import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  BrainCircuit, 
  Zap, 
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  Layout,
  Plus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useConversationStore } from '../stores/conversationStore';
import { usePersonaStore } from '../stores/personaStore';
import { cn, getMemoryLabel, getDomainColor } from '../lib/utils';
import Button from '../components/ui/Button';
import api from '../lib/api';
import type { Stats } from '../types';

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { conversations, fetchConversations, createConversation, isLoading: isConvLoading } = useConversationStore();
  const { personas, fetchPersonas } = usePersonaStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchConversations();
    fetchPersonas();
    api.get<Stats>('/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, [fetchConversations, fetchPersonas]);

  const recentConversations = conversations.slice(0, 5);
  const displayPersonas = personas.slice(0, 4);

  const statCards = [
    { label: 'Conversations', value: stats?.total_conversations ?? conversations.length, icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Entities Tracked', value: stats?.total_entities ?? 0, icon: BrainCircuit, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Tokens Used', value: stats ? `${(stats.total_tokens_used / 1000).toFixed(1)}k` : '0', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Total Messages', value: stats?.total_messages ?? 0, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNewSession = async () => {
    try {
      const conv = await createConversation({ title: 'New Conversation' });
      navigate(`/workspace?id=${conv.id}`);
    } catch {
      navigate('/workspace');
    }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-4">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">Platform Active</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
            Welcome back, <span className="text-gradient">{user?.username}</span>
          </h1>
          <p className="text-text-secondary text-lg font-medium max-w-xl leading-relaxed">
            Your conversational memory is live. Access your personas and deep memory tools below.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button 
            variant="primary" 
            size="lg" 
            className="px-10 rounded-2xl shadow-glow btn-glow group transition-all h-14"
            onClick={handleNewSession}
          >
            <Plus className="w-5 h-5 mr-1 group-hover:rotate-90 transition-transform" />
            New Session
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card-premium relative group overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-10 transition-opacity">
              <stat.icon className="w-20 h-20 -mr-6 -mt-6 rotate-12" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className={cn('w-12 h-12 rounded-xl flex-center flex-shrink-0', stat.bg)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-text-muted uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-text-primary tracking-tight">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Recent Sessions */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-bg-secondary flex-center border border-border/50">
                   <Clock className="w-4 h-4 text-text-tertiary" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Recent Conversations</h3>
             </div>
             <Link to="/history" className="text-sm font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1 group">
                Full History
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
             </Link>
          </div>

          <div className="bg-bg-secondary/30 rounded-3xl border border-border/50 overflow-hidden backdrop-blur-sm">
             {isConvLoading && recentConversations.length === 0 ? (
                <div className="p-10 space-y-4">
                   {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="h-20 w-full bg-bg-tertiary/20 animate-pulse rounded-2xl" />
                   ))}
                </div>
             ) : recentConversations.length > 0 ? (
                <div className="divide-y divide-border/10">
                   {recentConversations.map((conv) => (
                      <Link 
                        key={conv.id} 
                        to={`/workspace?id=${conv.id}`}
                        className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all group"
                      >
                         <div className="flex items-center gap-5 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow group-hover:rotate-3">
                               <MessageSquare className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-lg font-bold text-text-primary truncate group-hover:text-accent transition-colors">{conv.title}</p>
                               <div className="flex items-center gap-3 mt-1">
                                  <span className="px-2 py-0.5 rounded-md bg-bg-elevated text-[10px] font-black uppercase tracking-widest text-text-secondary border border-border/50">
                                     {getMemoryLabel(conv.memory_type)}
                                  </span>
                                  <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                                     <Clock className="w-3 h-3" />
                                     {formatDate(conv.created_at)}
                                  </span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="hidden sm:flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                               <span className="text-[10px] font-black text-accent uppercase tracking-widest">Resume</span>
                               <span className="text-[10px] text-text-muted font-medium">{conv.message_count} messages</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex-center text-text-muted group-hover:text-accent group-hover:bg-accent/10 transition-all">
                               <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                         </div>
                      </Link>
                   ))}
                </div>
             ) : (
                <div className="p-20 text-center space-y-6">
                   <div className="w-24 h-24 bg-bg-tertiary rounded-[2.5rem] flex-center mx-auto border border-border/50 rotate-6 relative">
                      <div className="absolute inset-0 bg-accent/20 blur-2xl animate-pulse" />
                      <MessageSquare className="w-12 h-12 text-text-muted relative z-10" />
                   </div>
                   <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-xl font-black text-text-primary">No conversations yet</p>
                      <p className="text-sm text-text-secondary font-medium">Start your first conversation to begin building your knowledge base.</p>
                   </div>
                   <Button variant="primary" size="lg" className="rounded-2xl px-10 shadow-glow" onClick={handleNewSession}>
                     Start Chatting
                   </Button>
                </div>
             )}
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="xl:col-span-4 space-y-8">
           <div className="space-y-6">
              <h3 className="text-xl font-black tracking-tight px-2 flex items-center gap-3">
                 <Sparkles className="w-5 h-5 text-accent" />
                 Insights
              </h3>
              
              {/* Feature Highlight Card */}
              <div className="card-premium bg-gradient-to-br from-accent/10 via-purple-600/5 to-transparent border-accent/20 relative group cursor-default">
                 <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors" />
                 <div className="relative space-y-5">
                    <div className="w-12 h-12 bg-accent text-white rounded-2xl flex-center shadow-lg transform group-hover:rotate-12 transition-transform">
                       <Zap className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                       <h4 className="text-2xl font-black tracking-tight">Memory Strategies</h4>
                       <p className="text-sm text-text-secondary leading-relaxed font-medium">
                         Choose from <span className="text-accent font-bold">5 memory types</span>: Buffer, Summary, Entity, Knowledge Graph, or Hybrid for optimal context management.
                       </p>
                    </div>
                    <Link to="/comparison">
                      <Button variant="outline" className="w-full h-12 rounded-xl border-accent/30 text-accent font-bold hover:bg-accent hover:text-white transition-all">
                         Compare Strategies
                      </Button>
                    </Link>
                 </div>
              </div>

              {/* Persona Quick Link */}
              <div className="card-premium border-border/40 group">
                 <div className="flex items-center justify-between mb-6">
                    <h4 className="font-black text-sm uppercase tracking-widest text-text-muted">Active Personas</h4>
                    <Link to="/personas" className="p-2 hover:bg-bg-hover rounded-lg transition-colors">
                       <Layout className="w-4 h-4 text-text-tertiary" />
                    </Link>
                 </div>
                 <div className="flex -space-x-3">
                    {displayPersonas.map((persona) => (
                       <div 
                         key={persona.id} 
                         className="w-12 h-12 rounded-xl border-4 border-bg-primary flex-center font-black text-sm hover:translate-y-[-4px] transition-transform cursor-pointer overflow-hidden shadow-lg"
                         style={{ backgroundColor: getDomainColor(persona.domain) }}
                         title={persona.name}
                       >
                          <span className="text-white">{persona.name[0].toUpperCase()}</span>
                       </div>
                    ))}
                    <Link to="/personas" className="w-12 h-12 rounded-xl border-4 border-bg-primary bg-accent-subtle text-accent flex-center font-black text-xs hover:translate-y-[-4px] transition-transform cursor-pointer shadow-lg">
                       +{Math.max(personas.length - 4, 0)}
                    </Link>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
