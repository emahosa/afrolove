import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Check, AlertCircle } from 'lucide-react';
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
import { StripeToggleSettings } from './StripeToggleSettings';
import { PaystackToggleSettings } from './PaystackToggleSettings';

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
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>(initialCreditPacks);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(initialSubscriptionPlans);
  const [isAddPackageDialogOpen, setIsAddPackageDialogOpen] = useState(false);
  const [isEditPackageDialogOpen, setIsEditPackageDialogOpen] = useState(false);
  const [isAddSubscriptionDialogOpen, setIsAddSubscriptionDialogOpen] = useState(false);
  const [isEditSubscriptionDialogOpen, setIsEditSubscriptionDialogOpen] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<CreditPackage | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionPlan | null>(null);

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

  function handleTogglePackageStatus(packageId: string) {
    setCreditPackages(creditPackages.map(pkg => {
      if (pkg.id === packageId) {
        const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
        toast.success(`Credit package ${pkg.name} ${newStatus === 'active' ? 'activated' : 'disabled'}`);
        return { ...pkg, status: newStatus };
      }
      return pkg;
    }));
  }

  function onSubmitAddPackage(values: z.infer<typeof creditPackageSchema>) {
    const newPackage: CreditPackage = {
      id: `pkg-${Date.now()}`,
      name: values.name,
      credits: values.credits,
      price: values.price,
      status: 'active',
    };
    
    setCreditPackages([...creditPackages, newPackage]);
    toast.success(`New credit package "${values.name}" added successfully`);
    setIsAddPackageDialogOpen(false);
  }

  function onSubmitEditPackage(values: z.infer<typeof creditPackageSchema>) {
    if (currentPackage) {
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
      setIsEditPackageDialogOpen(false);
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

  function onSubmitAddSubscription(values: z.infer<typeof subscriptionPlanSchema>) {
    const newPlan: SubscriptionPlan = {
      id: `sub-${Date.now()}`,
      name: values.name,
      price: values.price,
      creditsPerMonth: values.creditsPerMonth,
      popular: values.popular || false,
      features: [
        `${values.creditsPerMonth} credits monthly`,
        'Access to all basic AI models',
        'Standard quality exports',
        'Email support'
      ],
    };
    
    setSubscriptionPlans([...subscriptionPlans, newPlan]);
    toast.success(`New subscription plan "${values.name}" added successfully`);
    setIsAddSubscriptionDialogOpen(false);
  }

  function onSubmitEditSubscription(values: z.infer<typeof subscriptionPlanSchema>) {
    if (currentSubscription) {
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
      setIsEditSubscriptionDialogOpen(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Payment Gateway Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        <StripeToggleSettings />
        <PaystackToggleSettings />
      </div>

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
