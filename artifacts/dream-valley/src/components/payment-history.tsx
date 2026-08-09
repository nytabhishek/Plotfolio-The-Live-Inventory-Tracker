import React, { useState } from 'react';
import { usePlotPayments, useAddPayment, useDeletePayment } from '@/hooks/use-payments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, IndianRupee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PAYMENT_MODES = ['Cash', 'Cheque', 'RTGS', 'NEFT', 'UPI', 'Card', 'Other'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

interface PaymentHistoryProps {
  plotId: number;
}

export function PaymentHistory({ plotId }: PaymentHistoryProps) {
  const { data, isLoading } = usePlotPayments(plotId);
  const addPayment = useAddPayment(plotId);
  const deletePayment = useDeletePayment(plotId);
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('RTGS');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));

  const needsReference = mode !== 'Cash';

  const handleAdd = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    if (needsReference && !referenceNumber.trim()) {
      toast({ title: `${mode} reference / UTR number is required`, variant: 'destructive' });
      return;
    }
    addPayment.mutate(
      { amount: amt, paymentMode: mode, referenceNumber: referenceNumber.trim() || undefined, paymentDate },
      {
        onSuccess: () => {
          toast({ title: 'Payment recorded', description: `${formatAmount(amt)} via ${mode}` });
          setAmount('');
          setReferenceNumber('');
          setShowForm(false);
        },
        onError: (err: any) => {
          toast({ title: 'Failed to record payment', description: err?.data?.error ?? err.message, variant: 'destructive' });
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    deletePayment.mutate(id, {
      onSuccess: () => toast({ title: 'Payment entry removed' }),
    });
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
        {!showForm && (
          <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Payment
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2 py-3">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading payments...
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3 bg-muted/30 rounded-lg px-3 py-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Total Received: {formatAmount(data?.totalReceived ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {data?.payments.length ?? 0} payment{data?.payments.length === 1 ? '' : 's'}
            </span>
          </div>

          {data?.payments.length ? (
            <div className="space-y-2 mb-3">
              {data.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2 bg-background">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{formatAmount(p.amount)} <span className="text-muted-foreground font-normal">· {p.paymentMode}</span></span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(p.paymentDate)}
                      {p.referenceNumber ? ` · Ref: ${p.referenceNumber}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    disabled={deletePayment.isPending}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : !showForm ? (
            <p className="text-sm text-muted-foreground mb-3">No payments recorded yet.</p>
          ) : null}
        </>
      )}

      {showForm && (
        <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-1">Amount</label>
              <Input type="number" step="0.01" placeholder="e.g. 500000" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-1">Mode</label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-1">
                {mode === 'Cheque' ? 'Cheque No.' : mode === 'Cash' ? 'Reference (optional)' : `${mode} / UTR No.`}
              </label>
              <Input placeholder={mode === 'Cash' ? 'Optional' : 'Reference number'} value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-1">Date</label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={handleAdd} disabled={addPayment.isPending}>
              {addPayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Payment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
