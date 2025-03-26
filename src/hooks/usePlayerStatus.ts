import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function usePlayerStatus() {
  const [loading, setLoading] = useState(false);

  const updatePlayerStatus = async (vipCode: string, newStatus: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('players')
        .update({ status: newStatus })
        .eq('vip_code', vipCode)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating player status:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    updatePlayerStatus,
    loading
  };
} 