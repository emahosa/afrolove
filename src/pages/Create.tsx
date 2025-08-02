
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AiSongGeneration from '@/components/AiSongGeneration';
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LockScreen from "@/components/LockScreen";

const Create = () => {
  const { user, isSubscriber } = useAuth();
  const location = useLocation();
  const [templateData, setTemplateData] = useState(null);

  useEffect(() => {
    if (location.state?.selectedTemplate) {
      setTemplateData(location.state);
    }
  }, [location.state]);

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (!isSubscriber()) {
    return <LockScreen message="Subscribe to access the song creation feature and start making amazing music!" buttonText="Subscribe Now" />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <AiSongGeneration templateData={templateData} />
    </div>
  );
};

export default Create;
