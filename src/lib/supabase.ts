import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get authenticated client
export const getAuthenticatedClient = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

// Helper function to check user activity status
export const checkUserActivity = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_activity')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking user activity:', error);
      return false;
    }

    return data?.user_activity ?? false;
  } catch (error) {
    console.error('Error checking user activity:', error);
    return false;
  }
}; 