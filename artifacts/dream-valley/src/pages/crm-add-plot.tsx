import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreatePlot, PlotInputPlotFacing, PlotInputPlcType, PlotInputStatus, getGetPlotsQueryKey, getGetPlotStatsQueryKey } from '@workspace/api-client-react';
import { useProjects } from '@/hooks/use-projects';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { CrmLayout } from '@/layouts/crm-layout';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const plotSchema = z.object({
  plotNumber: z.string().min(1, 'Plot number is required'),
  projectId: z.coerce.number().min(1, 'Project is required'),
  widthMtr: z.coerce.number().min(0.01, 'Must be positive'),
  lengthMtr: z.coerce.number().min(0.01, 'Must be positive'),
  areaSqMtr: z.coerce.number().min(0.01, 'Must be positive'),
  areaSqYrd: z.coerce.number().min(0.01, 'Must be positive'),
  plotFacing: z.nativeEnum(PlotInputPlotFacing),
  plcType: z.nativeEnum(PlotInputPlcType),
  status: z.nativeEnum(PlotInputStatus)
});

export default function CrmAddPlot() {
  const createPlot = useCreatePlot();
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof plotSchema>>({
    resolver: zodResolver(plotSchema),
    defaultValues: {
      plotNumber: '',
      projectId: 0,
      widthMtr: 0,
      lengthMtr: 0,
      areaSqMtr: 0,
      areaSqYrd: 0,
      plotFacing: PlotInputPlotFacing.East,
      plcType: PlotInputPlcType.Non_PLC,
      status: PlotInputStatus.Available
    }
  });

  // Helper to auto-calculate areas
  const calculateAreas = () => {
    const width = form.getValues('widthMtr');
    const length = form.getValues('lengthMtr');
    if (width > 0 && length > 0) {
      const sqMtr = width * length;
      const sqYrd = sqMtr * 1.19599;
      form.setValue('areaSqMtr', Number(sqMtr.toFixed(2)));
      form.setValue('areaSqYrd', Number(sqYrd.toFixed(2)));
    }
  };

  const onSubmit = (data: z.infer<typeof plotSchema>) => {
    createPlot.mutate({ data: data as any }, {
      onSuccess: () => {
        toast({ title: 'Plot Created', description: `Plot ${data.plotNumber} added to inventory.` });
        queryClient.invalidateQueries({ queryKey: getGetPlotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlotStatsQueryKey() });
        setLocation('/crm');
      },
      onError: (err) => {
        toast({ title: 'Failed to create plot', description: err.error, variant: 'destructive' });
      }
    });
  };

  return (
    <CrmLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Plot</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter specifications to register a new plot in the inventory.</p>
        </div>

        <div className="bg-card border rounded-xl shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="plotNumber"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Plot Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. A-101" className="uppercase font-mono font-medium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Project</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={field.value ? String(field.value) : undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects?.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} disabled={p.plotCount >= p.maxPlots}>
                              {p.name} ({p.plotCount}/{p.maxPlots})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Initial Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(PlotInputStatus).map(val => (
                            <SelectItem key={val} value={val}>{val}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold mb-4">Dimensions (Meters)</h3>
                </div>

                <FormField
                  control={form.control}
                  name="widthMtr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Width</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => { field.onChange(e); calculateAreas(); }} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lengthMtr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Length</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => { field.onChange(e); calculateAreas(); }} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="areaSqMtr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Area (SQ MTR)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="font-mono bg-muted/30" readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="areaSqYrd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Area (SQ YRD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="font-mono bg-muted/30" readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold mb-4">Properties</h3>
                </div>

                <FormField
                  control={form.control}
                  name="plotFacing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Facing</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(PlotInputPlotFacing).map(val => (
                            <SelectItem key={val} value={val}>{val}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plcType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">PLC Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(PlotInputPlcType).map(val => (
                            <SelectItem key={val} value={val}>{val}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-6 border-t flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setLocation('/crm')}>Cancel</Button>
                <Button type="submit" disabled={createPlot.isPending} className="font-semibold uppercase tracking-wider">
                  {createPlot.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Register Plot
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </CrmLayout>
  );
}
