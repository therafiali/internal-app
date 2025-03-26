"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'


export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('token')
    if (token) {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        switch (user.department) {
          case 'Finance':
            router.push('/main/finance/cashtags')
            break
          case 'Operations':
            router.push('/main/operations/recharge')
            break
          case 'Verification':
            router.push('/main/verification/recharge')
            break
          default:
            Cookies.remove('token')
            router.push('/login')
        }
      } else {
        Cookies.remove('token')
        router.push('/login')
      }
    } else {
      Cookies.remove('token')
      router.push('/login')
    }
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
}
