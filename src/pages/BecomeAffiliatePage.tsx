
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const affiliateFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." })
    .regex(/^\+?[1-9]\d{1,14}$/, { message: "Please enter a valid phone number (e.g., +1234567890)." }),
  socialMediaUrl: z.string().url({ message: "Please enter a valid URL for your social media profile." }),
  reasonToJoin: z.string().min(10, { message: "Reason must be at least 10 characters." }).max(500, { message: "Reason must be 500 characters or less." }),
  usdt_wallet_address: z.string().min(10, { message: "Please enter a valid USDT wallet address." }),
});

type AffiliateFormValues = z.infer<typeof affiliateFormSchema>;

const BecomeAffiliatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [userProfile, setUserProfile] = useState<any>(null);

  const form = useForm<AffiliateFormValues>({
    resolver: zodResolver(affiliateFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      socialMediaUrl: "",
      reasonToJoin: "",
      usdt_wallet_address: "",
    },
    mode: "onChange",
  });

  // Fetch user profile and application status
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else {
          setUserProfile(profile);
          // Auto-fill form with user data
          form.reset({
            fullName: profile.full_name || user.user_metadata?.full_name || user.name || "",
            email: user.email || "",
            phone: form.getValues().phone,
            socialMediaUrl: form.getValues().socialMediaUrl,
            reasonToJoin: form.getValues().reasonToJoin,
            usdt_wallet_address: form.getValues().usdt_wallet_address,
          });
        }

        // Check application status
        const { data: applicationData, error: applicationError } = await supabase
          .from('affiliate_applications')
          .select('status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!applicationError && applicationData) {
          setApplicationStatus(applicationData.status as 'pending' | 'approved' | 'rejected');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user, form]);

  async function onSubmit(data: AffiliateFormValues) {
    if (!user) {
      toast.error("You must be logged in to apply.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("submit-affiliate-application", {
        body: {
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          social_media_url: data.socialMediaUrl,
          reason_to_join: data.reasonToJoin,
          usdt_wallet_address: data.usdt_wallet_address,
        },
      });

      if (error) {
        console.error("Affiliate application submission error:", error.message);
        
        if (error.message.includes("already have an active or pending application")) {
          toast.error("You already have an active or pending application.");
        } else {
          toast.error(`Submission failed: ${error.message}`);
        }
      } else {
        toast.success("Application submitted! We'll review it and get back to you soon.");
        setApplicationStatus('pending');
      }
    } catch (e: any) {
      console.error("Unexpected error submitting affiliate application:", e);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  if (applicationStatus === 'approved') {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-green-500">Application Approved! 🎉</CardTitle>
            <CardDescription className="text-center">
              Your affiliate application has been approved. You can now access your affiliate dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => navigate("/affiliate")}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Go to Affiliate Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (applicationStatus === 'pending') {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-yellow-500">Application Under Review</CardTitle>
            <CardDescription className="text-center">
              Your affiliate application is currently being reviewed. We'll notify you once it's processed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (applicationStatus === 'rejected') {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-red-500">Application Rejected</CardTitle>
            <CardDescription className="text-center">
              Your affiliate application was rejected. You can submit a new application after addressing the concerns.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => {
                setApplicationStatus('none');
                form.reset();
              }}
              variant="outline"
            >
              Submit New Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <Card className="shadow-xl border-slate-800">
        <CardHeader className="bg-gradient-to-r from-violet-900/20 to-purple-900/20 rounded-t-lg">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Become an Affiliate
          </CardTitle>
          <CardDescription className="text-center text-lg text-slate-300">
            Join our affiliate program and start earning by promoting Afroverse! 
            Fill out the form below to apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200 font-semibold">Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          readOnly 
                          disabled 
                          className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormDescription className="text-slate-400">
                        This is automatically filled from your profile
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200 font-semibold">Email</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          readOnly 
                          disabled 
                          className="bg-slate-800 border-slate-600 text-slate-300 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormDescription className="text-slate-400">
                        This is automatically filled from your account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold">Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+1234567890" 
                        {...field} 
                        className="bg-slate-900 border-slate-600 text-white focus:border-violet-500 focus:ring-violet-500"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400">
                      Please include your country code.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="socialMediaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold">Social Media Profile URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://twitter.com/yourprofile" 
                        {...field} 
                        className="bg-slate-900 border-slate-600 text-white focus:border-violet-500 focus:ring-violet-500"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400">
                      Link to your primary social media profile (e.g., Twitter, Instagram, TikTok). This field is required.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reasonToJoin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold">Why do you want to join?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Briefly tell us why you're interested in becoming an affiliate..."
                        className="resize-none bg-slate-900 border-slate-600 text-white focus:border-violet-500 focus:ring-violet-500 min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400">
                      (Min 10 characters, Max 500 characters) This field is required.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="usdt_wallet_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200 font-semibold">USDT Wallet Address (TRC-20)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your TRC-20 USDT Wallet Address" 
                        {...field} 
                        className="bg-slate-900 border-slate-600 text-white focus:border-violet-500 focus:ring-violet-500"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400">
                      Please provide your TRC-20 USDT wallet address for payouts. This field is required.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]" 
                disabled={isLoading || !form.formState.isValid}
                size="lg"
              >
                {isLoading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BecomeAffiliatePage;
