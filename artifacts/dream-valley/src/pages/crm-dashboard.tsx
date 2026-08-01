import React, { useState } from 'react';
import { useGetPlots, useGetPlotStats, useDeletePlot, getGetPlotsQueryKey, getGetPlotStatsQueryKey, Plot } from '@workspace/api-client-react';
import { useProjects } from '@/hooks/use-projects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CrmLayout } from '@/layouts/crm-layout';
import { usePlotEvents } from '@/hooks/use-plot-events';
import { Loader2, Download, Search, Edit2, Trash2, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge, PlcBadge } from '@/components/badges';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditPlotDialog } from '@/components/edit-plot-dialog';

export default function CrmDashboard() {
  // Subscribe to live events
  usePlotEvents();
  
  const { data: stats, isLoading: statsLoading } = useGetPlotStats();
  const { data: plots, isLoading: plotsLoading } = useGetPlots();
  const { data: projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [plotToDelete, setPlotToDelete] = useState<number | null>(null);
  const [plotToEdit, setPlotToEdit] = useState<Plot | null>(null);
  
  const deletePlot = useDeletePlot();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleExport = () => {
    window.location.href = import.meta.env.BASE_URL + 'api/plots/export';
  };

  const handleDelete = () => {
    if (plotToDelete) {
      deletePlot.mutate({ id: plotToDelete }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPlotsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetPlotStatsQueryKey() });
          toast({ title: 'Plot deleted', description: 'The plot has been removed from inventory.' });
          setPlotToDelete(null);
        },
        onError: (err) => {
          toast({ title: 'Error', description: err.error, variant: 'destructive' });
          setPlotToDelete(null);
        }
      });
    }
  };

  const filteredPlots = plots?.filter(p => {
    if (selectedProjectId !== 'all' && String((p as any).projectId) !== selectedProjectId) return false;
    return p.plotNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Live overview of all plots and their current status.</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2 font-semibold">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-card border rounded-xl animate-pulse" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Plots</div>
              <div className="text-3xl font-bold text-foreground font-mono">{stats.total}</div>
            </div>
            <div className="bg-card border rounded-xl p-5 shadow-sm border-l-4 border-l-green-500">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Available</div>
              <div className="text-3xl font-bold text-green-700 font-mono">{stats.available}</div>
            </div>
            <div className="bg-card border rounded-xl p-5 shadow-sm border-l-4 border-l-primary">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Unavailable</div>
              <div className="text-3xl font-bold text-primary font-mono">{stats.allotted + stats.freeze + stats.hold}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                Allotted: {stats.allotted} | Freeze: {stats.freeze} | Hold: {stats.hold}
              </div>
            </div>
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">PLC / Non-PLC</div>
              <div className="text-3xl font-bold text-foreground font-mono">{stats.plc} <span className="text-lg text-muted-foreground">/ {stats.nonPlc}</span></div>
            </div>
          </div>
        ) : null}

        {/* Filters & Table */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-4">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search plot number..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background h-9"
              />
            </div>
            <div className="w-56 shrink-0">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/40 uppercase text-xs font-semibold text-muted-foreground tracking-wider border-b">
                <tr>
                  <th className="px-6 py-4">Plot No.</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Area (SQ YRD)</th>
                  <th className="px-6 py-4">Facing</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plotsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : filteredPlots?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <Map className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      No plots found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPlots?.map(plot => (
                    <tr key={plot.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-3 font-semibold text-foreground">{plot.plotNumber}</td>
                      <td className="px-6 py-3"><StatusBadge status={plot.status} /></td>
                      <td className="px-6 py-3"><PlcBadge type={plot.plcType} /></td>
                      <td className="px-6 py-3 text-right font-mono">{plot.areaSqYrd.toFixed(2)}</td>
                      <td className="px-6 py-3">{plot.plotFacing}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setPlotToEdit(plot)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setPlotToDelete(plot.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AlertDialog open={!!plotToDelete} onOpenChange={(open) => !open && setPlotToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the plot from the inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePlot.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deletePlot.isPending} className="bg-destructive hover:bg-destructive/90">
              {deletePlot.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Plot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {plotToEdit && (
        <EditPlotDialog 
          plot={plotToEdit} 
          open={!!plotToEdit} 
          onOpenChange={(open) => !open && setPlotToEdit(null)} 
        />
      )}
    </CrmLayout>
  );
}
