import React from 'react';
import { useGetMe, useLogout } from '@workspace/api-client-react';
import { Redirect, useLocation } from 'wouter';
import { LogOut, Loader2, Radio } from 'lucide-react';
import { usePlotEvents } from '@/hooks/use-plot-events';

export function SalesLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useGetMe();
  const logout = useLogout();
  const [location, setLocation] = useLocation();
  const { isLive } = usePlotEvents();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!session) {
    return <Redirect to="/" />;
  }

  if (session.type !== 'sales') {
    return <Redirect to="/" />;
  }

  const handleLogout = () => {
    logout.mutate({}, {
      onSuccess: () => setLocation('/')
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="bg-primary text-primary-foreground border-b border-primary-border shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-secondary rounded flex items-center justify-center text-secondary-foreground font-bold font-mono">
              PF
            </div>
            <div>
              <h1 className="font-semibold uppercase tracking-wider text-sm">PlotFolio</h1>
              <p className="text-xs text-primary-foreground/70">Sales Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 text-xs font-medium">
              <Radio className={`h-3 w-3 ${isLive ? 'text-green-400 animate-pulse' : 'text-yellow-400'}`} />
              {isLive ? 'LIVE' : 'Reconnecting...'}
            </div>
            
            <div className="flex items-center gap-4 border-l border-primary-foreground/20 pl-6">
              <div className="text-right">
                <p className="text-sm font-medium">{session.name}</p>
                <p className="text-xs text-primary-foreground/70">RM Code: {session.rmCode}</p>
              </div>
              <button 
                onClick={handleLogout}
                disabled={logout.isPending}
                className="h-8 w-8 flex items-center justify-center rounded hover:bg-primary-foreground/10 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
