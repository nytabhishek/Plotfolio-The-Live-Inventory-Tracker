import React from 'react';
import { Link } from 'wouter';
import { SalesLayout } from '@/layouts/sales-layout';
import { useProjects } from '@/hooks/use-projects';
import { usePlotEvents } from '@/hooks/use-plot-events';
import { Building2, ChevronRight } from 'lucide-react';

export default function SalesDashboard() {
  // Subscribe to live events
  usePlotEvents();

  const { data: projects, isLoading } = useProjects();

  return (
    <SalesLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Select a Project</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a project to view its live plot availability.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-card border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No projects available yet</p>
            <p className="text-sm mt-1">Ask your CRM admin to add a project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link key={project.id} href={`/sales/inventory/${project.id}`}>
                <div className="bg-card border rounded-xl shadow-sm p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="font-semibold text-foreground">{project.name}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SalesLayout>
  );
}
