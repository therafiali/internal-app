import React from 'react'

interface Player {
  id: string;
  name: string;
  platform: string;
  username: string;
  teamCode: string;
  status: string;
  lastActive: string;
}

export const PlayersDirectory = () => {
  // Sample data - replace with actual data fetching
  const players: Player[] = [
    {
      id: '1',
      name: 'John Smith',
      platform: 'VBlink',
      username: 'john123',
      teamCode: 'ENT-1',
      status: 'Active',
      lastActive: '2025-01-14'
    }
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">NAME</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">PLATFORM</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">USERNAME</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">TEAM CODE</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">STATUS</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">LAST ACTIVE</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {players.map((player) => (
            <tr key={player.id} className="hover:bg-gray-800/30">
              <td className="px-4 py-3 text-sm text-gray-300">{player.id}</td>
              <td className="px-4 py-3">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-500 font-medium text-sm">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="ml-3 text-sm text-gray-300">{player.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-300">{player.platform}</td>
              <td className="px-4 py-3 text-sm text-gray-300">{player.username}</td>
              <td className="px-4 py-3">
                <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full text-xs">
                  {player.teamCode}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full text-xs">
                  {player.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-300">{player.lastActive}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div>Showing {players.length} entries</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Previous
            </button>
            <button className="px-3 py-1 rounded-lg bg-blue-500 text-white">
              1
            </button>
            <button className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 