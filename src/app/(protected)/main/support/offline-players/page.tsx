"use client"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useRedeemRequests, useUpdatePlayerStatus } from "@/hooks/useOfflinePlayers"
import { toast } from "sonner"
import Image from "next/image"

export default function RedeemRequestsPage() {
  const { data: requests, isLoading, error } = useRedeemRequests()
  const { mutate: updateStatus, isPending } = useUpdatePlayerStatus()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-800 flex-1 pl-64">
        <div className="container mx-auto px-4 py-8">
          Loading redeem requests...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-800 flex-1 pl-64">
        <div className="container mx-auto px-4 py-8">
          <div className="text-red-400">
            Error loading redeem requests: {(error as Error).message}
          </div>
        </div>
      </div>
    )
  }

  const handleSetOnline = (playerId: string) => {
    updateStatus(playerId, {
      onSuccess: () => {
        toast.success('Player status updated successfully')
      },
      onError: (error: Error) => {
        toast.error(`Failed to update player status: ${error.message}`)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-800 flex-1 pl-64">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-4">
          <h1 className="text-2xl font-bold text-white">Pending Redeem Requests</h1>
          <p className="text-gray-400">
            View and manage queued and partially paid redeem requests that are more than 1 hour old
          </p>
        </div>

        <div className="space-y-6">
          {requests?.map((request) => (
            <div key={request.id} className="bg-gray-900 rounded-lg border border-gray-700">
              <div className="p-6">
                <div className="flex items-start space-x-6">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={request.player?.profile.profilePic || 'https://via.placeholder.com/80'}
                      alt={request.player_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white truncate">
                        {request.player?.profile.fullName || request.player_name}
                      </h2>
                      <div className="flex items-center space-x-2">
                        {/* <Badge 
                          variant={request.status === "queued_partially_paid" ? "secondary" : "default"}
                          className="bg-opacity-10"
                        >
                          {request.status === "queued_partially_paid" ? "Partially Paid" : "Queued"}
                        </Badge> */}
                        {/* <Badge 
                          variant={request.player?.redeem_online_status ? "default" : "destructive"}
                          className="bg-opacity-10"
                        >
                          {request.player?.redeem_online_status ? "Online" : "Offline"}
                        </Badge> */}
                        {request.total_requests > 1 && (
                          <Badge variant="outline" className="bg-opacity-10">
                            {request.total_requests} Requests
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      VIP Code: {request.vip_code}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        Latest Amount: <span className="text-white">${request.amount}</span> • 
                        Requested: <span className="text-white">
                          {new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {request.player && !request.player.redeem_online_status && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleSetOnline(request.player!.id)}
                          className="text-green-400 border-green-600 hover:text-green-300 hover:border-green-500"
                        >
                          {isPending ? 'Updating...' : 'Set Online'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {requests?.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            No pending redeem requests found.
          </div>
        )}
      </div>
    </div>
  )
}
