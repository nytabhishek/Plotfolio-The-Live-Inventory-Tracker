import React from 'react';
import { useLoginCrm, useLoginRm, useGetMe } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, useLocation } from 'wouter';
import { Building2, KeyRound, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const crmSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const salesSchema = z.object({
  rmCode: z.string().min(1, 'RM Code is required')
});

export default function LoginPage() {
  const { data: session, isLoading: sessionLoading } = useGetMe();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const crmLogin = useLoginCrm();
  const salesLogin = useLoginRm();

  const crmForm = useForm<z.infer<typeof crmSchema>>({
    resolver: zodResolver(crmSchema),
    defaultValues: { email: '', password: '' }
  });

  const salesForm = useForm<z.infer<typeof salesSchema>>({
    resolver: zodResolver(salesSchema),
    defaultValues: { rmCode: '' }
  });

  if (sessionLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (session) {
    return <Redirect to={session.type === 'crm' ? '/crm' : '/sales'} />;
  }

  const onCrmSubmit = (data: z.infer<typeof crmSchema>) => {
    crmLogin.mutate({ data }, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        setLocation('/crm');
      },
      onError: (err) => {
        toast({ title: 'Login Failed', description: err.error, variant: 'destructive' });
      }
    });
  };

 const onSalesSubmit = (data: z.infer<typeof salesSchema>) => {
    salesLogin.mutate({ data }, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        setLocation('/sales');
      },
      onError: (err) => {
        toast({ title: 'Login Failed', description: err.error, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-6 shadow-md">
            <Building2 className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Dream Valley</h1>
          <p className="text-muted-foreground mt-2">Live Inventory Tracker</p>
        </div>

        <div className="bg-card border shadow-sm rounded-xl overflow-hidden">
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="w-full grid grid-cols-2 rounded-none border-b h-14 bg-transparent p-0">
              <TabsTrigger value="sales" className="rounded-none data-[state=active]:bg-primary/5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-full text-sm font-semibold tracking-wide uppercase">
                Sales Login
              </TabsTrigger>
              <TabsTrigger value="crm" className="rounded-none data-[state=active]:bg-primary/5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-full text-sm font-semibold tracking-wide uppercase">
                CRM Admin
              </TabsTrigger>
            </TabsList>
            
            <div className="p-8">
              <TabsContent value="sales" className="mt-0">
                <Form {...salesForm}>
                  <form onSubmit={salesForm.handleSubmit(onSalesSubmit)} className="space-y-6">
                    <FormField
                      control={salesForm.control}
                      name="rmCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">RM Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. RM001" {...field} className="font-mono uppercase text-lg h-12" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-12 text-sm font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground" disabled={salesLogin.isPending}>
                      {salesLogin.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <KeyRound className="h-5 w-5 mr-2" />}
                      Access Dashboard
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="crm" className="mt-0">
                <Form {...crmForm}>
                  <form onSubmit={crmForm.handleSubmit(onCrmSubmit)} className="space-y-4">
                    <FormField
                      control={crmForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="admin@dreamvalley.com" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={crmForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="pt-2">
                      <Button type="submit" className="w-full h-12 text-sm font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground" disabled={crmLogin.isPending}>
                        {crmLogin.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                        Secure Login
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        <div className="mt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Dream Valley Properties. Authorized Personnel Only.
        </div>
      </div>
    </div>
  );
}
