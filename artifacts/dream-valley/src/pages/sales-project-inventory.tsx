import React, { useState } from 'react';
import { Link, useParams } from 'wouter';
import { useGetPlots, PlotPlotFacing, PlotPlcType, PlotStatus } from '@workspace/api-client-react';
import { useProjects } from '@/hooks/use-projects';
import { SalesLayout } from '@/layouts/sales-layout';
import { usePlotEvents } from '@/hooks/use-plot-events';
import { Loader2, Search, Map, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlcBadge } from '@/components/badges';

export default function SalesProjectInventory() {
  // Subscribe to live events
  usePlotEvents();

  const { projectId } = useParams<{ projectId: string }>();
  const { data: projects } = useProjects();
  const project = projects?.find((p) => String(p.id) === projectId);

  const [searchTerm, setSearchTerm] = useState('');
  const [plcFilter, setPlcFilter] = useState<string>('All');
  const [facingFilter, setFacingFilter] = useState<string>('All');
  const [minArea, setMinArea] = useState<string>('');
  const [maxArea, setMaxArea] = useState<string>('');

  const { data: plots, isLoading } = useGetPlots({ status: PlotStatus.Available });

  const filteredPlots = plots?.filter(p => {
    if (String((p as any).projectId) !== projectId) return false;
    if (searchTerm && !p.plotNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (plcFilter !== 'All' && p.plcType !== plcFilter) return false;
    if (facingFilter !== 'All' && p.plotFacing !== facingFilter) return false;

    if (minArea && p.areaSqYrd < parseFloat(minArea)) return false;
    if (maxArea && p.areaSqYrd > parseFloat(maxArea)) return false;

    return true;
  });

  return (
    <SalesLayout>
      <div className="space-y-6">

        <div>
          <Link href="/sales" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <h1 className="text-xl font-bold text-foreground">{project?.name ?? 'Inventory'}</h1>
        </div>

        {/* Filters Header */}
        <div className="bg-card border shadow-sm rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Plot Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 font-mono"
              />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
              <div className="w-36 shrink-0">
                <Select value={plcFilter} onValueChange={setPlcFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="PLC Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Types</SelectItem>
                    <SelectItem value={PlotPlcType.PLC}>PLC</SelectItem>
                    <SelectItem value={PlotPlcType.Non_PLC}>Non PLC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40 shrink-0">
                <Select value={facingFilter} onValueChange={setFacingFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Facing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Facings</SelectItem>
                    {Object.values(PlotPlotFacing).map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 shrink-0 border rounded-md px-2 bg-background h-10">
                <Input
                  type="number"
                  placeholder="Min YRD"
                  value={minArea}
                  onChange={(e) => setMinArea(e.target.value)}
                  className="w-20 h-7 text-xs border-0 shadow-none px-1"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <Input
                  type="number"
                  placeholder="Max YRD"
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value)}
                  className="w-20 h-7 text-xs border-0 shadow-none px-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Available Inventory</h2>
            <span className="text-sm text-muted-foreground font-medium bg-muted/50 px-3 py-1 rounded-full">
              {filteredPlots?.length || 0} Results
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-card border rounded-xl h-40 animate-pulse" />
              ))}
            </div>
          ) : filteredPlots?.length === 0 ? (
            <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
              <Map className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No available plots found</p>
              <p className="text-sm mt-1">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlots?.map(plot => (
                <div key={plot.id} className="bg-card border rounded-xl shadow-sm overflow-hidden hover:border-primary/50 transition-colors group">
                  <div className="p-4 border-b bg-muted/10 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Plot Number</div>
                      <div className="text-xl font-bold font-mono text-foreground group-hover:text-primary transition-colors">{plot.plotNumber}</div>
                    </div>
                    <PlcBadge type={plot.plcType} />
                  </div>
                  <div className="p-4 bg-background">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Area (SQ YRD)</div>
                        <div className="font-mono font-medium text-foreground mt-0.5">{plot.areaSqYrd.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Facing</div>
                        <div className="font-medium text-foreground mt-0.5">{plot.plotFacing}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Dimensions (MTR)</div>
                        <div className="font-mono text-sm text-foreground mt-0.5">{plot.widthMtr} × {plot.lengthMtr}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Area (SQ MTR)</div>
                        <div className="font-mono text-sm text-foreground mt-0.5">{plot.areaSqMtr.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </SalesLayout>
  );
}
