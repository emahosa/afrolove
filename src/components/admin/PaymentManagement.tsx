import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Check } from 'lucide-react';
import { toast } from 'sonner';
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
import { Textarea } from '../ui/textarea';

// Database-driven types
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  popular: boolean;
  active: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  popular: boolean;
  credits_per_month: number;
  features: string[];
  description: string;
  active: boolean;
  rank: number;
  interval: string;
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
  description: z.string().optional(),
  features: z.string().transform(val => val.split(',').map(s => s.trim())),
  popular: z.boolean().optional(),
  rank: z.coerce.number().int(),
  interval: z.string().min(1, { message: "Interval is required (e.g., 'month')." }),
});

export const PaymentManagement = () => {
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddPackageDialogOpen, setIsAddPackageDialogOpen] = useState(false);
  const [isEditPackageDialogOpen, setIsEditPackageDialogOpen] = useState(false);
  const [isAddSubscriptionDialogOpen, setIsAddSubscriptionDialogOpen] = useState(false);
  const [isEditSubscriptionDialogOpen, setIsEditSubscriptionDialogOpen] = useState(false);

  const [currentPackage, setCurrentPackage] = useState<CreditPackage | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionPlan | null>(null);

  const packageForm = useForm<z.infer<typeof creditPackageSchema>>({
    resolver: zodResolver(creditPackageSchema),
    defaultValues: { name: "", credits: 0, price: 0, description: "", popular: false },
  });

  const subscriptionForm = useForm<z.infer<typeof subscriptionPlanSchema>>({
    resolver: zodResolver(subscriptionPlanSchema),
    defaultValues: { name: "", price: 0, credits_per_month: 0, description: "", features: [], popular: false, rank: 0, interval: 'month' },
  });

  const fetchPackages = useCallback(async () => {
    const { data, error } = await supabase.from('credit_packages').select('*').order('price', { ascending: true });
    if (error) {
      toast.error("Failed to fetch credit packages.", { description: error.message });
    } else {
      setCreditPackages(data || []);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase.from('plans').select('*').order('rank', { ascending: true });
    if (error) {
      toast.error("Failed to fetch subscription plans.", { description: error.message });
    } else {
      setSubscriptionPlans(data || []);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchPackages(), fetchPlans()]).then(() => {
      setIsLoading(false);
    });
  }, [fetchPackages, fetchPlans]);

  const renderStatusLabel = (status: boolean) => (
    <Badge variant={status ? 'default' : 'secondary'}>
      {status ? 'Active' : 'Inactive'}
    </Badge>
  );

  function handleAddPackage() {
    packageForm.reset({ name: "", credits: 0, price: 0, description: "", popular: false });
    setIsAddPackageDialogOpen(true);
  }

  function handleEditPackage(pkg: CreditPackage) {
    setCurrentPackage(pkg);
    packageForm.reset({
      name: pkg.name,
      credits: pkg.credits,
      price: pkg.price,
      description: pkg.description,
      popular: pkg.popular,
    });
    setIsEditPackageDialogOpen(true);
  }

  async function handleTogglePackageStatus(pkg: CreditPackage) {
    const { error } = await supabase
      .from('credit_packages')
      .update({ active: !pkg.active })
      .eq('id', pkg.id);

    if (error) {
      toast.error(`Failed to ${pkg.active ? 'disable' : 'enable'} package.`, { description: error.message });
    } else {
      toast.success(`Package ${pkg.name} ${pkg.active ? 'disabled' : 'enabled'}.`);
      fetchPackages();
    }
  }

  async function onSubmitAddPackage(values: z.infer<typeof creditPackageSchema>) {
    const { error } = await supabase.from('credit_packages').insert([{ ...values }]);
    if (error) {
      toast.error("Failed to add new package.", { description: error.message });
    } else {
      toast.success(`New credit package "${values.name}" added successfully.`);
      fetchPackages();
      setIsAddPackageDialogOpen(false);
    }
  }

  async function onSubmitEditPackage(values: z.infer<typeof creditPackageSchema>) {
    if (currentPackage) {
      const { error } = await supabase
        .from('credit_packages')
        .update({ ...values })
        .eq('id', currentPackage.id);

      if (error) {
        toast.error(`Failed to update package.`, { description: error.message });
      } else {
        toast.success(`Credit package "${values.name}" updated successfully.`);
        fetchPackages();
        setIsEditPackageDialogOpen(false);
      }
    }
  }

  function handleAddSubscription() {
    subscriptionForm.reset({ name: "", price: 0, credits_per_month: 0, description: "", features: [], popular: false, rank: 0, interval: 'month' });
    setIsAddSubscriptionDialogOpen(true);
  }

  function handleEditSubscription(plan: SubscriptionPlan) {
    setCurrentSubscription(plan);
    subscriptionForm.reset({
      name: plan.name,
      price: plan.price,
      credits_per_month: plan.credits_per_month,
      description: plan.description,
      features: plan.features.join(', '),
      popular: plan.popular,
      rank: plan.rank,
      interval: plan.interval,
    });
    setIsEditSubscriptionDialogOpen(true);
  }

  async function onSubmitAddSubscription(values: z.infer<typeof subscriptionPlanSchema>) {
    const { error } = await supabase.from('plans').insert([{ ...values }]);
    if (error) {
      toast.error("Failed to add new plan.", { description: error.message });
    } else {
      toast.success(`New subscription plan "${values.name}" added successfully.`);
      fetchPlans();
      setIsAddSubscriptionDialogOpen(false);
    }
  }

  async function onSubmitEditSubscription(values: z.infer<typeof subscriptionPlanSchema>) {
    if (currentSubscription) {
      const { error } = await supabase
        .from('plans')
        .update({ ...values })
        .eq('id', currentSubscription.id);

      if (error) {
        toast.error(`Failed to update plan.`, { description: error.message });
      } else {
        toast.success(`Subscription plan "${values.name}" updated successfully.`);
        fetchPlans();
        setIsEditSubscriptionDialogOpen(false);
      }
    }
  }

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
              {creditPackages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>{pkg.credits}</TableCell>
                  <TableCell>${pkg.price ? pkg.price.toFixed(2) : '0.00'}</TableCell>
                  <TableCell>{renderStatusLabel(pkg.active)}</TableCell>
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
                        onClick={() => handleTogglePackageStatus(pkg)}
                        className={pkg.active ? 'text-red-600' : 'text-green-600'}
                      >
                        {pkg.active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
          {subscriptionPlans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col ${plan.popular ? "border-dark-purple" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-dark-purple">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="text-3xl font-bold">${plan.price}<span className="text-sm text-muted-foreground font-normal">/{plan.interval}</span></div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 fill-dark-purple text-dark-purple" />
                  <span className="font-medium">{plan.credits_per_month} credits monthly</span>
                </div>
                <ul className="space-y-2">
                  {plan.features && plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-dark-purple flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleEditSubscription(plan)}
                >
                  Edit Plan
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Package Dialog */}
      <Dialog open={isAddPackageDialogOpen} onOpenChange={setIsAddPackageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Credit Package</DialogTitle>
            <DialogDescription>
              Create a new one-time purchase credit package.
            </DialogDescription>
          </DialogHeader>
          <Form {...packageForm}>
            <form onSubmit={packageForm.handleSubmit(onSubmitAddPackage)} className="space-y-4">
              <FormField control={packageForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Package Name</FormLabel> <FormControl> <Input {...field} placeholder="e.g. Basic Pack" /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={packageForm.control} name="credits" render={({ field }) => ( <FormItem> <FormLabel>Credits</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={packageForm.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Price ($)</FormLabel> <FormControl> <Input type="number" step="0.01" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={packageForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Input {...field} placeholder="e.g. Best for starters" /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={packageForm.control} name="popular" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"> <FormControl> <Checkbox checked={field.value} onCheckedChange={field.onChange} /> </FormControl> <div className="space-y-1 leading-none"> <FormLabel>Mark as Popular</FormLabel> <p className="text-sm text-muted-foreground">This package will be highlighted.</p> </div> </FormItem> )}/>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddPackageDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Package</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog open={isEditPackageDialogOpen} onOpenChange={setIsEditPackageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Credit Package</DialogTitle>
            <DialogDescription>
              Modify the details of this credit package.
            </DialogDescription>
          </DialogHeader>
          <Form {...packageForm}>
            <form onSubmit={packageForm.handleSubmit(onSubmitEditPackage)} className="space-y-4">
              <FormField control={packageForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Package Name</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={packageForm.control} name="credits" render={({ field }) => ( <FormItem> <FormLabel>Credits</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={packageForm.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Price ($)</FormLabel> <FormControl> <Input type="number" step="0.01" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={packageForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={packageForm.control} name="popular" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"> <FormControl> <Checkbox checked={field.value} onCheckedChange={field.onChange} /> </FormControl> <div className="space-y-1 leading-none"> <FormLabel>Mark as Popular</FormLabel> <p className="text-sm text-muted-foreground">This package will be highlighted.</p> </div> </FormItem> )}/>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditPackageDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Subscription Dialog */}
      <Dialog open={isAddSubscriptionDialogOpen} onOpenChange={setIsAddSubscriptionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Subscription Plan</DialogTitle>
            <DialogDescription>
              Create a new monthly subscription plan.
            </DialogDescription>
          </DialogHeader>
          <Form {...subscriptionForm}>
            <form onSubmit={subscriptionForm.handleSubmit(onSubmitAddSubscription)} className="space-y-4">
              <FormField control={subscriptionForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Plan Name</FormLabel> <FormControl> <Input {...field} placeholder="e.g. Premium" /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Monthly Price ($)</FormLabel> <FormControl> <Input type="number" step="0.01" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="credits_per_month" render={({ field }) => ( <FormItem> <FormLabel>Credits Per Month</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Input {...field} placeholder="e.g. For serious creators" /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="features" render={({ field }) => ( <FormItem> <FormLabel>Features (comma-separated)</FormLabel> <FormControl> <Textarea {...field} placeholder="Feature 1, Feature 2, Feature 3" /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="rank" render={({ field }) => ( <FormItem> <FormLabel>Rank</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="interval" render={({ field }) => ( <FormItem> <FormLabel>Interval</FormLabel> <FormControl> <Input {...field} placeholder="month" /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="popular" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"> <FormControl> <Checkbox checked={field.value} onCheckedChange={field.onChange} /> </FormControl> <div className="space-y-1 leading-none"> <FormLabel>Mark as Popular</FormLabel> <p className="text-sm text-muted-foreground">This plan will be highlighted.</p> </div> </FormItem> )}/>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddSubscriptionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Plan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditSubscriptionDialogOpen} onOpenChange={setIsEditSubscriptionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>
              Modify the details of this subscription plan.
            </DialogDescription>
          </DialogHeader>
          <Form {...subscriptionForm}>
            <form onSubmit={subscriptionForm.handleSubmit(onSubmitEditSubscription)} className="space-y-4">
              <FormField control={subscriptionForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Plan Name</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Monthly Price ($)</FormLabel> <FormControl> <Input type="number" step="0.01" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="credits_per_month" render={({ field }) => ( <FormItem> <FormLabel>Credits Per Month</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="features" render={({ field }) => ( <FormItem> <FormLabel>Features (comma-separated)</FormLabel> <FormControl> <Textarea {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="rank" render={({ field }) => ( <FormItem> <FormLabel>Rank</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="interval" render={({ field }) => ( <FormItem> <FormLabel>Interval</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={subscriptionForm.control} name="popular" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"> <FormControl> <Checkbox checked={field.value} onCheckedChange={field.onChange} /> </FormControl> <div className="space-y-1 leading-none"> <FormLabel>Mark as Popular</FormLabel> <p className="text-sm text-muted-foreground">This plan will be highlighted.</p> </div> </FormItem> )}/>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditSubscriptionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
