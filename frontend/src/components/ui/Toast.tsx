import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-success" />,
  error: <AlertCircle className="w-5 h-5 text-danger" />,
  info: <Info className="w-5 h-5 text-info" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning" />,
};

const bgColors = {
  success: 'bg-success-subtle border-success/20',
  error: 'bg-danger-subtle border-danger/20',
  info: 'bg-info-subtle border-info/20',
  warning: 'bg-warning-subtle border-warning/20',
};

const Toast = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-6 right-6 z-toast flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border glass-strong shadow-xl min-w-[300px] max-w-md',
              bgColors[toast.type]
            )}
          >
            <div className="flex-shrink-0">{icons[toast.type]}</div>
            <div className="flex-1 text-sm font-medium text-text-primary">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 hover:bg-black/5 rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-text-tertiary" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
