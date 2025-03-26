import { useEffect, useState } from 'react';
import { supabase } from '@/supabase/client';

export interface CompanyTag {
  id: string;
  c_id: string;
  name: string;
  cashtag: string;
  ct_type: string;
  full_name: string;
  last4_ss: string;
  address: string;
  email: string;
  pin: string;
  verification_status: string;
  procured_by: {
    id: string;
    email: string;
    name: string;
    department: string;
  };
  procurement_cost: number;
  procured_at: string;
  balance: number;
  limit: number;
  total_received: number;
  total_withdrawn: number;
  transaction_count: number;
  linked_card: string;
  linked_bank: string;
  cash_card: string;
  status: string;
  last_active: string;
  created_at: string;
  updated_at: string;
  payment_method: string;
}

export interface TagStats {
  active: number;
  paused: number;
  disabled: number;
}

export const useCashtags = () => {
  const [tags, setTags] = useState<CompanyTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagStats, setTagStats] = useState<TagStats>({
    active: 0,
    paused: 0,
    disabled: 0,
  });

  const fetchTags = async () => {
    try {
      setLoading(true);
      console.log('Fetching tags...');

      // Fetch only tags first
      const { data: companyTags, error: tagsError } = await supabase
        .from('company_tags')
        .select('*');

      if (tagsError) {
        console.error('Error fetching tags:', tagsError);
        throw tagsError;
      }

      console.log('Tags fetched successfully:', companyTags);

      if (companyTags && companyTags.length > 0) {
        // Set tags without user data first to show something on screen
        const tagsWithDefaultUsers = companyTags.map(tag => ({
          ...tag,
          procured_by: {
            id: tag.procured_by,
            email: 'loading...',
            name: 'Loading...',
            department: 'loading...'
          }
        }));

        setTags(tagsWithDefaultUsers as CompanyTag[]);

        // Calculate initial stats
        const stats = companyTags.reduce(
          (acc, tag) => {
            switch (tag.status) {
              case 'active':
                acc.active++;
                break;
              case 'paused':
                acc.paused++;
                break;
              case 'disabled':
                acc.disabled++;
                break;
            }
            return acc;
          },
          { active: 0, paused: 0, disabled: 0 }
        );

        setTagStats(stats);

        // Then try to fetch user data
        try {
          const { data: adminData } = await supabase.auth.getUser();
          if (adminData?.user) {
            // If we can get the current user, update the tags with the user info
            const tagsWithUsers = companyTags.map(tag => ({
              ...tag,
              procured_by: {
                id: tag.procured_by,
                email: adminData.user.email || 'unknown',
                name: adminData.user.user_metadata?.name || 'Unknown User',
                department: adminData.user.user_metadata?.department || 'unknown'
              }
            }));
            setTags(tagsWithUsers as CompanyTag[]);
          }
        } catch (userError) {
          console.error('Error fetching user data:', userError);
          // Keep using the default user data
        }
      } else {
        console.log('No tags found');
        setTags([]);
        setTagStats({ active: 0, paused: 0, disabled: 0 });
      }
    } catch (err) {
      console.error('Error in fetchTags:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTags([]);
      setTagStats({ active: 0, paused: 0, disabled: 0 });
    } finally {
      setLoading(false);
    }
  };

  const createTag = async (tagData: Omit<CompanyTag, 'id' | 'created_at' | 'updated_at' | 'total_received' | 'total_withdrawn' | 'transaction_count' | 'last_active'>) => {
    try {
      console.log('Creating tag with data:', tagData);

      const { data, error } = await supabase
        .from('company_tags')
        .insert([{
          ...tagData,
          total_received: 0,
          total_withdrawn: 0,
          transaction_count: 0,
          last_active: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating tag:', error);
        throw error;
      }

      console.log('Tag created successfully:', data);
      await fetchTags();
      return { data, error: null };
    } catch (err) {
      console.error('Error in createTag:', err);
      return { data: null, error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const updateTag = async (id: string, updateData: Partial<CompanyTag>) => {
    try {
      console.log('Updating tag:', id, 'with data:', updateData);

      const { data, error } = await supabase
        .from('company_tags')
        .update({
          ...updateData,
          last_active: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating tag:', error);
        throw error;
      }

      console.log('Tag updated successfully:', data);
      await fetchTags();
      return { data, error: null };
    } catch (err) {
      console.error('Error in updateTag:', err);
      return { data: null, error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  const transferBalance = async (fromId: string, toId: string, amount: number) => {
    try {
      console.log('Transferring balance:', { fromId, toId, amount });

      const { data, error } = await supabase.rpc('transfer_balance', {
        from_tag_id: fromId,
        to_tag_id: toId,
        transfer_amount: amount
      });

      if (error) {
        console.error('Error transferring balance:', error);
        throw error;
      }

      console.log('Balance transferred successfully:', data);
      await fetchTags();
      return { data, error: null };
    } catch (err) {
      console.error('Error in transferBalance:', err);
      return { data: null, error: err instanceof Error ? err.message : 'An error occurred' };
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  return {
    tags,
    loading,
    error,
    tagStats,
    fetchTags,
    createTag,
    updateTag,
    transferBalance,
    setTags,
    setTagStats
  };
}; 