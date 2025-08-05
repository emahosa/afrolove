
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AffiliateDashboard from "./AffiliateDashboard";
import BecomeAffiliatePage from "./BecomeAffiliatePage";
import { useAuth } from "@/contexts/AuthContext";

const AffiliatePage = () => {
  const { user } = useAuth();

  // Check if user has affiliate role (approved application)
  const isAffiliate = () => {
    return user?.user_metadata?.roles?.includes('affiliate') || false;
  };

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Affiliate Program
          </h1>
          <p className="text-slate-300 text-lg">
            Join our community and start earning by promoting Afroverse
          </p>
        </div>

        <Tabs defaultValue="apply" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-slate-700">
            <TabsTrigger 
              value="apply"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
            >
              Become an Affiliate
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard"
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
              disabled={!isAffiliate()}
            >
              Affiliate Dashboard
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="apply" className="mt-6">
            <BecomeAffiliatePage />
          </TabsContent>
          
          <TabsContent value="dashboard" className="mt-6">
            {isAffiliate() ? (
              <AffiliateDashboard />
            ) : (
              <div className="text-center py-12">
                <div className="bg-slate-800 rounded-lg p-8 max-w-md mx-auto border border-slate-700">
                  <h3 className="text-xl font-semibold mb-2 text-slate-200">Access Restricted</h3>
                  <p className="text-slate-400">
                    This dashboard is only available for approved affiliates.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AffiliatePage;
