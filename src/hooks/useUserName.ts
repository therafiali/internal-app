import { useState } from 'react';
import { supabase } from '@/supabase/client';

export const useUserName = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserName = async (userId: string) => {
    if (!userId) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user name:', error);
        setError(error.message);
        setUserName(null);
        return null;
      }

      setUserName(data?.name || null);
      return data?.name || null;
    } catch (error) {
      console.error('Error in getUserName:', error);
      setError('Failed to fetch user name');
      setUserName(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userName,
    getUserName,
    isLoading,
    error
  };
}; 