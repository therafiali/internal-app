import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import type { CompanyTag } from './useCashtags';

export const usePaymentCashtags = () => {
  const [activeCashtags, setActiveCashtags] = useState<CompanyTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveCashtags = async () => {
    try {
      setLoading(true);
      console.log('Fetching active cashtags...');

      const { data: companyTags, error: tagsError } = await supabase
        .from('company_tags')
        .select('*')
       

      if (tagsError) {
        console.error('Error fetching active cashtags:', tagsError);
        throw tagsError;
      }

      console.log('Active cashtags fetched successfully:', companyTags);

      if (companyTags && companyTags.length > 0) {
        // Try to fetch user data
        try {
          const { data: adminData } = await supabase.auth.getUser();
          if (adminData?.user) {
            const tagsWithUsers = companyTags.map(tag => ({
              ...tag,
              procured_by: {
                id: tag.procured_by,
                email: adminData.user.email || 'unknown',
                name: adminData.user.user_metadata?.name || 'Unknown User',
                department: adminData.user.user_metadata?.department || 'unknown'
              }
            }));
            setActiveCashtags(tagsWithUsers as CompanyTag[]);
          } else {
            // Set tags with default user data if no user info available
            const tagsWithDefaultUsers = companyTags.map(tag => ({
              ...tag,
              procured_by: {
                id: tag.procured_by,
                email: 'loading...',
                name: 'Loading...',
                department: 'loading...'
              }
            }));
            setActiveCashtags(tagsWithDefaultUsers as CompanyTag[]);
          }
        } catch (userError) {
          console.error('Error fetching user data:', userError);
          // Set tags with default user data on error
          const tagsWithDefaultUsers = companyTags.map(tag => ({
            ...tag,
            procured_by: {
              id: tag.procured_by,
              email: 'loading...',
              name: 'Loading...',
              department: 'loading...'
            }
          }));
          setActiveCashtags(tagsWithDefaultUsers as CompanyTag[]);
        }
      } else {
        console.log('No active cashtags found');
        setActiveCashtags([]);
      }
    } catch (err) {
      console.error('Error in fetchActiveCashtags:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setActiveCashtags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveCashtags();
  }, []);

  return {
    activeCashtags,
    loading,
    error,
    fetchActiveCashtags
  };
}; 