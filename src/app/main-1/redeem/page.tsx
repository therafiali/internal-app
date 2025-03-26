"use client"
import { useRouter } from 'next/navigation'
import { AdminHeader } from '@/app/components/Headers'
import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import { User } from '@/app/types'

interface RedeemRequest {
  redeemId: string;
  user: {
    name: string;
    avatar: string;
  };
  username: string;
  platform: string;
  amount: number;
  paymentMethod: {
    cashapp: string | null;
    venmo: string | null;
  };
  status: 'Pending' | 'Under Processing' | 'Processed' | 'Partial Paid' | 'Completed' | 'Rejected';
  created: string;
}

const staticRedeemRequests: RedeemRequest[] = [
  {
    redeemId: 'R-XMEMK',
    user: {
      name: 'Ansar Pirzada',
      avatar: '/avatars/ansar.jpg'
    },
    username: 'null',
    platform: 'Acebook',
    amount: 300.00,
    paymentMethod: {
      cashapp: 'none',
      venmo: 'none'
    },
    status: 'Pending',
    created: 'Jan 14, 2025 02:02'
  },
  {
    redeemId: 'R-BQJ1L',
    user: {
      name: 'Ansar Pirzada',
      avatar: '/avatars/ansar.jpg'
    },
    username: 'null',
    platform: 'VBlink',
    amount: 300.00,
    paymentMethod: {
      cashapp: 'none',
      venmo: 'none'
    },
    status: 'Processed',
    created: 'Jan 9, 2025 21:47'
  },
  {
    redeemId: 'R-PWRWL',
    user: {
      name: 'Ansar Pirzada',
      avatar: '/avatars/ansar.jpg'
    },
    username: 'Oshhjh',
    platform: 'Orion Stars',
    amount: 300.00,
    paymentMethod: {
      cashapp: '$rgvh',
      venmo: 'none'
    },
    status: 'Processed',
    created: 'Jan 8, 2025 07:17'
  }
];

const AdminRedeemPage = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Under Processing' | 'Processed' | 'Partial Paid' | 'Completed' | 'Rejected'>('All')
  const [redeemRequests] = useState<RedeemRequest[]>(staticRedeemRequests)
  const [user, setUser] = useState<User | null>(null)

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

  if (!user) return null

  const filteredRequests = redeemRequests.filter(request => {
    if (activeTab === 'All') return true;
    return request.status === activeTab;
  })

  const stats = {
    all: redeemRequests.length,
    pending: redeemRequests.filter(r => r.status === 'Pending').length,
    underProcessing: redeemRequests.filter(r => r.status === 'Under Processing').length,
    processed: redeemRequests.filter(r => r.status === 'Processed').length,
    partialPaid: redeemRequests.filter(r => r.status === 'Partial Paid').length,
    completed: redeemRequests.filter(r => r.status === 'Completed').length,
    rejected: redeemRequests.filter(r => r.status === 'Rejected').length
  }

  const handleLogout = () => {
    try {
      Cookies.remove('token')
      localStorage.removeItem('user')
      router.push('/login')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
    
      <div className="flex-1 pl-64">
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Redeem Requests
            </h1>
            <button className="p-2 rounded-lg hover:bg-gray-800">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button 
              onClick={() => setActiveTab('All')}
              className={`inline-flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'All' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              All ({stats.all})
            </button>
            <button 
              onClick={() => setActiveTab('Pending')}
              className={`inline-flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'Pending' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pending ({stats.pending})
            </button>
            <button 
              onClick={() => setActiveTab('Under Processing')}
              className={`inline-flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'Under Processing' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Under Processing ({stats.underProcessing})
            </button>
            <button 
              onClick={() => setActiveTab('Processed')}
              className={`inline-flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'Processed' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Processed ({stats.processed})
            </button>
            <button 
              onClick={() => setActiveTab('Partial Paid')}
              className={`inline-flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'Partial Paid' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Partial Paid ({stats.partialPaid})
            </button>
            <button 
              onClick={() => setActiveTab('Completed')}
              className={`inline-flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'Completed' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Completed ({stats.completed})
            </button>
            <button 
              onClick={() => setActiveTab('Rejected')}
              className={`inline-flex items-center px-4 py-2 rounded-lg ${
                activeTab === 'Rejected' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Rejected ({stats.rejected})
            </button>
          </div>

          {/* Requests Table */}
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">REDEEM ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">USER</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">USERNAME</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">PLATFORM</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">AMOUNT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">PAYMENT METHOD</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">PAYMENT USERNAME</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">STATUS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">CREATED</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredRequests.map((request, index) => (
                    <tr key={index} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-gray-300">{request.redeemId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            {request.user.name.charAt(0)}
                          </div>
                          <span className="ml-2 text-sm text-gray-300">{request.user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{request.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{request.platform}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">${request.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <span className="text-green-500 mr-2">$</span>
                            <span className="text-gray-300">Cashapp</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="text-blue-500 mr-2">V</span>
                            <span className="text-gray-300">Venmo</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-300">{request.paymentMethod.cashapp}</div>
                          <div className="text-sm text-gray-300">{request.paymentMethod.venmo}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          request.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          request.status === 'Under Processing' ? 'bg-blue-500/10 text-blue-500' :
                          request.status === 'Processed' ? 'bg-green-500/10 text-green-500' :
                          request.status === 'Partial Paid' ? 'bg-orange-500/10 text-orange-500' :
                          request.status === 'Completed' ? 'bg-green-500/10 text-green-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{request.created}</td>
                      <td className="px-4 py-3">
                        <button 
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                          onClick={() => {
                            console.log('View request:', request.redeemId)
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-800">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div>Showing {filteredRequests.length} entries</div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700">Previous</button>
                  <button className="px-3 py-1 rounded-lg bg-blue-500 text-white">1</button>
                  <button className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700">Next</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminRedeemPage 