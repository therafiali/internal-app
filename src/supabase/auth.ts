import { supabase } from '@/lib/supabase';
import { User } from './types';

export type SignInCredentials = {
  email: string;
  password: string;
};

export type CreateUserData = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  password: string;
};

// Role-Department validation
const validateRoleDepartment = (department: string, role: string): boolean => {
  switch (department) {
    case 'Admin':
      return ['Admin', 'Executive'].includes(role);
    case 'Support':
      return ['Manager', 'Agent', 'Shift Incharge'].includes(role);
    case 'Finance':
      return ['Manager', 'Agent'].includes(role);
    case 'Operations':
      return ['Agent'].includes(role);
    case 'Verification':
      return ['Agent'].includes(role);
    case 'Audit':
      return ['Manager', 'Agent'].includes(role);
    default:
      return false;
  }
};

export const signInWithEmail = async ({ email, password }: SignInCredentials) => {
  try {
    console.log('Starting sign in process for:', email)

    // First check if user is disabled
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('status, login_attempts')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error checking user status:', userError);
      return {
        data: null,
        error: 'Invalid credentials'
      };
    }

    if (userData?.status === 'disabled') {
      console.error('Account is disabled');
      return {
        data: null,
        error: 'Your account has been disabled due to too many failed login attempts. Please contact your supervisor.'
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Sign in response:', { data, error });

    if (error) {
      console.error('Supabase auth error:', error);

      // Increment login attempts on failure
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          login_attempts: (userData?.login_attempts || 0) + 1,
          status: userData?.login_attempts >= 2 ? 'disabled' : 'active'
        })
        .eq('email', email);

      if (updateError) {
        console.error('Failed to update login attempts:', updateError);
      }

      return {
        data: null,
        error: error.message
      };
    }

    if (!data.user) {
      console.error('No user data in response');
      return {
        data: null,
        error: 'Invalid credentials'
      };
    }

    // Reset login attempts on successful login
    const { error: resetError } = await supabase
      .from('users')
      .update({ 
        login_attempts: 0,
        user_activity: true,
        last_login: new Date().toISOString()
      })
      .eq('id', data.user.id);

    if (resetError) {
      console.error('Failed to reset login attempts:', resetError);
      // Continue with login even if reset fails
    }

    // Debug user metadata
    console.log('User data from auth:', {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
      app_metadata: data.user.app_metadata
    });

    // Get complete user data from the users table
    const { data: completeUserData, error: completeUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (completeUserError || !completeUserData) {
      console.error('Failed to fetch complete user data:', completeUserError);
      return {
        data: null,
        error: 'Failed to load user profile'
      };
    }

    // Update session with complete user data
    const { data: updatedSession, error: sessionError } = await supabase.auth.refreshSession({
      refresh_token: data.session?.refresh_token
    });

    if (sessionError) {
      console.error('Failed to refresh session:', sessionError);
      return {
        data: null,
        error: 'Failed to update session'
      };
    }

    // Return the complete data
    return { 
      data: {
        ...updatedSession,
        user: {
          ...updatedSession.user,
          user_metadata: {
            ...updatedSession.user?.user_metadata,
            department: completeUserData.department,
            role: completeUserData.role
          }
        }
      }, 
      error: null 
    };

  } catch (error) {
    console.error('Sign in error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred during sign in',
    };
  }
};

export const signUpWithEmail = async (userData: CreateUserData) => {
  try {
    // Validate role-department combination
    if (!validateRoleDepartment(userData.department, userData.role)) {
      throw new Error(`Invalid role ${userData.role} for department ${userData.department}`);
    }

    // Initialize ENT access and section
    let entAccess = userData.ent_access || [];
    let entSection = userData.ent_section;

    // For Support department with specific roles, validate and set ENT section
    const needsEntSection = userData.department === 'Support' && 
      ['Agent', 'Shift Incharge'].includes(userData.role);

    if (needsEntSection) {
      if (!entSection) {
        throw new Error('ENT section is required for Support department agents and shift incharges');
      }
      // For Agents, ENT access is limited to their section
      if (userData.role === 'Agent') {
        entAccess = [entSection];
      } else {
        // For Shift Incharge, ensure their section is in their access list
        if (!entAccess.includes(entSection)) {
          entAccess = [entSection, ...entAccess];
        }
      }
    } else {
      // For other roles, ensure they have selected at least one ENT
      if (!entAccess || entAccess.length === 0) {
        throw new Error('At least one ENT must be selected');
      }
      entSection = undefined;
    }

    console.log('Starting signup process for:', userData.email);

    // First check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Format metadata for auth user
    const metadata = {
      name: userData.name,
      department: userData.department,
      role: userData.role,
      employee_code: userData.employee_code,
      ent_access: entAccess,
      ...(entSection && { ent_section: entSection })
    };

    // Create the auth user with formatted metadata
    console.log('Creating auth user with metadata:', metadata);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: metadata
      }
    });

    if (authError) {
      console.error('Auth user creation failed:', authError);
      throw authError;
    }

    if (!authData.user) {
      console.error('Auth user creation failed: No user data returned');
      throw new Error('User creation failed');
    }

    console.log('Auth user created successfully:', authData.user.id);

    // Add a small delay to ensure auth user is fully created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create the user record in the users table with upsert
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: userData.email,
        name: userData.name,
        department: userData.department,
        role: userData.role,
        status: 'active',
        employee_code: userData.employee_code,
        ent_access: entAccess,
        ent_section: entSection
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (userError) {
      console.error('User record creation failed:', userError);
      // Try one more time after a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error: retryError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          department: userData.department,
          role: userData.role,
          status: 'active',
          employee_code: userData.employee_code,
          ent_access: entAccess,
          ent_section: entSection
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (retryError) {
        console.error('User record creation retry failed:', retryError);
        // If user record creation fails even after retry, attempt to delete the auth user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
        if (deleteError) {
          console.error('Failed to cleanup auth user after error:', deleteError);
        }
        throw new Error('Failed to create user record. Please try again.');
      }
    }

    console.log('User created successfully with all data');
    return { data: authData, error: null };
  } catch (error) {
    console.error('Signup process failed:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred during sign up',
    };
  }
};

export const signOut = async () => {
  try {
    // Get current user before signing out
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Update user_activity to false
      const { error: updateError } = await supabase
        .from('users')
        .update({ user_activity: false })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update user activity status:', updateError);
        // Continue with logout even if activity update fails
      }
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'An error occurred during sign out',
    };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }

    if (user) {
      // Get user's role and department
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, department, status')
        .eq('id', user.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Check if user is active
      if (userData.status === 'disabled') {
        throw new Error('Account is disabled');
      }

      return { 
        user: {
          ...user,
          role: userData.role,
          department: userData.department
        }, 
        error: null 
      };
    }

    return { user: null, error: null };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'An error occurred while fetching user',
    };
  }
}; 