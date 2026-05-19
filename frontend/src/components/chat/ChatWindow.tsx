import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, AlertCircle, Send, Cpu, Command } from 'lucide-react';
import { useConversationStore } from '../../stores/conversationStore';
import { useMemoryStore } from '../../stores/memoryStore';
import { streamMessage } from '../../lib/sse';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import type { Message } from '../../types';

const ChatWindow = () => {
  const { 
    activeConversation, 
    messages, 
    addMessage, 
    fetchConversation,
    isStreaming, 
    setStreaming, 
    streamingContent, 
    setStreamingContent, 
    appendStreamingContent 
  } = useConversationStore();
  
  const { refreshAll } = useMemoryStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom(isStreaming ? 'auto' : 'smooth');
  }, [messages, streamingContent, isStreaming]);

  const handleSendMessage = async (content: string) => {
    if (!activeConversation || !content.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    addMessage(userMessage);
    setStreaming(true);
    setStreamingContent('');
    setError(null);

    try {
      await streamMessage({
        conversationId: activeConversation.id,
        message: content,
        onToken: (token) => {
          appendStreamingContent(token);
        },
        onComplete: (fullText) => {
          setStreaming(false);
          const assistantMessage: Message = {
            role: 'assistant',
            content: fullText,
            created_at: new Date().toISOString(),
          };
          addMessage(assistantMessage);
          setStreamingContent('');
          void Promise.all([
            refreshAll(activeConversation.id),
            fetchConversation(activeConversation.id),
          ]);
        },
        onError: () => {
          setStreaming(false);
          setError('Response synthesis interrupted. Please retry.');
          void fetchConversation(activeConversation.id);
        },
      });
    } catch {
      setStreaming(false);
      setError('Neural link severed. Check your network connection.');
      void fetchConversation(activeConversation.id);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Messages Scroll Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-8"
      >
        <div className="max-w-4xl mx-auto w-full space-y-8">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="relative w-24 h-24 rounded-[2.5rem] bg-bg-secondary flex items-center justify-center border border-border shadow-2xl transform hover:scale-110 transition-transform duration-500">
                  <Cpu className="w-12 h-12 text-accent" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-3xl font-black tracking-tight text-text-primary">Initiate Synthesis</h3>
                <p className="text-text-secondary text-base max-w-sm mx-auto font-medium leading-relaxed">
                  Start a new thread to evolve your knowledge base. Every exchange is indexed for permanent recall.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                 {[
                   { icon: Sparkles, text: 'Analyze this codebase for efficiency' },
                   { icon: Command, text: 'Synthesize a project roadmap' },
                   { icon: Bot, text: 'Refactor this logic into a hook' },
                   { icon: Send, text: 'Explain the current memory state' }
                 ].map((hint, i) => (
                    <motion.button
                      key={hint.text}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleSendMessage(hint.text)}
                      className="group flex items-center gap-3 p-4 rounded-2xl bg-bg-secondary/50 border border-border/50 text-sm font-bold text-text-secondary hover:text-accent hover:border-accent/50 hover:bg-bg-hover transition-all text-left"
                    >
                       <hint.icon className="w-4 h-4 text-text-tertiary group-hover:text-accent transition-colors" />
                       <span className="truncate">{hint.text}</span>
                    </motion.button>
                 ))}
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-12 pb-12">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {isStreaming && (
              <MessageBubble 
                message={{ role: 'assistant', content: streamingContent }} 
                isStreaming={true} 
              />
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* Error Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-modal"
          >
            <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 flex items-center gap-3 shadow-2xl backdrop-blur-xl">
              <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-danger" />
              </div>
              <p className="text-sm font-bold text-danger flex-1">{error}</p>
              <button 
                onClick={() => setError(null)} 
                className="p-2 hover:bg-danger/10 rounded-lg text-danger transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Section with Gradient Overlay */}
      <div className="relative px-4 sm:px-6 pb-6 pt-12">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <MessageInput 
            onSend={handleSendMessage} 
            isLoading={isStreaming}
            disabled={!activeConversation}
          />
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
            <span>Neural Engine v4.2</span>
            <span className="w-1 h-1 bg-border rounded-full" />
            <span>Context: {activeConversation?.memory_type || 'Active'}</span>
            <span className="w-1 h-1 bg-border rounded-full" />
            <span>Tokens: Optimal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
