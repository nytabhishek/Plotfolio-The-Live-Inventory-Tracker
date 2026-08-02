import React, { useState } from 'react';
import { Link } from 'wouter';
import { CrmLayout } from '@/layouts/crm-layout';
import { useProjects, useCreateProject, useRenameProject } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Building2, Pencil, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_PROJECTS = 5;

export default function CrmDashboard() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const renameProject = useRenameProject();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [maxPlots, setMaxPlots] = useState('200');

  const [renameTarget, setRenameTarget] = useState<{ id: number; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const atLimit = (projects?.length ?? 0) >= MAX_PROJECTS;

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: 'Project name is required', variant: 'destructive' });
      return;
    }
    createProject.mutate(
      { name: name.trim(), maxPlots: Number(maxPlots) || 200 },
      {
        onSuccess: () => {
          toast({ title: 'Project created', description: `${name} has been added.` });
          setName('');
          setMaxPlots('200');
          setAddOpen(false);
        },
        onError: (err: any) => {
          toast({ title: 'Failed to create project', description: err?.data?.error ?? err.message, variant: 'destructive' });
        },
      },
    );
  };

  const openRename = (e: React.MouseEvent, project: { id: number; name: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setRenameTarget(project);
    setRenameValue(project.name);
  };

  const handleRename = () => {
    if (!renameTarget || !renameValue.trim()) return;
    renameProject.mutate(
      { id: renameTarget.id, name: renameValue.trim() },
      {
        onSuccess: () => {
          toast({ title: 'Project renamed' });
          setRenameTarget(null);
        },
        onError: (err: any) => {
          toast({ title: 'Failed to rename project', description: err?.data?.error ?? err.message, variant: 'destructive' });
        },
      },
    );
  };

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select a project to manage its inventory.
            </p>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button disabled={atLimit} className="gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Project Name</Label>
                  <Input
                    placeholder="e.g. Green Meadows Phase 2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Plot Capacity</Label>
                  <Input
                    type="number"
                    value={maxPlots}
                    onChange={(e) => setMaxPlots(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createProject.isPending}>
                  {createProject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {atLimit && (
          <div className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3">
            You've reached the maximum of {MAX_PROJECTS} projects.
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-card border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm mt-1">Create your first project to start adding plots.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const pct = Math.min(100, Math.round((project.plotCount / project.maxPlots) * 100));
              return (
                <Link key={project.id} href={`/crm/inventory/${project.id}`}>
                  <div className="bg-card border rounded-xl shadow-sm p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{project.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {project.plotCount} / {project.maxPlots} plots
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => openRename(e, project)}
                          className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Rename project"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Project Name</Label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={renameProject.isPending}>
              {renameProject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CrmLayout>
  );
}
