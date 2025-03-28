'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Activity,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = () => {
    Cookies.remove('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const menuItems = [
    {
      title: 'Users',
      icon: <Users className="w-4 h-4" />,
      href: '/admin/users',
    },
    {
      title: 'Activity Logs',
      icon: <Activity className="w-4 h-4" />,
      href: '/admin/activity-logs',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-900">
 

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out bg-neutral-900',
         
        )}
      >
        <main className="">{children}</main>
      </div>
    </div>
  );
} 