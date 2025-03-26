import { supabase } from '@/lib/supabase';
import { User } from './types';

export const createUser = async (user: Partial<User>) => {
  try {
    console.log('Starting user record creation:', {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      role: user.role
    });

    // First try to insert the user
    const { error: insertError } = await supabase
      .from('users')
      .insert([{
        ...user,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);

    if (insertError) {
      // If error is about unique violation, the user already exists
      if (insertError.code === '23505') {
        console.log('User already exists, proceeding with existing user');
      } else {
        console.error('Supabase error during user creation:', {
          error: insertError,
          errorCode: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }
    } else {
      console.log('User record inserted successfully');
    }

    // Then fetch the user record
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching created user:', fetchError);
      throw fetchError;
    }

    if (!userData) {
      throw new Error('User was created but could not be fetched');
    }

    console.log('User record fetched successfully:', userData);
    return { data: userData, error: null };
  } catch (error) {
    console.error('User creation error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        role: user.role
      }
    });
    return {
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred while creating user',
    };
  }
};

export const getUser = async (userId: string) => {
  try {
    console.log('Fetching user:', userId);
    
    // First try to get the user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }

    if (!session) {
      console.error('No active session found');
      throw new Error('No active session');
    }

    // Fetch user data with a simpler query
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        department,
        role,
        status,
        employee_code,
        created_at,
        updated_at,
        avatar_url
      `)
      .eq('id', userId)
      .limit(1)
      .single();

    if (error) {
      console.error('Database error fetching user:', { userId, error });
      if (error.code === '42501') {
        throw new Error('Permission denied. Please check your access rights.');
      } else if (error.code === 'PGRST116') {
        throw new Error('No matching user found.');
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      console.error('User not found:', userId);
      throw new Error(`User not found: ${userId}`);
    }

    console.log('User fetched successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Get user error:', { userId, error });
    return {
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred while fetching user',
    };
  }
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  try {
    console.log('Updating user:', { userId, updates });
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', { userId, error });
      throw error;
    }

    console.log('User updated successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Update user error:', { userId, updates, error });
    return {
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred while updating user',
    };
  }
};

export const getUserByEmployeeCode = async (employeeCode: string) => {
  try {
    console.log('Fetching user by employee code:', employeeCode);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('employee_code', employeeCode)
      .single();

    if (error) {
      console.error('Error fetching user by employee code:', { employeeCode, error });
      throw error;
    }

    console.log('User fetched successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Get user by employee code error:', { employeeCode, error });
    return {
      data: null,
      error: error instanceof Error ? error.message : 'An error occurred while fetching user',
    };
  }
}; 