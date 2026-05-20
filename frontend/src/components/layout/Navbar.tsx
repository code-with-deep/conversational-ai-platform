import { useEffect, useState } from 'react';
import { BrainCircuit, Menu, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import Button from '../ui/Button';

interface NavbarProps {
  isPublic?: boolean;
}

const Navbar = ({ isPublic }: NavbarProps) => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuthStore();
  const { toggleSidebar } = useUIStore();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const publicLinks = [
    { label: 'Features', path: '/#features' },
    { label: 'Architecture', path: '/#architecture' },
    { label: 'Enterprise', path: '/#enterprise' },
  ];

  if (!isPublic) {
    const pageName = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';
    const pageTitle = pageName.charAt(0).toUpperCase() + pageName.slice(1);

    return (
      <header className="h-20 flex items-center justify-between px-6 bg-bg-primary/60 backdrop-blur-md sticky top-0 z-navbar border-b border-border/20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="lg:hidden p-2 h-auto text-text-tertiary hover:text-text-primary hover:bg-bg-hover"
            icon={<Menu className="w-5 h-5" />}
          />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            <h2 className="text-sm font-black text-text-primary tracking-tight uppercase">
              {pageTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-success/10 border border-success/20">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-black text-success uppercase tracking-widest">Online</span>
          </div>

          <Link to="/profile" className="flex items-center gap-3 pl-2 group">
            <div className="text-right hidden md:block">
              <p className="text-xs font-black text-text-primary leading-tight group-hover:text-accent transition-colors">
                {user?.username}
              </p>
              <p className="text-[9px] text-text-muted uppercase tracking-[0.2em] font-black">
                Operator
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-md rounded-full scale-0 group-hover:scale-125 transition-transform" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-bg-tertiary to-bg-elevated border border-border/50 flex items-center justify-center text-xs font-black text-text-primary shadow-lg group-hover:border-accent/50 transition-all">
                {user?.username?.[0].toUpperCase()}
              </div>
            </div>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-navbar transition-all duration-500 px-6',
        isScrolled ? 'py-4' : 'py-8',
      )}
    >
      <div
        className={cn(
          'max-w-7xl mx-auto flex items-center justify-between transition-all duration-500',
          isScrolled ? 'bg-bg-primary/70 backdrop-blur-xl border border-white/5 rounded-full px-8 py-3 shadow-2xl' : '',
        )}
      >
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-accent flex-center shadow-glow group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <span className="font-black text-2xl tracking-tighter text-text-primary">
            AETHER<span className="text-accent">MIND</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          {publicLinks.map((link) => (
            <a
              key={link.label}
              href={link.path}
              className="text-[11px] font-black uppercase tracking-[0.2em] text-text-secondary hover:text-accent transition-all relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-5">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="font-bold text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary">
              Log In
            </Button>
          </Link>
          <Link to="/auth?tab=register">
            <Button variant="primary" size="lg" className="px-8 rounded-full font-black text-xs uppercase tracking-widest shadow-glow btn-glow h-11">
              Initialize Access
            </Button>
          </Link>
        </div>

        <button
          className="lg:hidden p-3 rounded-xl bg-bg-secondary/50 border border-border/50 text-text-primary hover:bg-bg-hover transition-all"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-6 top-24 z-navbar bg-bg-secondary/95 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] flex flex-col gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in">
            <div className="space-y-4">
              {publicLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-2xl font-black text-text-primary tracking-tight hover:text-accent transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-4 pt-6 border-t border-white/5">
              <Link to="/auth" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="lg" className="w-full h-14 rounded-2xl font-bold">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?tab=register" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="lg" className="w-full h-14 rounded-2xl font-black shadow-glow">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
