import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Sparkles, Zap, ArrowRight, MessageSquare, Database, LineChart, Cpu, Layout, Layers, Share2 } from 'lucide-react';
import Button from '../components/ui/Button';

const HomePage = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-accent/20 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-subtle border border-accent/20 text-accent-hover text-sm font-bold tracking-wide"
          >
            <Sparkles className="w-4 h-4" />
            Next-Gen AI Platform is Here
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9]"
          >
            Intelligence that <br />
            <span className="gradient-text">Actually Remembers.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-text-secondary leading-relaxed"
          >
            AetherMind is a production-grade AI chat platform with persistent cross-session memory, 
            knowledge graph visualization, and intelligent context management.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link to="/auth?tab=register">
              <Button size="lg" className="px-10 py-6 text-lg font-black rounded-2xl shadow-glow group">
                Build Your Mind Vault
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

          </motion.div>

          {/* Product Mockup Placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            id="architecture"
            className="pt-16 max-w-5xl mx-auto"
          >
             <div className="glass-strong rounded-3xl border border-white/10 p-2 shadow-2xl relative">
                <div className="absolute inset-0 bg-accent/5 blur-3xl -z-10 rounded-full" />
                <div className="bg-bg-primary rounded-[22px] overflow-hidden border border-white/5 p-4 sm:p-8 flex items-center justify-center min-h-[400px]">
                   <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-12 w-full max-w-4xl mx-auto">
                      
                      {/* Frontend Node */}
                      <div className="flex flex-col items-center gap-3 w-full lg:w-48 group">
                         <div className="w-20 h-20 rounded-2xl bg-bg-tertiary/50 border border-white/10 flex items-center justify-center relative shadow-lg group-hover:border-accent/50 group-hover:shadow-glow transition-all duration-300">
                            <div className="absolute -inset-2 bg-accent/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Layout className="w-8 h-8 text-text-primary z-10" />
                         </div>
                         <div className="text-center">
                            <h3 className="text-sm font-bold text-text-primary">React Frontend</h3>
                            <p className="text-[10px] text-text-muted font-medium mt-1">Zustand State, Framer Motion</p>
                         </div>
                      </div>

                      {/* Connection Line 1 */}
                      <div className="flex flex-col lg:flex-row items-center gap-2 text-text-muted/50 hidden lg:flex">
                         <div className="w-16 h-[2px] bg-gradient-to-r from-accent/20 via-accent to-accent/20 bg-[length:200%_auto] animate-gradient" />
                         <ArrowRight className="w-4 h-4 text-accent" />
                      </div>
                      <div className="h-10 w-[2px] bg-gradient-to-b from-accent/20 via-accent to-accent/20 lg:hidden" />

                      {/* Engine Core */}
                      <div className="flex flex-col items-center p-6 lg:p-8 rounded-[2rem] bg-gradient-to-b from-bg-tertiary/80 to-bg-primary border border-accent/20 shadow-[0_0_40px_rgba(var(--accent),0.1)] relative w-full lg:w-auto z-10">
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-glow">
                            <BrainCircuit className="w-3 h-3" />
                            LangGraph Core
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 mt-2 w-full">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary/50 border border-white/5">
                               <Database className="w-5 h-5 text-purple-400" />
                               <span className="text-xs font-bold text-text-secondary">Entity Memory</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary/50 border border-white/5">
                               <Layers className="w-5 h-5 text-blue-400" />
                               <span className="text-xs font-bold text-text-secondary">Summary Memory</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary/50 border border-white/5">
                               <Share2 className="w-5 h-5 text-emerald-400" />
                               <span className="text-xs font-bold text-text-secondary">Knowledge Graph</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary/50 border border-white/5">
                               <Cpu className="w-5 h-5 text-orange-400" />
                               <span className="text-xs font-bold text-text-secondary">Buffer Memory</span>
                            </div>
                         </div>
                      </div>

                      {/* Connection Line 2 */}
                      <div className="flex flex-col lg:flex-row items-center gap-2 text-text-muted/50 hidden lg:flex">
                         <div className="w-16 h-[2px] bg-gradient-to-r from-accent/20 via-accent to-accent/20 bg-[length:200%_auto] animate-gradient" />
                         <ArrowRight className="w-4 h-4 text-accent" />
                      </div>
                      <div className="h-10 w-[2px] bg-gradient-to-b from-accent/20 via-accent to-accent/20 lg:hidden" />

                      {/* LLM Node */}
                      <div className="flex flex-col items-center gap-3 w-full lg:w-48 group">
                         <div className="w-20 h-20 rounded-2xl bg-bg-tertiary/50 border border-white/10 flex items-center justify-center relative shadow-lg group-hover:border-purple-500/50 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300">
                            <div className="absolute -inset-2 bg-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Zap className="w-8 h-8 text-text-primary z-10" />
                         </div>
                         <div className="text-center">
                            <h3 className="text-sm font-bold text-text-primary">Groq LPUs</h3>
                            <p className="text-[10px] text-text-muted font-medium mt-1">Llama 3 Inference</p>
                         </div>
                      </div>

                   </div>
                </div>
             </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Everything you need to <br /><span className="gradient-text">scale intelligence</span>.</h2>
            <p className="text-text-secondary max-w-xl mx-auto">Five unique memory strategies and deep visualization tools to manage complex long-term projects.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Database, title: 'Hybrid Memory', desc: 'Combines entity tracking with context summarization for perfect recall.' },
              { icon: BrainCircuit, title: 'Knowledge Graphs', desc: 'Visualize your conversation nodes and relationships in 2D force-directed maps.' },
              { icon: Zap, title: 'Groq Speed', desc: 'Powered by Llama 3.3 running on Groq LPUs for near-instant responses.' },
              { icon: MessageSquare, title: 'Personas', desc: 'Switch between specialized AI personalities with custom domain expertise.' },
              { icon: LineChart, title: 'Token Analytics', desc: 'Monitor your context window budget and consumption in real-time.' },
              { icon: Cpu, title: 'LangGraph Core', desc: 'State-of-the-art orchestration for stable, branching conversation flows.' },
            ].map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="glass p-8 rounded-3xl border border-border/30 hover:border-accent/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-6 group-hover:bg-accent-subtle group-hover:text-accent transition-colors">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section id="enterprise" className="py-24 px-6 relative border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            Enterprise Ready
          </div>
          <h2 className="text-3xl md:text-5xl font-black">Scale intelligence across <br /><span className="gradient-text">your entire organization</span>.</h2>
          <p className="text-text-secondary">Custom deployment models, dedicated support, and advanced security protocols designed for high-scale enterprise environments.</p>
          <div className="pt-8">
            <Link to="/auth?tab=register">
              <Button size="lg" className="px-12 py-6 rounded-2xl font-black shadow-glow">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
