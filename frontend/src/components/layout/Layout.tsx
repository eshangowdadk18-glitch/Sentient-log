import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PanelLeftClose, PanelLeftOpen, Bell, LogOut } from 'lucide-react';
import { useAppStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { Button } from '../ui/button';
import { api } from '@/services/api';

export function Layout() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const user = useAuthStore(state => state.user);
  const clearAuth = useAuthStore(state => state.clearAuth);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore errors on logout
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const userInitial = user?.email ? user.email.substring(0, 2).toUpperCase() : 'SL';

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-14 border-b border-white/5 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-zinc-400 hover:text-white h-8 w-8">
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
            <div className="flex items-center text-sm font-medium text-zinc-400">
              <span className="text-zinc-200">SentientLog</span>
              <span className="mx-2 text-zinc-600">/</span>
              <span>Overview</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-xs font-medium text-zinc-200 shadow-sm" title={user?.email}>
              {userInitial}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-zinc-500 hover:text-zinc-300 h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
