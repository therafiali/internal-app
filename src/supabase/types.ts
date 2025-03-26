import { User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthResponse {
  data: {
    user: SupabaseUser | null;
    session: any | null;
  } | null;
  error: string | null;
}

export interface AuthError {
  message: string;
}

export type EntType = 'ENT1' | 'ENT2' | 'ENT3';

export type User = {
  id: string;
  email: string;
  name: string;
  department: string;
  role: string;
  status: string;
  employee_code: string;
  ent_access?: EntType[];
  ent_section?: EntType;
  created_at?: string;
  updated_at?: string;
  user_profile_pic?: string | null;
  is_active: boolean;
  user_activity: boolean;
  last_sign_in_at?: string | null;
  login_attempts: number;
};

export type CreateUserData = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  password: string;
}; 