import { Link } from 'react-router-dom';
import { 
  BrainCircuit, 
  Code, 
  Globe, 
  ExternalLink, 
  Mail 
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: 'Product',
      links: [
        { label: 'Features', path: '/#features' },
        { label: 'Workbench', path: '/comparison' },
        { label: 'Knowledge Graph', path: '/comparison' },
        { label: 'Personas', path: '/personas' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', path: '/#architecture' },
        { label: 'Platform', path: '/#enterprise' },
        { label: 'Careers', path: 'mailto:support@aethermind.ai?subject=Careers' },
        { label: 'Privacy', path: 'mailto:support@aethermind.ai?subject=Privacy%20Policy' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', path: '/#architecture' },
        { label: 'API Reference', path: '/#architecture' },
        { label: 'Community', path: 'mailto:support@aethermind.ai?subject=Community' },
        { label: 'Support', path: 'mailto:support@aethermind.ai?subject=Support' },
      ],
    },
  ];

  return (
    <footer className="bg-bg-primary border-t border-border/30 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-text-primary">AetherMind</span>
          </Link>
          <p className="text-text-secondary max-w-sm leading-relaxed">
            The next generation of AI collaboration. Persistent memory, deep knowledge graph visualization, and specialized personas built for elite teams.
          </p>
          <div className="flex gap-4">
            <a href="/" className="p-2 bg-bg-tertiary rounded-lg hover:text-accent transition-colors">
              <Globe className="w-5 h-5" />
            </a>
            <a href="/#architecture" className="p-2 bg-bg-tertiary rounded-lg hover:text-accent transition-colors">
              <Code className="w-5 h-5" />
            </a>
            <a href="/#features" className="p-2 bg-bg-tertiary rounded-lg hover:text-accent transition-colors">
              <ExternalLink className="w-5 h-5" />
            </a>
            <a href="mailto:support@aethermind.ai" className="p-2 bg-bg-tertiary rounded-lg hover:text-accent transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Links Columns */}
        {sections.map((section) => (
          <div key={section.title} className="space-y-6">
            <h4 className="font-bold text-text-primary uppercase tracking-widest text-xs">{section.title}</h4>
            <ul className="space-y-4">
              {section.links.map((link) => (
                <li key={link.label}>
                  <a href={link.path} className="text-text-secondary hover:text-accent transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-border/20 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-text-muted text-sm text-center">
          © {currentYear} AetherMind AI. All rights reserved. Built with passion for the future of intelligence.
        </p>
        <div className="flex gap-6 text-sm text-text-muted">
          <a href="/#enterprise" className="hover:text-text-secondary">Terms</a>
          <a href="/#enterprise" className="hover:text-text-secondary">Privacy</a>
          <a href="/#enterprise" className="hover:text-text-secondary">Cookies</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
