
import { useState, useEffect } from 'react';

interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'upcoming';
  prize: string;
  created_at: string;
  updated_at: string;
}

export const useContests = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setContests([]);
      setLoading(false);
    }, 1000);
  }, []);

  return { contests, loading };
};
