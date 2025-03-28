"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('page is visible')
        router.replace(window.location.pathname); // Triggers re-fetching on page regain focus
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [router, pathname]);



  return (
     children 
    )
}  