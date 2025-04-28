
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

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

export const PaymentManagement = ({ 
  pricingPlans, 
  creditPackages, 
  renderPlanFeatures,
  renderStatusLabel 
}: PaymentManagementProps) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Pricing Plans</h2>
          <Button>Add New Plan</Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {pricingPlans.map((plan) => (
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
                <Button className="w-full">Edit Plan</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Credit Packages</h2>
          <Button>Add New Package</Button>
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
              {creditPackages.map((pkg) => (
                <tr key={pkg.id} className="border-b">
                  <td className="py-3 px-4">{pkg.name}</td>
                  <td className="py-3 px-4">{pkg.credits}</td>
                  <td className="py-3 px-4">${pkg.price.toFixed(2)}</td>
                  <td className="py-3 px-4">{renderStatusLabel(pkg.status)}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500">
                      Disable
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
