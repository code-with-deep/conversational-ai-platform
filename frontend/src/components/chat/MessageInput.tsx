import { useState, useRef, useEffect } from 'react';
import { Send, Command } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

const MessageInput = ({ onSend, disabled, isLoading, placeholder }: MessageInputProps) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (content.trim() && !disabled && !isLoading) {
      onSend(content.trim());
      setContent('');
    }
  };

  return (
    <div className="relative w-full group animate-fade-in">
      {/* Decorative Glow */}
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-r from-accent/20 to-purple-600/20 rounded-[2rem] blur-xl transition-opacity duration-500",
        isFocused ? "opacity-100" : "opacity-0"
      )} />

      <div className={cn(
        'relative bg-bg-secondary/80 backdrop-blur-xl rounded-[2rem] border transition-all duration-300 shadow-2xl',
        isFocused ? 'border-accent/50 ring-4 ring-accent/5' : 'border-border/50',
        disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''
      )}>
        {/* Input Area */}
        <div className="flex items-end p-4 gap-4">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type your message...'}
            disabled={disabled || isLoading}
            className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary py-3 px-2 text-base md:text-lg font-medium resize-none custom-scrollbar min-h-[44px] placeholder:text-text-muted/50 focus:outline-none"
          />

          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!content.trim() || disabled || isLoading}
            loading={isLoading}
            className={cn(
              'h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300',
              content.trim() 
                ? 'bg-accent shadow-glow translate-y-0' 
                : 'bg-bg-tertiary text-text-muted cursor-not-allowed translate-y-1 opacity-50'
            )}
          >
            {isLoading ? null : (
              <div className="flex items-center gap-2">
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </div>
            )}
          </Button>
        </div>
      </div>
      
      <p className="mt-3 text-center text-[10px] text-text-muted font-medium opacity-30 group-hover:opacity-60 transition-opacity flex items-center justify-center gap-2">
        <Command className="w-3 h-3" />
        Press Shift + Enter for a new line
      </p>
    </div>
  );
};

export default MessageInput;
