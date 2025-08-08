
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AffiliatePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the proper affiliate dashboard
    navigate('/affiliate-dashboard', { replace: true });
  }, [navigate]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg text-muted-foreground">Redirecting to Affiliate Dashboard...</p>
      </div>
    </div>
  );
};

export default AffiliatePage;
