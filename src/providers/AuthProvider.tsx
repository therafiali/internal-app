'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from '@/redux/slices/authSlice';
import { AppDispatch, RootState } from '@/redux/store';
import { supabase } from '@/lib/supabase';
import Loader from '@/app/components/Loader';
import { getAuthState, clearAuthState, refreshAuthState } from '@/utils/auth';

const PUBLIC_ROUTES = ['/login', '/logout','/favicon-signup'];

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    let isRedirecting = false;

    const checkAuthentication = async () => {
      // Skip auth check on public routes
      if (PUBLIC_ROUTES.includes(pathname)) {
        return;
      }

      const isValid = await refreshAuthState();
      
      if (!isValid && !isRedirecting) {
        isRedirecting = true;
        router.push('/login');
        return;
      }

      // If valid, update Redux state
      dispatch(checkAuth());
    };

    checkAuthentication();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        clearAuthState();
        if (!PUBLIC_ROUTES.includes(pathname) && !isRedirecting) {
          isRedirecting = true;
          // router.push('/login');
        }
      } else if (!PUBLIC_ROUTES.includes(pathname)) {
        // checkAuthentication();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch, router, pathname]);

  // Handle redirects based on auth state
  useEffect(() => {
    if (!isLoading) {
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
      const { user } = getAuthState();

      if (!isAuthenticated && !isPublicRoute) {
        // router.push('/login');
      } else if (isAuthenticated && pathname === '/login' && user) {
        // Only redirect if explicitly on login page
        // Redirect based on user's department
        switch (user.department) {
          case 'Finance':
            router.push('/main/finance/cashtags');
            break;
          case 'Operations':
            router.push('/main/operations/recharge');
            break;
          case 'Verification':
            router.push('/main/verification/recharge');
            break;
          case 'Support':
            router.push('/main/support/search');
            break;
          case 'Audit':
            router.push('/main/audit/player-activity');
            break;
          case 'Admin':
            router.push('/main/users');
            break;
          default:
            router.push('/login');
        }
      }
    }
  }, [isLoading, isAuthenticated, pathname, router]);


  return <>{children}</>;
};

export default AuthProvider; 