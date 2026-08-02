import React from 'react';
import { useGetMe, useLogout } from '@workspace/api-client-react';
import { Redirect, Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Hash, Clock, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CrmLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useGetMe();
  const logout = useLogout();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!session) {
    return <Redirect to="/" />;
  }

  if (session.type !== 'crm') {
    return <Redirect to="/" />;
  }

  const handleLogout = () => {
    logout.mutate({}, {
      onSuccess: () => {
        // Explicitly clear the cached session — invalidateQueries alone
        // keeps the old "logged in" data around when the next fetch
        // errors with 401, since React Query preserves last-known-good
        // data through an error transition.
        queryClient.setQueryData(['/api/auth/me'], null);
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        setLocation('/');
      },
    });
  };

  const navItems = [
    { label: 'Projects', href: '/crm', icon: Building2 },
    { label: 'RM Codes', href: '/crm/rm-codes', icon: Hash },
    { label: 'Activity Logs', href: '/crm/activity-logs', icon: Clock },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
          <div className="h-8 w-8 bg-sidebar-primary rounded flex items-center justify-center text-sidebar-primary-foreground font-bold font-mono">
            PF
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground uppercase tracking-wider text-sm">PlotFolio</h1>
            <p className="text-xs text-sidebar-foreground/60">Command Center</p>
          </div>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-1 px-3">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center font-medium">
              {session.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{session.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{session.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={logout.isPending}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
