import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';

export interface Project {
  id: number;
  name: string;
  maxPlots: number;
  plotCount: number;
  createdAt: string;
}

export const PROJECTS_QUERY_KEY = ['/api/projects'];

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: () => customFetch<Project[]>('/api/projects'),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<Project, any, { name: string; maxPlots?: number }>({
    mutationFn: (data) =>
      customFetch<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useRenameProject() {
  const queryClient = useQueryClient();
  return useMutation<Project, any, { id: number; name: string }>({
    mutationFn: ({ id, name }) =>
      customFetch<Project>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}
