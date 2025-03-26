// "use client"
// import React, { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import Cookies from 'js-cookie'
// import { SupportHeader } from '@/app/components/Headers'

// interface User {
//   name: string;
//   email: string;
//   department: string;
//   role: string;
// }

// interface PlayerDetails {
//   vipCode: string;
//   name: string;
//   username: string;
//   team: string;
//   email: string;
//   phone: string;
//   currentTime: string;
//   timezone: string;
//   platform: string;
//   joinedDate: string;
//   lastSeen: string;
//   profilePic: string;
// }

// interface PlayerDetailsClientProps {
//   vipCode: string;
// }

// const gameLimits = [
//   { name: 'Daily Remaining', limit: '$2000/2000' },
//   { name: 'Orion Stars', limit: '$500/500' },
//   { name: 'Fire Kirin', limit: '$500/500' },
//   { name: 'Game Vault', limit: '$500/500' },
//   { name: 'VBlink', limit: '$500/500' },
//   { name: 'Vegas Sweeps', limit: '$500/500' },
//   { name: 'Ultra Panda', limit: '$500/500' },
//   { name: 'Yolo', limit: '$500/500' },
//   { name: 'Juwa', limit: '$500/500' },
//   { name: 'Moolah', limit: '$500/500' },
//   { name: 'Panda Master', limit: '$500/500' }
// ]

// const PlayerDetailsClient = ({ vipCode }: PlayerDetailsClientProps) => {
//   const router = useRouter()
//   const [user, setUser] = useState<User | null>(null)
//   const [playerDetails, setPlayerDetails] = useState<PlayerDetails>({
//     vipCode,
//     name: "John Smith",
//     username: "@vip20",
//     team: "ENT-1",
//     email: "No email",
//     phone: "No phone",
//     currentTime: "11:22 AM",
//     timezone: "(America/Chicago)",
//     platform: "No platform",
//     joinedDate: "Jan 08 2025",
//     lastSeen: "6 days ago",
//     profilePic: "https://ui-avatars.com/api/?name=John+Smith&background=random&color=fff&size=96"

//   })

//   console.log("playerDetails", playerDetails);
//   useEffect(() => {
//     const token = Cookies.get('token')
//     const userData = localStorage.getItem('user')

//     if (!token || !userData) {
//       router.push('/login')
//       return
//     }

//     try {
//       const parsedUser = JSON.parse(userData)
//       if (parsedUser.department !== 'Support') {
//         router.push('/dashboard')
//         return
//       }
//       setUser(parsedUser)
//     } catch (error) {
//       console.error('Error parsing user data:', error)
//       router.push('/login')
//     }
//   }, [])

//   const handleLogout = () => {
//     Cookies.remove('token')
//     localStorage.removeItem('user')
//     router.push('/login')
//   }

//   if (!user) return null

//   return (
//     <div className="flex min-h-screen bg-[#0a0a0a]">
//       <SupportHeader user={user}  />
//       <div className="flex-1 pl-64">
//         <main className="p-8 max-w-7xl mx-auto">
//           <div className="grid grid-cols-3 gap-6">
//             {/* Left Column */}
//             <div className="col-span-1">
//               <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800/20">
//                 <div className="flex items-center justify-between mb-4">
//                   <span className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm">{playerDetails.vipCode}</span>
//                   <span className="bg-green-500 text-white px-3 py-1 rounded-md text-sm">Active</span>
//                 </div>

//                 <div className="flex flex-col items-center mb-6">
//                   <div className="w-24 h-24 bg-gray-700 rounded-full mb-4">
//                     <img
//                       src={playerDetails.profilePic}
//                       alt={playerDetails.name}
//                       className="w-24 h-24 rounded-full bg-red-500"
//                     />
//                   </div>
//                   <h2 className="text-xl font-semibold text-white">{playerDetails.name}</h2>
//                   <p className="text-gray-400">{playerDetails.username}</p>
//                 </div>

