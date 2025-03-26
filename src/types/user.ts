import { EntType } from '@/supabase/types';

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  employee_code?: string;
  ent_section?: string;
  ent_access: EntType[];
  status?: 'active' | 'disabled';
  user_profile_pic?: string | null;
  last_sign_in_at?: string | null;
} 