import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const SubscribePage: React.FC = () => {
  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Unlock Your Full Potential</CardTitle>
          <CardDescription className="text-xl text-muted-foreground">
            Choose a plan that fits your creative needs and access all premium features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="text-center">
            <p className="text-lg">
              Our subscription plans give you unlimited access to music generation, your full song library, credit purchases, and much more!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Placeholder Plan 1 */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Plan</CardTitle>
                <CardDescription>$10/month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Unlimited Music Generation</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Full Song Library Access</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Purchase Additional Credits</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Priority Support</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => alert('Redirecting to Stripe/Payment Gateway...')}>Subscribe Now</Button>
              </CardFooter>
            </Card>

            {/* Placeholder Plan 2 */}
            <Card>
              <CardHeader>
                <CardTitle>Annual Plan</CardTitle>
                <CardDescription>$100/year (Save $20!)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> All Monthly Plan Features</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Save 16% Annually</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Early Access to New Features</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => alert('Redirecting to Stripe/Payment Gateway...')}>Subscribe Now</Button>
              </CardFooter>
            </Card>
          </div>

        </CardContent>
        <CardFooter className="flex flex-col items-center text-center">
          <p className="text-sm text-muted-foreground mb-4">
            By subscribing, you agree to our Terms of Service and Privacy Policy.
          </p>
          <Link to="/dashboard">
            <Button variant="outline">Maybe Later</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SubscribePage;
