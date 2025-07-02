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
import { useState } from "react";

const affiliateFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." })
    .regex(/^\+?[1-9]\d{1,14}$/, { message: "Please enter a valid phone number (e.g., +1234567890)." }),
  socialMediaUrl: z.string().url({ message: "Please enter a valid URL for your social media profile." }),
  reasonToJoin: z.string().min(10, { message: "Reason must be at least 10 characters." }).max(500, { message: "Reason must be 500 characters or less." }),
});

type AffiliateFormValues = z.infer<typeof affiliateFormSchema>;

const BecomeAffiliatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AffiliateFormValues>({
    resolver: zodResolver(affiliateFormSchema),
    defaultValues: {
      fullName: user?.user_metadata?.full_name || user?.name || "",
      email: user?.email || "",
      phone: "",
      socialMediaUrl: "",
      reasonToJoin: "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: AffiliateFormValues) {
    if (!user) {
      toast.error("You must be logged in to apply.");
      return;
    }
    setIsLoading(true);
    try {
      // Ensure the function name matches exactly what's deployed or expected in Supabase
      const { error } = await supabase.functions.invoke("submit-affiliate-application", {
        body: {
          full_name: data.fullName,
          email: data.email, // Ensure backend uses this email or user.email
          phone: data.phone,
          social_media_url: data.socialMediaUrl,
          reason_to_join: data.reasonToJoin,
        },
      });

      if (error) {
        console.error("Affiliate application submission error:", error.message);
        // Attempt to parse context for more specific error message if available
        let detailedMessage = error.message;
        try {
            const errorContext = JSON.parse(error.context || error.message); // error.context might not exist or be JSON
            if (errorContext.error) detailedMessage = errorContext.error;
            else if (errorContext.details) detailedMessage = errorContext.details;
            else if (errorContext.message) detailedMessage = errorContext.message;
        } catch (e) { /* ignore parsing error, use original message */ }


        if (detailedMessage.includes("already have an active or pending application")) {
            toast.error("You already have an active or pending application.");
        } else if (detailedMessage.includes("Only subscribers can apply")) {
            toast.error("Submission failed: Only subscribers can apply for the affiliate program.");
            navigate("/subscribe"); // Optionally navigate to subscribe page
        } else {
            toast.error(`Submission failed: ${detailedMessage}`);
        }
      } else {
        toast.success("Application submitted! We'll review it and get back to you soon.");
        navigate("/dashboard");
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
            <p>Please log in to access this page. You will be redirected.</p>
            {/* setTimeout(() => navigate("/login", { state: { from: location } }), 2000) */}
        </div>
    );
  }

  // Update defaultValues if user context changes after initial load (e.g. async load)
  // This is important if the page loads before user data is fully available.
  if (user && (form.getValues().email !== user.email || form.getValues().fullName !== (user.user_metadata?.full_name || user.name))) {
      form.reset({
        fullName: user.user_metadata?.full_name || user.name || "",
        email: user.email || "",
        phone: form.getValues().phone, // keep already entered phone
        socialMediaUrl: form.getValues().socialMediaUrl, // keep already entered social
        reasonToJoin: form.getValues().reasonToJoin, // keep already entered reason
      });
  }


  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Become an Affiliate</CardTitle>
          <CardDescription className="text-center">
            Join our affiliate program and earn by promoting Afroverse!
            Fill out the form below to apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly disabled className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly disabled className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormDescription>
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
                    <FormLabel>Social Media Profile URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://twitter.com/yourprofile" {...field} />
                    </FormControl>
                    <FormDescription>
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
                    <FormLabel>Why do you want to join?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Briefly tell us why you're interested in becoming an affiliate..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                     <FormDescription>
                      (Min 10 characters, Max 500 characters) This field is required.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || !form.formState.isValid}>
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
