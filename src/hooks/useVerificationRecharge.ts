import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RechargeRequest {
  id: string;
  status: string;
  // Add other fields as needed
}

export const useVerificationRecharge = () => {
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRechargeRequests = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('recharge_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sc_submitted');

        if (error) throw error;

        setRechargeRequests(data || []);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching recharge requests:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchRechargeRequests();

    // Set up realtime subscription
    const channel = supabase
      .channel('verification_recharge_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recharge_requests' },
        () => fetchRechargeRequests()
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const mutate = async () => {
    const { data, error } = await supabase
      .from('recharge_requests')
      .select('*')
      .eq('status', 'sc_submitted');

    if (error) {
      setError(error);
      return;
    }

    setRechargeRequests(data || []);
  };

  return {
    rechargeRequests,
    loading,
    error,
    mutate,
  };
}; 