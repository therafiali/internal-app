"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '@/app/components/Headers'
import Cookies from 'js-cookie'
import { User } from '@/app/types'

// interface User {
//   username: string;
//   role: string;
//   status: string;
//   lastLogin: string;
// }

const AdminDashboardPage = () => {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  
  // const [showAddModal, setShowAddModal] = useState(false)
  // const [showEditModal, setShowEditModal] = useState(false)
  // const [showDeleteModal, setShowDeleteModal] = useState(false)
  // const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Dummy users data

  interface RecentRedeem {
    redeemId: string;
    username: string;
    platform: string;
    amount: string;
    status: string;
    createdAt: string;
  }
  
  interface SystemLog {
    timestamp: string;
    level: 'INFO' | 'WARNING' | 'ERROR';
    message: string;
  }
  
  const recentRedeems: RecentRedeem[] = [
    {
      redeemId: 'R-ABCD1',
      username: 'Gv_ishbs',
      platform: 'Game Vault',
      amount: '$100.00',
      status: 'pending',
      createdAt: '2024-01-14 18:29'
    },
    {
      redeemId: 'R-EFGH2',
      username: 'Vb-onsjs',
      platform: 'VBlink',
      amount: '$50.00',
      status: 'completed',
      createdAt: '2024-01-14 18:26'
    },
    {
      redeemId: 'R-IJKL3',
      username: 'Odnndje',
      platform: 'Orion Stars',
      amount: '$75.00',
      status: 'rejected',
      createdAt: '2024-01-13 21:30'
    }
  ]

  // Add dummy data for System Logs
  const systemLogs: SystemLog[] = [
    {
      timestamp: '2024-01-14 18:30:00',
      level: 'INFO',
      message: 'User Gv_ishbs submitted redeem request R-ABCD1'
    },
    {
      timestamp: '2024-01-14 18:29:00',
      level: 'WARNING',
      message: 'Payment gateway timeout for transaction T-12345'
    },
    {
      timestamp: '2024-01-14 18:28:00',
      level: 'ERROR',
      message: 'Failed to process withdrawal request R-EFGH2'
    }
  ]

  interface DepartmentStats {
    name: string;
    pending: number;
    icon: React.ReactNode;
    color: string;
    route: string;
  }

  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([
    {
      name: "Support Tickets",
      pending: 12,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: "emerald",
      route: "/main/support"
    },
    {
      name: "Pending Recharges",
      pending: 8,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "blue",
      route: "/main/finance/recharge"
    },
    {
      name: "Pending Redeems",
      pending: 5,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      color: "amber",
      route: "/main/finance/redeem"
    },
    {
      name: "Pending Verifications",
      pending: 15,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: "purple",
      route: "/main/verification"
    }
  ])

  // Filter recentRedeems to show only pending
  const pendingRedeems = recentRedeems.filter(redeem => redeem.status === 'pending')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.department !== 'Admin') {
        router.push('/dashboard')
        return
      }
      setUser(parsedUser)
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/login')
    }
  }, [router])

  // const handleAddUser = () => {
  //   setShowAddModal(true)
  // }

  // const handleEditUser = (user: User) => {
  //   setSelectedUser(user)
  //   setShowEditModal(true)
  // }

  // const handleDeleteUser = (user: User) => {
  //   setSelectedUser(user)
  //   setShowDeleteModal(true)
  // }

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
      {/* Side Navigation */}
      <AdminHeader user={user}  />

      {/* Main Content */}
      <div className="flex-1 pl-64">
        <div className="p-8">
          {/* Pending Stats */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Pending Requests Overview</h2>
            <div className="grid grid-cols-4 gap-6">
              {departmentStats.map((dept) => (
                <div 
                  key={dept.name} 
                  className={`relative bg-[#1a1a1a] rounded-2xl p-6 before:absolute before:inset-0 before:bg-gradient-to-b before:from-${dept.color}-500/20 before:to-transparent before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 group cursor-pointer`}
                  onClick={() => router.push(dept.route)}
                >
                  <div className={`absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-${dept.color}-500/50 to-transparent`}></div>
                  <div className={`absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-${dept.color}-500/10 to-transparent`}></div>
                  <div className={`absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-${dept.color}-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  <div className={`absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-${dept.color}-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`text-sm text-${dept.color}-500 font-medium tracking-wider`}>{dept.name}</div>
                      <div className={`p-2 bg-${dept.color}-500/10 rounded-lg text-${dept.color}-500`}>
                        {dept.icon}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className={`text-3xl font-bold text-${dept.color}-500 mb-1`}>{dept.pending}</div>
                      <div className="text-sm text-gray-400">Pending Requests</div>
                    </div>
                    
                    <div className={`flex items-center justify-between text-xs text-${dept.color}-500 bg-${dept.color}-500/10 rounded-lg px-3 py-2 backdrop-blur-sm`}>
                      <span>View Details</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-2 gap-6">
            {/* Pending Redeem Requests */}
            <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Pending Redeem Requests</h2>
                  <button 
                    onClick={() => router.push('/main/finance/redeem')}
                    className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {pendingRedeems.length > 0 ? (
                    pendingRedeems.map((redeem) => (
                      <div key={redeem.redeemId} className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{redeem.username}</div>
                            <div className="text-xs text-gray-400">{redeem.platform}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-yellow-500">{redeem.amount}</div>
                          <div className="text-xs text-gray-400">{redeem.createdAt}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No pending redeem requests
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent System Logs */}
            <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Recent System Alerts</h2>
                  <button className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors">
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {systemLogs.filter(log => log.level === 'WARNING' || log.level === 'ERROR').map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          log.level === 'WARNING' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {log.level === 'WARNING' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-300">{log.message}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap ml-4">
                        {log.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage 