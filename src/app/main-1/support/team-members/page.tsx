"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { AdminHeader, SupportHeader } from '@/app/components/Headers'
import { User } from '@/app/types'
import TeamMembersPage from '@/app/components/TeamMembersPage'

const TeamMembersView = () => {
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
      // Allow access only if user is Executive
      if (parsedUser.role !== 'Executive' && parsedUser.role !== 'Manager' && parsedUser.role !== 'Shift Incharge') {
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
      {/* {user.role === 'Executive' && (
        <AdminHeader user={user} />
      )}
      {(user.role === 'Manager' || user.role === 'Shift Incharge') && (
        <SupportHeader user={user} />
      )} */}
      <div className="flex-1 pl-64">
        <main className="space-y-12">
          <TeamMembersPage />
        </main>
      </div>
    </div>
  )
}

export default TeamMembersView 