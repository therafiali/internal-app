"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { SupportHeader } from '@/app/components/Headers'
import { User } from '@/app/types'
import DashboardPage from '@/app/components/DashboardPage'

const SupportDashboardPage = () => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.department !== 'Support') {
        router.push('/login')
        return
      }
      setUser(parsedUser)

    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    try {
      Cookies.remove('token')
      localStorage.removeItem('user')
      router.push('/login')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <SupportHeader user={user}  />
      <div className="flex-1 pl-64">
        <main className="p-8 space-y-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            Support Dashboard
          </h1>
        <DashboardPage />
        </main>
      </div>
    </div>
  )
}

export default SupportDashboardPage 