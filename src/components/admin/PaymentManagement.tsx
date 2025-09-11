import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Check, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PaymentGatewayManagement } from './PaymentGatewayManagement';
import { supabase } from '@/integrations/supabase/client';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  status: string;
  description?: string;
  popular?: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  popular: boolean;
  credits_per_month: number;
  features: string[];
  description?: string;
  rank?: number;
}

const creditPackageSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  credits: z.coerce.number().int().positive({ message: "Credits must be positive." }),
  price: z.coerce.number().positive({ message: "Price must be positive." }),
  description: z.string().optional(),
  popular: z.boolean().optional(),
});

const subscriptionPlanSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  price: z.coerce.number().positive({ message: "Price must be positive." }),
  credits_per_month: z.coerce.number().int().positive({ message: "Credits per month must be positive." }),
  popular: z.boolean().optional(),
  description: z.string().optional(),
  rank: z.coerce.number().int().optional(),
  features: z.array(z.string()).optional(),
});


export const PaymentManagement = () => {
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddPackageDialogOpen, setIsAddPackageDialogOpen] = useState(false);
  const [isEditPackageDialogOpen, setIsEditPackageDialogOpen] = useState(false);
  const [isAddSubscriptionDialogOpen, setIsAddSubscriptionDialogOpen] = useState(false);
  const [isEditSubscriptionDialogOpen, setIsEditSubscriptionDialogOpen] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<CreditPackage | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionPlan | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'package' | 'plan' } | null>(null);

  const packageForm = useForm<z.infer<typeof creditPackageSchema>>({
    resolver: zodResolver(creditPackageSchema),
    defaultValues: { name: "", credits: 0, price: 0, description: "", popular: false },
  });

  const subscriptionForm = useForm<z.infer<typeof subscriptionPlanSchema>>({
    resolver: zodResolver(subscriptionPlanSchema),
    defaultValues: { name: "", price: 0, credits_per_month: 0, popular: false, description: "", rank: 0, features: [] },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: packages, error: packagesError } = await supabase.from('credit_packages').select('*');
      if (packagesError) throw packagesError;
      setCreditPackages(packages || []);

      const { data: plans, error: plansError } = await supabase.from('plans').select('*');
      if (plansError) throw plansError;
      setSubscriptionPlans(plans || []);
    } catch (error: any) {
      toast.error("Failed to load data", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderStatusLabel = (status: string) => {
    return (
      <Badge variant={status === 'active' ? 'default' : 'secondary'}>
        {status}
      </Badge>
    );
  };

  function handleAddPackage() {
    packageForm.reset({ name: "", credits: 0, price: 0, description: "", popular: false });
    setIsAddPackageDialogOpen(true);
  }

  function handleEditPackage(pkg: CreditPackage) {
    setCurrentPackage(pkg);
    packageForm.reset(pkg);
    setIsEditPackageDialogOpen(true);
  }

  async function handleTogglePackageStatus(packageId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('credit_packages').update({ status: newStatus }).eq('id', packageId);
    if (error) {
      toast.error("Failed to update status", { description: error.message });
    } else {
      toast.success("Package status updated successfully");
      fetchData();
    }
  }

  async function onSubmitAddPackage(values: z.infer<typeof creditPackageSchema>) {
    const { error } = await supabase.from('credit_packages').insert([values]);
    if (error) {
      toast.error("Failed to add package", { description: error.message });
    } else {
      toast.success("Credit package added successfully");
      fetchData();
      setIsAddPackageDialogOpen(false);
    }
  }

  async function onSubmitEditPackage(values: z.infer<typeof creditPackageSchema>) {
    if (!currentPackage) return;
    const { error } = await supabase.from('credit_packages').update(values).eq('id', currentPackage.id);
    if (error) {
      toast.error("Failed to update package", { description: error.message });
    } else {
      toast.success("Credit package updated successfully");
      fetchData();
      setIsEditPackageDialogOpen(false);
    }
  }

  function handleAddSubscription() {
    subscriptionForm.reset({ name: "", price: 0, credits_per_month: 0, popular: false, description: "", rank: 0, features: [] });
    setIsAddSubscriptionDialogOpen(true);
  }

  function handleEditSubscription(plan: SubscriptionPlan) {
    setCurrentSubscription(plan);
    subscriptionForm.reset(plan);
    setIsEditSubscriptionDialogOpen(true);
  }

  async function onSubmitAddSubscription(values: z.infer<typeof subscriptionPlanSchema>) {
    const { error } = await supabase.from('plans').insert([values]);
    if (error) {
      toast.error("Failed to add plan", { description: error.message });
    } else {
      toast.success("Subscription plan added successfully");
      fetchData();
      setIsAddSubscriptionDialogOpen(false);
    }
  }

  async function onSubmitEditSubscription(values: z.infer<typeof subscriptionPlanSchema>) {
    if (!currentSubscription) return;
    const { error } = await supabase.from('plans').update(values).eq('id', currentSubscription.id);
    if (error) {
      toast.error("Failed to update plan", { description: error.message });
    } else {
      toast.success("Subscription plan updated successfully");
      fetchData();
      setIsEditSubscriptionDialogOpen(false);
    }
  }

  const handleDeleteRequest = (id: string, type: 'package' | 'plan') => {
    setItemToDelete({ id, type });
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;

    const { id, type } = itemToDelete;
    const fromTable = type === 'package' ? 'credit_packages' : 'plans';

    const { error } = await supabase.from(fromTable).delete().eq('id', id);

    if (error) {
      toast.error(`Failed to delete ${type}`, { description: error.message });
    } else {
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
      fetchData();
    }
    setItemToDelete(null);
  };

  return (
    <div className="space-y-8">
      {/* Payment Gateway Settings */}
      <PaymentGatewayManagement />

      {/* Credit Packages Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Credit Packages</h2>
          <Button onClick={handleAddPackage}>Add New Package</Button>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
              ) : (
                creditPackages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>{pkg.credits}</TableCell>
                    <TableCell>${pkg.price.toFixed(2)}</TableCell>
                    <TableCell>{renderStatusLabel(pkg.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPackage(pkg)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePackageStatus(pkg.id, pkg.status)}
                          className={pkg.status === 'active' ? 'text-yellow-600' : 'text-green-600'}
                        >
                          {pkg.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRequest(pkg.id, 'package')}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Subscription Plans Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Subscription Plans</h2>
          <Button onClick={handleAddSubscription}>Add New Plan</Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {loading ? (
            <p>Loading plans...</p>
          ) : (
            subscriptionPlans.map((plan) => (
              <Card key={plan.id} className={`flex flex-col ${plan.popular ? "border-melody-secondary" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-melody-secondary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description || 'Monthly subscription'}</CardDescription>
                  <div className="text-3xl font-bold">${plan.price}<span className="text-sm text-muted-foreground font-normal">/month</span></div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 fill-melody-secondary text-melody-secondary" />
                    <span className="font-medium">{plan.credits_per_month} credits monthly</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features?.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-melody-secondary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleEditSubscription(plan)}
                  >
                    Edit Plan
                  </Button>
                   <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteRequest(plan.id, 'plan')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected {itemToDelete?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Package Dialog */}
      <Dialog open={isAddPackageDialogOpen || isEditPackageDialogOpen} onOpenChange={isEditPackageDialogOpen ? setIsEditPackageDialogOpen : setIsAddPackageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditPackageDialogOpen ? 'Edit' : 'Add'} Credit Package</DialogTitle>
            <DialogDescription>
              {isEditPackageDialogOpen ? 'Modify the details of this credit package.' : 'Create a new one-time purchase credit package.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...packageForm}>
            <form onSubmit={packageForm.handleSubmit(isEditPackageDialogOpen ? onSubmitEditPackage : onSubmitAddPackage)} className="space-y-4">
              <FormField control={packageForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Package Name</FormLabel><FormControl><Input {...field} placeholder="e.g. Basic Pack" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={packageForm.control} name="credits" render={({ field }) => (<FormItem><FormLabel>Credits</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={packageForm.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={packageForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={packageForm.control} name="popular" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Mark as Popular</FormLabel></div></FormItem>)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => isEditPackageDialogOpen ? setIsEditPackageDialogOpen(false) : setIsAddPackageDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{isEditPackageDialogOpen ? 'Save Changes' : 'Add Package'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Subscription Dialog */}
      <Dialog open={isAddSubscriptionDialogOpen || isEditSubscriptionDialogOpen} onOpenChange={isEditSubscriptionDialogOpen ? setIsEditSubscriptionDialogOpen : setIsAddSubscriptionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditSubscriptionDialogOpen ? 'Edit' : 'Add'} Subscription Plan</DialogTitle>
            <DialogDescription>{isEditSubscriptionDialogOpen ? 'Modify the details of this subscription plan.' : 'Create a new monthly subscription plan.'}</DialogDescription>
          </DialogHeader>
          <Form {...subscriptionForm}>
            <form onSubmit={subscriptionForm.handleSubmit(isEditSubscriptionDialogOpen ? onSubmitEditSubscription : onSubmitAddSubscription)} className="space-y-4">
              <FormField control={subscriptionForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input {...field} placeholder="e.g. Premium" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={subscriptionForm.control} name="price" render={({ field }) => (<FormItem><FormLabel>Monthly Price ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={subscriptionForm.control} name="credits_per_month" render={({ field }) => (<FormItem><FormLabel>Credits Per Month</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={subscriptionForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={subscriptionForm.control} name="rank" render={({ field }) => (<FormItem><FormLabel>Rank</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={subscriptionForm.control} name="popular" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Mark as Popular</FormLabel></div></FormItem>)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => isEditSubscriptionDialogOpen ? setIsEditSubscriptionDialogOpen(false) : setIsAddSubscriptionDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{isEditSubscriptionDialogOpen ? 'Save Changes' : 'Add Plan'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
