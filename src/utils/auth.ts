import { supabase } from '@/lib/supabase';
import Cookies from 'js-cookie';
import { signOut } from '@/supabase/auth';
import { User } from '@/types/user';
import { ActivityLogger } from './activityLogger';

export const TOKEN_COOKIE_NAME = 'token';
export const USER_STORAGE_KEY = 'user';

export const setAuthState = (token: string, user: User) => {
  // Set token in cookie with expiry
  Cookies.set(TOKEN_COOKIE_NAME, token, { expires: 7 }); // 7 days expiry
  // Set user in localStorage
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

  console.log('user', user);
  // Log successful login
  ActivityLogger.logAuth({
    userId: user.id,
    userName: user.name,
    department: user.department,
    role: user.role,
    action: 'login'
  });
};

export const getAuthState = () => {
  const token = Cookies.get(TOKEN_COOKIE_NAME);
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
  }

  return { token, user };
};

export const clearAuthState = () => {
  // Clear all cookies that might contain auth data
  const cookies = Cookies.get();
  Object.keys(cookies).forEach(cookie => {
    Cookies.remove(cookie);
  });
  
  // Clear all auth-related localStorage items
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem('sb-access-token');
  localStorage.removeItem('sb-refresh-token');
  
  // Clear any session storage items
  sessionStorage.clear();
};

export const isValidAuthState = () => {
  const { token, user } = getAuthState();
  return !!(token && user);
};

export const refreshAuthState = async () => {
  const { token, user } = getAuthState();
  
  if (!token) {
    clearAuthState(); // Clear everything if token is missing
    return false;
  }
  
  if (!user) {
    clearAuthState(); // Clear everything if user data is missing
    return false;
  }
  
  return true;
};

export const handleLogout = async () => {
  try {
    const { user } = getAuthState();
    
    if (user) {
      // Set user_activity to false in Supabase
      const { error: updateError } = await supabase
        .from('users')
        .update({ user_activity: false })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user activity status:', updateError);
      }

      // Log successful logout
      await ActivityLogger.logAuth({
        userId: user.id,
        userName: user.name,
        department: user.department,
        role: user.role,
        action: 'logout'
      });
    }
    
    // Call Supabase signOut to clear server-side session
    await signOut();
    
    // Clear all client-side auth state
    clearAuthState();
    
    // Force a clean reload to ensure all state is cleared
    window.location.href = '/login';
  } catch (error) {
    console.error('Error during logout:', error);
    
    // Log error if we have user info
    const { user } = getAuthState();
    if (user) {
      await ActivityLogger.logAuth({
        userId: user.id,
        userName: user.name,
        department: user.department,
        role: user.role,
        action: 'logout',
        status: 'error',
        error
      });
    }
    
    // Still try to clear state and redirect even if there's an error
    clearAuthState();
    window.location.href = '/login';
  }
};

// Add this function to periodically clean up storage
export const cleanupStorage = () => {
  try {
    // Clear old Supabase tokens if they exist
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('sb-') && key !== `sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error cleaning up storage:', error);
  }
};

// Call this on app init or login
cleanupStorage(); 