//                 <div className="space-y-4">
//                   <div className="flex items-center">
//                     <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//                     </svg>
//                     <span className="text-sm text-gray-400">Team: </span>
//                     <span className="ml-2 text-sm bg-blue-500 text-white px-2 py-0.5 rounded">{playerDetails.team}</span>
//                   </div>
//                   <div className="flex items-center">
//                     <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//                     </svg>
//                     <span className="text-sm text-gray-400">{playerDetails.email}</span>
//                   </div>
//                   <div className="flex items-center">
//                     <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
//                     </svg>
//                     <span className="text-sm text-gray-400">{playerDetails.phone}</span>
//                   </div>
//                   <div className="flex items-center">
//                     <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                     <span className="text-sm text-gray-400">Current Time: {playerDetails.currentTime}</span>
//                   </div>
//                   <div className="flex items-center ml-8">
//                     <span className="text-sm text-gray-400">{playerDetails.timezone}</span>
//                   </div>
//                   <div className="flex items-center">
//                     <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
//                     </svg>
//                     <span className="text-sm text-gray-400">{playerDetails.platform}</span>
//                   </div>
//                   <div className="flex items-center">
//                     <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                     </svg>
//                     <span className="text-sm text-gray-400">Joined: {playerDetails.joinedDate}</span>
//                   </div>
//                   <div className="flex items-center">
//                     <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                     </svg>
//                     <span className="text-sm text-gray-400">Last seen: {playerDetails.lastSeen}</span>
//                   </div>
//                 </div>
//               </div>

//               {/* Game Limits Section */}
//               <div className="bg-[#1a1a1a] rounded-2xl mt-6 p-6 border border-gray-800/20">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="flex items-center">
//                     <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                     </svg>
//                     <h3 className="text-lg font-medium text-white">Remaining Game Limits</h3>
//                   </div>
//                   <button className="p-1 hover:bg-gray-800 rounded">
//                     <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                     </svg>
//                   </button>
//                 </div>
//                 <div className="space-y-3">
//                   {gameLimits.map((game, index) => (
//                     <div key={index} className="flex justify-between items-center">
//                       <span className="text-sm text-gray-400">{game.name}</span>
//                       <span className={`text-sm ${game.name === 'Daily Remaining' ? 'bg-blue-500 text-white px-2 py-0.5 rounded' : 'text-gray-300'}`}>
//                         {game.limit}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Payment Methods Section */}
//               <div className="bg-[#1a1a1a] rounded-2xl mt-6 p-6 border border-gray-800/20">
//                 <div className="flex items-center mb-4">
//                   <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
//                   </svg>
//                   <h3 className="text-lg font-medium text-white">Payment Methods</h3>
//                 </div>
//                 <p className="text-sm text-gray-400">
//                   No payment methods added
//                 </p>
//               </div>
//             </div>

//             {/* Right Column */}
//             <div className="col-span-2">
//               {/* Notes Section */}
//               <div className="bg-[#1a1a1a] rounded-2xl p-6 mb-6 border border-gray-800/20">
//                 <div className="flex items-center mb-4">
//                   <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//                   </svg>
//                   <h3 className="text-lg font-medium text-white">Notes</h3>
//                 </div>
//                 <p className="text-sm text-gray-400">No notes available</p>
//               </div>

