
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
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

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  popular?: boolean;
  features: Array<{ label: string; included: boolean }>;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  status: string;
}

interface PaymentManagementProps {
  pricingPlans: PricingPlan[];
  creditPackages: CreditPackage[];
  renderPlanFeatures: (features: Array<{ label: string; included: boolean }>) => React.ReactNode;
  renderStatusLabel: (status: string) => React.ReactNode;
}

const pricingPlanSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  price: z.coerce.number().positive({ message: "Price must be positive." }),
  credits: z.coerce.number().int().positive({ message: "Credits must be positive." }),
  popular: z.boolean().optional(),
});

const creditPackageSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  credits: z.coerce.number().int().positive({ message: "Credits must be positive." }),
  price: z.coerce.number().positive({ message: "Price must be positive." }),
});

export const PaymentManagement = ({ 
  pricingPlans, 
  creditPackages, 
  renderPlanFeatures,
  renderStatusLabel 
}: PaymentManagementProps) => {
  const [plans, setPlans] = useState<PricingPlan[]>(pricingPlans);
  const [packages, setPackages] = useState<CreditPackage[]>(creditPackages);
  const [isAddPlanDialogOpen, setIsAddPlanDialogOpen] = useState(false);
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
  const [isAddPackageDialogOpen, setIsAddPackageDialogOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PricingPlan | null>(null);
  const [currentPackage, setCurrentPackage] = useState<CreditPackage | null>(null);
  const [isEditPackageDialogOpen, setIsEditPackageDialogOpen] = useState(false);

  const planForm = useForm<z.infer<typeof pricingPlanSchema>>({
    resolver: zodResolver(pricingPlanSchema),
    defaultValues: {
      name: "",
      price: 0,
      credits: 0,
      popular: false,
    },
  });

  const packageForm = useForm<z.infer<typeof creditPackageSchema>>({
    resolver: zodResolver(creditPackageSchema),
    defaultValues: {
      name: "",
      credits: 0,
      price: 0,
    },
  });

  // Pricing Plan Functions
  const handleAddPlan = () => {
    planForm.reset({
      name: "",
      price: 0,
      credits: 0,
      popular: false,
    });
    setIsAddPlanDialogOpen(true);
  };

  const handleEditPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
      planForm.reset({
        name: plan.name,
        price: plan.price,
        credits: plan.credits,
        popular: plan.popular || false,
      });
      setIsEditPlanDialogOpen(true);
    }
  };

  const onSubmitAddPlan = (values: z.infer<typeof pricingPlanSchema>) => {
    const newPlan: PricingPlan = {
      id: `plan-${Date.now()}`,
      name: values.name,
      price: values.price,
      credits: values.credits,
      popular: values.popular,
      features: [
        { label: `Generate up to ${values.credits} songs`, included: true },
        { label: 'Standard audio quality', included: true },
        { label: 'Download MP3 files', included: true },
        { label: 'Voice cloning (1 voice)', included: false },
        { label: 'Split vocals and instruments', included: false },
      ],
    };
    
    setPlans([...plans, newPlan]);
    toast.success(`New plan "${values.name}" added successfully`);
    setIsAddPlanDialogOpen(false);
  };

  const onSubmitEditPlan = (values: z.infer<typeof pricingPlanSchema>) => {
    if (currentPlan) {
      setPlans(plans.map(plan => 
        plan.id === currentPlan.id 
          ? { 
              ...plan,
              name: values.name,
              price: values.price,
              credits: values.credits,
              popular: values.popular,
            } 
          : plan
      ));
      toast.success(`Plan "${values.name}" updated successfully`);
      setIsEditPlanDialogOpen(false);
    }
  };

  // Credit Package Functions
  const handleAddPackage = () => {
    packageForm.reset({
      name: "",
      credits: 0,
      price: 0,
    });
    setIsAddPackageDialogOpen(true);
  };

  const handleEditPackage = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      setCurrentPackage(pkg);
      packageForm.reset({
        name: pkg.name,
        credits: pkg.credits,
        price: pkg.price,
      });
      setIsEditPackageDialogOpen(true);
    }
  };

  const handleDisablePackage = (packageId: string) => {
    setPackages(packages.map(pkg => {
      if (pkg.id === packageId) {
        const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
        toast.success(`Credit package ${pkg.name} ${newStatus === 'active' ? 'activated' : 'disabled'}`);
        return { ...pkg, status: newStatus };
      }
      return pkg;
    }));
  };

  const onSubmitAddPackage = (values: z.infer<typeof creditPackageSchema>) => {
    const newPackage: CreditPackage = {
      id: `pkg-${Date.now()}`,
      name: values.name,
      credits: values.credits,
      price: values.price,
      status: 'active',
    };
    
    setPackages([...packages, newPackage]);
    toast.success(`New credit package "${values.name}" added successfully`);
    setIsAddPackageDialogOpen(false);
  };

  const onSubmitEditPackage = (values: z.infer<typeof creditPackageSchema>) => {
    if (currentPackage) {
      setPackages(packages.map(pkg => 
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
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Pricing Plans</h2>
          <Button onClick={handleAddPlan}>Add New Plan</Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={plan.popular ? "border-melody-secondary" : ""}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-melody-secondary text-white text-xs px-3 py-1 rounded-full">
                    Popular
                  </div>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>Subscription Plan</CardDescription>
                <div className="mt-4 text-3xl font-bold">${plan.price}<span className="text-sm text-muted-foreground font-normal">/month</span></div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-melody-secondary" />
                  <span className="font-medium">{plan.credits} monthly credits</span>
                </div>
                <div className="space-y-2">
                  {renderPlanFeatures(plan.features)}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleEditPlan(plan.id)}>Edit Plan</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Credit Packages</h2>
          <Button onClick={handleAddPackage}>Add New Package</Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Package Name</th>
                <th className="text-left py-3 px-4">Credits</th>
                <th className="text-left py-3 px-4">Price</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="border-b">
                  <td className="py-3 px-4">{pkg.name}</td>
                  <td className="py-3 px-4">{pkg.credits}</td>
                  <td className="py-3 px-4">${pkg.price.toFixed(2)}</td>
                  <td className="py-3 px-4">{renderStatusLabel(pkg.status)}</td>
                  <td className="py-3 px-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => handleEditPackage(pkg.id)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-red-500"
                      onClick={() => handleDisablePackage(pkg.id)}
                    >
                      {pkg.status === 'active' ? 'Disable' : 'Enable'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Plan Dialog */}
      <Dialog open={isAddPlanDialogOpen} onOpenChange={setIsAddPlanDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Pricing Plan</DialogTitle>
            <DialogDescription>
              Create a new subscription plan for your users.
            </DialogDescription>
          </DialogHeader>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(onSubmitAddPlan)} className="space-y-4">
              <FormField
                control={planForm.control}
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
                control={planForm.control}
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
                control={planForm.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Credits</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
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
                <Button type="button" variant="outline" onClick={() => setIsAddPlanDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Plan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Pricing Plan</DialogTitle>
            <DialogDescription>
              Modify the details of this subscription plan.
            </DialogDescription>
          </DialogHeader>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(onSubmitEditPlan)} className="space-y-4">
              <FormField
                control={planForm.control}
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
                control={planForm.control}
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
                control={planForm.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Credits</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
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
                <Button type="button" variant="outline" onClick={() => setIsEditPlanDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};
