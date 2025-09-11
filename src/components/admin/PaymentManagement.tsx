import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  status: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  popular: boolean;
  creditsPerMonth: number;
  features: string[];
}

const creditPackageSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  credits: z.coerce.number().int().positive({ message: "Credits must be positive." }),
  price: z.coerce.number().positive({ message: "Price must be positive." }),
});

const subscriptionPlanSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  price: z.coerce.number().positive({ message: "Price must be positive." }),
  creditsPerMonth: z.coerce.number().int().positive({ message: "Credits per month must be positive." }),
  popular: z.boolean().optional(),
});

// Initial data - this should match what's in Credits.tsx
const initialCreditPacks: CreditPackage[] = [
  { id: "pack1", name: "Starter Pack", credits: 10, price: 4.99, status: "active" },
  { id: "pack2", name: "Creator Pack", credits: 30, price: 9.99, status: "active" },
  { id: "pack3", name: "Pro Pack", credits: 75, price: 19.99, status: "active" },
  { id: "pack4", name: "Studio Pack", credits: 200, price: 49.99, status: "active" },
];

const initialSubscriptionPlans: SubscriptionPlan[] = [
  { 
    id: "basic",
    name: "Basic", 
    price: 9.99, 
    popular: false,
    creditsPerMonth: 20,
    features: [
      "20 credits monthly",
      "Access to all basic AI models",
      "Standard quality exports",
      "Email support"
    ] 
  },
  { 
    id: "premium",
    name: "Premium", 
    price: 19.99, 
    popular: true,
    creditsPerMonth: 75,
    features: [
      "75 credits monthly",
      "Access to all premium AI models",
      "High quality exports",
      "Priority email support",
      "Unlimited song storage"
    ] 
  },
  { 
    id: "unlimited",
    name: "Professional", 
    price: 39.99, 
    popular: false,
    creditsPerMonth: 200,
    features: [
      "200 credits monthly",
      "Access to all AI models including beta",
      "Maximum quality exports",
      "Priority support with 24hr response",
      "Unlimited song storage",
      "Commercial usage rights",
      "Advanced editing tools"
    ] 
  }
];

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

  // Fetch data from database on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch credit packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('credit_packages' as any)
        .select('*')
        .order('credits', { ascending: true });

      if (packagesError && packagesError.code !== 'PGRST103') { // Table doesn't exist
        console.error('Error fetching credit packages:', packagesError);
      } else if (packagesData) {
        setCreditPackages(packagesData.map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          credits: pkg.credits,
          price: pkg.price,
          status: pkg.active ? 'active' : 'inactive'
        })));
      }

      // Fetch subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .order('rank', { ascending: true });

      if (plansError) {
        console.error('Error fetching subscription plans:', plansError);
      } else if (plansData) {
        setSubscriptionPlans(plansData.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          popular: plan.rank === 2, // Assume rank 2 is popular
          creditsPerMonth: plan.credits_per_month,
          features: plan.features || []
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const packageForm = useForm<z.infer<typeof creditPackageSchema>>({
    resolver: zodResolver(creditPackageSchema),
    defaultValues: {
      name: "",
      credits: 0,
      price: 0,
    },
  });

  const subscriptionForm = useForm<z.infer<typeof subscriptionPlanSchema>>({
    resolver: zodResolver(subscriptionPlanSchema),
    defaultValues: {
      name: "",
      price: 0,
      creditsPerMonth: 0,
      popular: false,
    },
  });

  const renderStatusLabel = (status: string) => {
    return (
      <Badge variant={status === 'active' ? 'default' : 'secondary'}>
        {status}
      </Badge>
    );
  };

  function handleAddPackage() {
    packageForm.reset({
      name: "",
      credits: 0,
      price: 0,
    });
    setIsAddPackageDialogOpen(true);
  }

  function handleEditPackage(packageId: string) {
    const pkg = creditPackages.find(p => p.id === packageId);
    if (pkg) {
      setCurrentPackage(pkg);
      packageForm.reset({
        name: pkg.name,
        credits: pkg.credits,
        price: pkg.price,
      });
      setIsEditPackageDialogOpen(true);
    }
  }

  async function handleTogglePackageStatus(packageId: string) {
    try {
      const pkg = creditPackages.find(p => p.id === packageId);
      if (!pkg) return;

      const newActiveStatus = pkg.status !== 'active';
      
      const { error } = await supabase
        .from('credit_packages' as any)
        .update({ active: newActiveStatus })
        .eq('id', packageId);

      if (error) throw error;

      setCreditPackages(creditPackages.map(p => 
        p.id === packageId 
          ? { ...p, status: newActiveStatus ? 'active' : 'inactive' }
          : p
      ));
      
      toast.success(`Credit package ${pkg.name} ${newActiveStatus ? 'activated' : 'disabled'}`);
      
      // Trigger a storage event to notify other tabs/windows
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'credit_packages_updated',
        newValue: Date.now().toString()
      }));
    } catch (error: any) {
      console.error('Error toggling package status:', error);
      toast.error('Failed to update package status');
    }
  }

  async function onSubmitAddPackage(values: z.infer<typeof creditPackageSchema>) {
    try {
      const { data, error } = await supabase
        .from('credit_packages' as any)
        .insert({
          name: values.name,
          credits: values.credits,
          price: values.price,
          active: true,
          currency: 'USD',
          popular: false
        })
        .select()
        .single();

      if (error) throw error;

      const newPackage: CreditPackage = {
        id: (data as any).id,
        name: (data as any).name,
        credits: (data as any).credits,
        price: (data as any).price,
        status: 'active',
      };
      
      setCreditPackages([...creditPackages, newPackage]);
      toast.success(`New credit package "${values.name}" added successfully`);
      
      // Trigger a storage event to notify other tabs/windows
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'credit_packages_updated',
        newValue: Date.now().toString()
      }));
      
      setIsAddPackageDialogOpen(false);
      packageForm.reset();
    } catch (error: any) {
      console.error('Error adding package:', error);
      toast.error('Failed to add credit package');
    }
  }

  async function onSubmitEditPackage(values: z.infer<typeof creditPackageSchema>) {
    if (!currentPackage) return;
    
    try {
      const { error } = await supabase
        .from('credit_packages' as any)
        .update({
          name: values.name,
          credits: values.credits,
          price: values.price,
        })
        .eq('id', currentPackage.id);

      if (error) throw error;

      setCreditPackages(creditPackages.map(pkg => 
        pkg.id === currentPackage.id 
          ? { 
              ...pkg,
              name: values.name,
              credits: values.credits,
              price: values.price,
            } 
          : pkg
      ));
      toast.success(`Credit package "${values.name}" updated successfully`);
      
      // Trigger a storage event to notify other tabs/windows
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'credit_packages_updated',
        newValue: Date.now().toString()
      }));
      
      setIsEditPackageDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating package:', error);
      toast.error('Failed to update credit package');
    }
  }

  function handleAddSubscription() {
    subscriptionForm.reset({
      name: "",
      price: 0,
      creditsPerMonth: 0,
      popular: false,
    });
    setIsAddSubscriptionDialogOpen(true);
  }

  function handleEditSubscription(planId: string) {
    const plan = subscriptionPlans.find(p => p.id === planId);
    if (plan) {
      setCurrentSubscription(plan);
      subscriptionForm.reset({
        name: plan.name,
        price: plan.price,
        creditsPerMonth: plan.creditsPerMonth,
        popular: plan.popular,
      });
      setIsEditSubscriptionDialogOpen(true);
    }
  }

  async function onSubmitAddSubscription(values: z.infer<typeof subscriptionPlanSchema>) {
    try {
      const { data, error } = await supabase
        .from('plans')
        .insert({
          name: values.name,
          price: values.price,
          credits_per_month: values.creditsPerMonth,
          currency: 'USD',
          interval: 'month',
          features: [
            `${values.creditsPerMonth} credits monthly`,
            'Access to all basic AI models',
            'Standard quality exports',
            'Email support'
          ],
          active: true,
          rank: values.popular ? 2 : 1
        })
        .select()
        .single();

      if (error) throw error;

      const newPlan: SubscriptionPlan = {
        id: data.id,
        name: data.name,
        price: data.price,
        creditsPerMonth: data.credits_per_month,
        popular: values.popular || false,
        features: data.features,
      };
      
      setSubscriptionPlans([...subscriptionPlans, newPlan]);
      toast.success(`New subscription plan "${values.name}" added successfully`);
      
      // Trigger a storage event to notify other tabs/windows
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'subscription_plans_updated',
        newValue: Date.now().toString()
      }));
      
      setIsAddSubscriptionDialogOpen(false);
      subscriptionForm.reset();
    } catch (error: any) {
      console.error('Error adding subscription plan:', error);
      toast.error('Failed to add subscription plan');
    }
  }

  async function onSubmitEditSubscription(values: z.infer<typeof subscriptionPlanSchema>) {
    if (!currentSubscription) return;
    
    try {
      const { error } = await supabase
        .from('plans')
        .update({
          name: values.name,
          price: values.price,
          credits_per_month: values.creditsPerMonth,
          rank: values.popular ? 2 : 1
        })
        .eq('id', currentSubscription.id);

      if (error) throw error;

      setSubscriptionPlans(subscriptionPlans.map(plan => 
        plan.id === currentSubscription.id 
          ? { 
              ...plan,
              name: values.name,
              price: values.price,
              creditsPerMonth: values.creditsPerMonth,
              popular: values.popular || false,
            } 
          : plan
      ));
      toast.success(`Subscription plan "${values.name}" updated successfully`);
      
      // Trigger a storage event to notify other tabs/windows
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'subscription_plans_updated',
        newValue: Date.now().toString()
      }));
      
      setIsEditSubscriptionDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating subscription plan:', error);
      toast.error('Failed to update subscription plan');
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading payment data...</div>;
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
                  <TableCell>${pkg.price.toFixed(2)}</TableCell>
                  <TableCell>{renderStatusLabel(pkg.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditPackage(pkg.id)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleTogglePackageStatus(pkg.id)}
                        className={pkg.status === 'active' ? 'text-red-600' : 'text-green-600'}
                      >
                        {pkg.status === 'active' ? 'Disable' : 'Enable'}
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
            <Card key={plan.id} className={`flex flex-col ${plan.popular ? "border-melody-secondary" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-melody-secondary">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>Monthly subscription</CardDescription>
                <div className="text-3xl font-bold">${plan.price}<span className="text-sm text-muted-foreground font-normal">/month</span></div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 fill-melody-secondary text-melody-secondary" />
                  <span className="font-medium">{plan.creditsPerMonth} credits monthly</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-melody-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleEditSubscription(plan.id)}
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
              <FormField
                control={packageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Basic Pack" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={packageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={subscriptionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Premium" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="creditsPerMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits Per Month</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="popular"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Mark as Popular
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This plan will be highlighted to users
                      </p>
                    </div>
                  </FormItem>
                )}
              />
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
              <FormField
                control={subscriptionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="creditsPerMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits Per Month</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="popular"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Mark as Popular
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This plan will be highlighted to users
                      </p>
                    </div>
                  </FormItem>
                )}
              />
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
