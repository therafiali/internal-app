import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface EntPage {
  id: string;
  page_name: string;
  team_code: string;
}

export const useEntPages = (teamCode?: string) => {
  const [pages, setPages] = useState<EntPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('ent_pages')
          .select('*');

        if (teamCode) {
          query = query.eq('team_code', teamCode);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setPages(data || []);
      } catch (err) {
        console.error('Error fetching ENT pages:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch ENT pages');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPages();
  }, [teamCode]);

  return { pages, isLoading, error };
}; 