import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import LoginPage from '@/pages/login';
import CrmDashboard from '@/pages/crm-dashboard';
import CrmProjects from '@/pages/crm-projects';
import CrmAddPlot from '@/pages/crm-add-plot';
import CrmRmCodes from '@/pages/crm-rm-codes';
import CrmActivityLogs from '@/pages/crm-activity-logs';
import SalesDashboard from '@/pages/sales-dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Never retry 401/403 — they are auth errors, not transient failures
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/crm" component={CrmDashboard} />
      <Route path="/crm/projects" component={CrmProjects} />
      <Route path="/crm/add-plot" component={CrmAddPlot} />
      <Route path="/crm/rm-codes" component={CrmRmCodes} />
      <Route path="/crm/activity-logs" component={CrmActivityLogs} />
      <Route path="/sales" component={SalesDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
