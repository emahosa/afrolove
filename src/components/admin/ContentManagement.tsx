
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState("terms");
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTab === "terms") {
      fetchTerms();
    }
  }, [activeTab]);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "terms_and_conditions")
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore 'exact one row' error if not found
        throw error;
      }
      if (data) {
        setTerms(data.value || "");
      }
    } catch (error: any) {
      toast.error("Failed to fetch terms: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTerms = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key: "terms_and_conditions", value: terms }, { onConflict: 'key' });

      if (error) {
        throw error;
      }
      toast.success("Terms and Conditions updated successfully");
    } catch (error: any) {
      toast.error("Failed to save terms: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Content Management</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="terms">Terms and Conditions</TabsTrigger>
          {/* Add other site content tabs here if needed */}
        </TabsList>
        
        <TabsContent value="terms" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="terms-editor">Content (Markdown supported)</Label>
                    <Textarea
                      id="terms-editor"
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="min-h-[400px] font-mono"
                      placeholder="Enter your terms and conditions here..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveTerms} disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentManagement;
