import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AffiliateDashboard from "./AffiliateDashboard";
import BecomeAffiliatePage from "./BecomeAffiliatePage";
import { useAuth } from "@/contexts/AuthContext";

const AffiliatePage = () => {
  const { isAffiliate } = useAuth();

  return (
    <div className="container mx-auto py-8 px-4">
      <Tabs defaultValue="apply" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="apply">Become an Affiliate</TabsTrigger>
          <TabsTrigger value="dashboard" disabled={!isAffiliate()}>
            Affiliate Dashboard
          </TabsTrigger>
        </TabsList>
        <TabsContent value="apply">
          <BecomeAffiliatePage />
        </TabsContent>
        <TabsContent value="dashboard">
          {isAffiliate() ? <AffiliateDashboard /> : (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                This page can only be viewed by affiliates.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliatePage;
