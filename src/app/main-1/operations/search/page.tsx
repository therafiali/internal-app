"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { OperationsHeader } from '@/app/components/Headers';
import { AdminHeader } from '@/app/components/Headers';
import SearchPage from '@/app/components/SearchPage';

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

const Page = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = Cookies.get('token');
    const userData = localStorage.getItem('user');


    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.department !== 'Operations' && parsedUser.department !== 'Admin') {
        router.push('/login');
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  if (!user) return null;
  
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">


      <div className="flex-1  w-full">
        <SearchPage />
      </div>
    </div>
  )
}

export default Page;