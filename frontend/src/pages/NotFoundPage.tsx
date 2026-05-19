import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Home, ArrowLeft, Search } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-primary relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-accent/5 rounded-full blur-[120px]" />

      <div className="max-w-md w-full text-center space-y-10 relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative inline-block"
        >
          <div className="w-32 h-32 bg-bg-tertiary rounded-[2.5rem] border border-border/30 flex items-center justify-center mx-auto shadow-2xl">
            <h1 className="text-6xl font-black text-accent drop-shadow-glow">404</h1>
          </div>
          <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-glow animate-bounce">
             <Search className="w-6 h-6 text-white" />
          </div>
        </motion.div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black tracking-tight">Neural Path Lost</h2>
          <p className="text-text-secondary leading-relaxed">
            The knowledge node you're looking for doesn't exist or has been shifted in the neural graph. Let's get you back to safety.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
           <Link to="/" className="flex-1">
             <Button variant="primary" className="w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-glow" icon={<Home className="w-4 h-4" />}>
                Go Home
             </Button>
           </Link>
           <button onClick={() => window.history.back()} className="flex-1">
             <Button variant="outline" className="w-full py-4 rounded-2xl font-black uppercase tracking-widest" icon={<ArrowLeft className="w-4 h-4" />}>
                Go Back
             </Button>
           </button>
        </div>

        <div className="pt-10 flex items-center justify-center gap-3 opacity-30">
           <BrainCircuit className="w-5 h-5 text-text-muted" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">AetherMind Intelligence</span>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
