import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { User, Bot, Copy, Check, RotateCcw, Share2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn, formatDate } from '../../lib/utils';
import { useUIStore } from '../../stores/uiStore';
import type { Message } from '../../types';
import Button from '../ui/Button';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

const MessageBubble = ({ message, isStreaming, onRegenerate }: MessageBubbleProps) => {
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group relative w-full transition-all duration-500',
        isAssistant ? 'py-10' : 'py-8'
      )}
    >
      {/* Background Accent for Assistant */}
      {isAssistant && (
        <div className="absolute inset-0 bg-bg-secondary/20 backdrop-blur-[2px] pointer-events-none" />
      )}

      <div className="relative max-w-4xl mx-auto flex gap-4 md:gap-8 px-4 sm:px-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center flex-shrink-0 pt-1">
          <div className={cn(
            'w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl transition-all duration-300',
            isAssistant 
              ? 'bg-gradient-to-br from-accent to-purple-600 text-white rotate-3 group-hover:rotate-0' 
              : 'bg-bg-elevated text-text-secondary border border-border/50 -rotate-3 group-hover:rotate-0'
          )}>
            {isAssistant ? (
              <Bot className="w-6 h-6 md:w-7 md:h-7" />
            ) : (
              <User className="w-6 h-6 md:w-7 md:h-7" />
            )}
          </div>
          {isAssistant && isStreaming && (
            <div className="mt-4 flex flex-col gap-1.5 items-center">
              <span className="w-1 h-1 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 bg-accent rounded-full animate-bounce" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black tracking-tight text-text-primary uppercase tracking-[0.1em]">
                {isAssistant ? 'AetherMind' : 'You'}
              </span>
              {isAssistant && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
                  <Sparkles className="w-3 h-3 text-accent" />
                  <span className="text-[9px] font-black text-accent uppercase tracking-wider">AI</span>
                </div>
              )}
            </div>
            {message.created_at && (
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em]">
                {formatDate(message.created_at)}
              </span>
            )}
          </div>

          <div className={cn(
            'prose prose-invert prose-slate max-w-none text-base md:text-lg leading-relaxed text-text-primary/90 font-medium selection:bg-accent/30',
            isStreaming && 'streaming-cursor',
            'prose-headings:font-black prose-headings:tracking-tight prose-headings:text-text-primary',
            'prose-p:mb-6 prose-p:last:mb-0',
            'prose-code:text-accent prose-code:font-bold prose-code:bg-accent/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none',
            'prose-strong:text-text-primary prose-strong:font-black',
            'prose-a:text-accent prose-a:no-underline hover:prose-a:underline'
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => (
                  <div className="relative group/code my-8 rounded-2xl overflow-hidden border border-border shadow-panel bg-[#0d1117]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-bg-secondary/50">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                      </div>
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Code</span>
                    </div>
                    <pre className="m-0 p-6 overflow-x-auto custom-scrollbar text-sm font-mono leading-relaxed">
                      {children}
                    </pre>
                  </div>
                ),
                table: ({ children }) => (
                  <div className="my-8 overflow-x-auto rounded-2xl border border-border shadow-premium bg-bg-secondary/10">
                    <table className="w-full border-collapse text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-bg-tertiary/50">{children}</thead>,
                th: ({ children }) => (
                  <th className="px-6 py-4 text-left font-black text-text-primary border-b border-border/50 uppercase tracking-wider text-[11px]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-6 py-4 border-b border-border/20 text-text-secondary font-medium">
                    {children}
                  </td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-accent bg-accent/5 px-6 py-4 rounded-r-2xl italic text-text-secondary my-6">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Action Toolbar */}
          {!isStreaming && (
            <div className="flex items-center gap-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-9 px-3 rounded-xl text-text-muted hover:text-accent hover:bg-accent/10 transition-all font-bold text-[10px] uppercase tracking-widest gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              {isAssistant && onRegenerate && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (onRegenerate) onRegenerate();
                    }}
                    className="h-9 px-3 rounded-xl text-text-muted hover:text-accent hover:bg-accent/10 transition-all font-bold text-[10px] uppercase tracking-widest gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      addToast({ type: 'success', message: 'Response copied to clipboard.' });
                    }}
                    className="h-9 px-3 rounded-xl text-text-muted hover:text-accent hover:bg-accent/10 transition-all font-bold text-[10px] uppercase tracking-widest gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
