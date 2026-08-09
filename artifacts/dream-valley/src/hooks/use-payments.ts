import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';

export interface Payment {
  id: number;
  plotId: number;
  amount: number;
  paymentMode: string;
  referenceNumber: string | null;
  paymentDate: string;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export interface PlotPayments {
  payments: Payment[];
  totalReceived: number;
}

export function paymentsQueryKey(plotId: number) {
  return ['/api/plots', plotId, 'payments'];
}

export function usePlotPayments(plotId: number) {
  return useQuery<PlotPayments>({
    queryKey: paymentsQueryKey(plotId),
    queryFn: () => customFetch<PlotPayments>(`/api/plots/${plotId}/payments`),
    enabled: !!plotId,
  });
}

export interface NewPaymentInput {
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  paymentDate: string;
  notes?: string;
}

export function useAddPayment(plotId: number) {
  const queryClient = useQueryClient();
  return useMutation<Payment, any, NewPaymentInput>({
    mutationFn: (data) =>
      customFetch<Payment>(`/api/plots/${plotId}/payments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsQueryKey(plotId) });
    },
  });
}

export function useDeletePayment(plotId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, any, number>({
    mutationFn: (paymentId) =>
      customFetch<void>(`/api/payments/${paymentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsQueryKey(plotId) });
    },
  });
}