//               {/* Redeem History Section */}
//               <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20 mb-6">
//                 <div className="p-6 border-b border-gray-800">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center">
//                       <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                       </svg>
//                       <h3 className="text-lg font-medium text-white">Redeem History</h3>
//                     </div>
//                     <div className="bg-blue-500 text-white px-4 py-1 rounded-lg text-sm">
//                       Total Redeemed: $0.00
//                     </div>
//                   </div>
//                 </div>
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead>
//                       <tr className="bg-gray-800/50">
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">REDEEM ID</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">AMOUNT</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">PLATFORM</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">STATUS</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">DATE</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">ACTIONS</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-800">
//                       <tr className="hover:bg-gray-800/30">
//                         <td className="px-6 py-4 text-sm text-gray-300">RD-2024-001</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">$500.00</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Orion Stars</td>
//                         <td className="px-6 py-4">
//                           <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded-full text-xs">Completed</span>
//                         </td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Jan 15, 2024</td>
//                         <td className="px-6 py-4">
//                           <button className="text-blue-500 hover:text-blue-600">View</button>
//                         </td>
//                       </tr>
//                       <tr className="hover:bg-gray-800/30">
//                         <td className="px-6 py-4 text-sm text-gray-300">RD-2024-002</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">$300.00</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Fire Kirin</td>
//                         <td className="px-6 py-4">
//                           <span className="bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full text-xs">Pending</span>
//                         </td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Jan 18, 2024</td>
//                         <td className="px-6 py-4">
//                           <button className="text-blue-500 hover:text-blue-600">View</button>
//                         </td>
//                       </tr>
//                     </tbody>
//                   </table>
//                 </div>
//                 <div className="px-6 py-4 bg-[#1a1a1a] border-t border-gray-800">
//                   <div className="flex items-center justify-between">
//                     <div className="text-sm text-gray-400">
//                       Showing 1 to 2 of 2 entries
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <button className="px-3 py-1 text-sm text-gray-400 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50" disabled>
//                         Previous
//                       </button>
//                       <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded">
//                         1
//                       </button>
//                       <button className="px-3 py-1 text-sm text-gray-400 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50" disabled>
//                         Next
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Recharge Requests Section */}
//               <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800/20">
//                 <div className="p-6 border-b border-gray-800">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center">
//                       <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                       </svg>
//                       <h3 className="text-lg font-medium text-white">Recharge Requests</h3>
//                     </div>
//                     <div className="bg-blue-500 text-white px-4 py-1 rounded-lg text-sm">
//                       Total Recharged: $1,200.00
//                     </div>
//                   </div>
//                 </div>
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead>
//                       <tr className="bg-gray-800/50">
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">RECHARGE ID</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">AMOUNT</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">PLATFORM</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">STATUS</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">DATE</th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">SCREENSHOT</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-800">
//                       <tr className="hover:bg-gray-800/30">
//                         <td className="px-6 py-4 text-sm text-gray-300">RC-2024-001</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">$700.00</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Orion Stars</td>
//                         <td className="px-6 py-4">
//                           <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded-full text-xs">Approved</span>
//                         </td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Jan 14, 2024</td>
//                         <td className="px-6 py-4">
//                           <button className="text-blue-500 hover:text-blue-600">View Image</button>
//                         </td>
//                       </tr>
//                       <tr className="hover:bg-gray-800/30">
//                         <td className="px-6 py-4 text-sm text-gray-300">RC-2024-002</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">$500.00</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Fire Kirin</td>
//                         <td className="px-6 py-4">
//                           <span className="bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full text-xs">Pending</span>
//                         </td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Jan 17, 2024</td>
//                         <td className="px-6 py-4">
//                           <button className="text-blue-500 hover:text-blue-600">View Image</button>
//                         </td>
//                       </tr>
//                       <tr className="hover:bg-gray-800/30">
//                         <td className="px-6 py-4 text-sm text-gray-300">RC-2024-003</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">$300.00</td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Game Vault</td>
//                         <td className="px-6 py-4">
//                           <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded-full text-xs">Rejected</span>
//                         </td>
//                         <td className="px-6 py-4 text-sm text-gray-300">Jan 18, 2024</td>
//                         <td className="px-6 py-4">
//                           <button className="text-blue-500 hover:text-blue-600">View Image</button>
//                         </td>
//                       </tr>
//                     </tbody>
//                   </table>
//                 </div>
//                 <div className="px-6 py-4 bg-[#1a1a1a] border-t border-gray-800">
//                   <div className="flex items-center justify-between">
//                     <div className="text-sm text-gray-400">
//                       Showing 1 to 3 of 3 entries
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <button className="px-3 py-1 text-sm text-gray-400 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50" disabled>
//                         Previous
//                       </button>
//                       <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded">
//                         1
//                       </button>
//                       <button className="px-3 py-1 text-sm text-gray-400 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50" disabled>
//                         Next
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </main>
//       </div>
//     </div>
//   )
// }

// export default PlayerDetailsClient 


import React from 'react'

const PlayerDetailsClient = () => {
  return (
    <div>PlayerDetailsClient</div>
  )
}

export default PlayerDetailsClient