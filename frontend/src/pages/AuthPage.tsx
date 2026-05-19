import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { cn } from '../lib/utils';

const AuthPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  const handleTabChange = (tab: 'login' | 'register') => {
    setSearchParams({ tab });
  };

  const features = [
    { icon: Sparkles, text: 'Advanced persistent memory' },
    { icon: ShieldCheck, text: 'Secure production-grade encryption' },
    { icon: Zap, text: 'Lightning fast inference with Groq' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-6 py-20">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-700" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Branding & Info */}
        <div className="hidden lg:flex flex-col space-y-10 animate-fade-in">
          <Link to="/" className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-glow">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">AetherMind</h1>
          </Link>

          <div className="space-y-6">
            <h2 className="text-5xl font-black leading-[1.1] tracking-tight">
              Intelligence that <span className="gradient-text">evolves</span> with you.
            </h2>
            <p className="text-xl text-text-secondary leading-relaxed">
              Experience the first AI platform designed for continuous context and deep knowledge management.
            </p>
          </div>

          <ul className="space-y-4">
            {features.map((f, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 text-text-primary"
              >
                <div className="w-6 h-6 rounded-full bg-accent-subtle flex items-center justify-center">
                  <f.icon className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="font-medium">{f.text}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Right Side: Auth Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-8 md:p-10 shadow-2xl relative"
        >
          {/* Tab Switcher */}
          <div className="flex p-1 bg-bg-tertiary/50 rounded-xl mb-8">
            <button
              onClick={() => handleTabChange('login')}
              className={cn(
                'flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200',
                activeTab === 'login' 
                  ? 'bg-bg-elevated text-text-primary shadow-lg' 
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={cn(
                'flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200',
                activeTab === 'register' 
                  ? 'bg-bg-elevated text-text-primary shadow-lg' 
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Register
            </button>
          </div>

          <div className="space-y-6">
             <div className="text-center space-y-2 mb-2">
               <h3 className="text-2xl font-bold">
                 {activeTab === 'login' ? 'Welcome Back' : 'Get Started'}
               </h3>
               <p className="text-text-secondary text-sm">
                 {activeTab === 'login' 
                    ? 'Enter your credentials to access your mind vault.' 
                    : 'Create your account to start building your AI knowledge base.'}
               </p>
             </div>

             <AnimatePresence mode="wait">
               <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, x: 10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -10 }}
                 transition={{ duration: 0.2 }}
               >
                 {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
               </motion.div>
             </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
