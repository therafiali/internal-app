"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { SupportHeader } from '@/app/components/Headers';
import { AdminHeader } from '@/app/components/Headers';
import SearchPage from '@/app/components/SearchPage';



interface User {
  name: string;
  email: string;
  department: string;
  role: string;
}

const page = () => {

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
      if (parsedUser.department !== 'Support' && parsedUser.department !== 'Admin') {
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
      {user?.department === "Support" ? (
         <SupportHeader user={user} />
       ) : (
         <AdminHeader user={user} />
       )}
     <SearchPage />
    </div>
  )
}

export default page