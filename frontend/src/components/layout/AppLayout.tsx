import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

const AppLayout = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed on desktop, slide-in on mobile */}
      <Sidebar />

      {/* Main Content Area */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 h-full transition-all duration-300 relative',
        sidebarOpen ? 'lg:ml-72' : 'lg:ml-20'
      )}>
        <Navbar />
        
        <main className="flex-1 overflow-hidden relative">
          {/* We use overflow-hidden on main and let pages handle their own scrolling or use a sub-container */}
          <div className="h-full w-full overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
