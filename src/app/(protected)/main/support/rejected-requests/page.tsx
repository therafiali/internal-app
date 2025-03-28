'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle } from 'lucide-react'

interface RejectedRequest {
  status: string
  game_username: string
  game_platform: string
  credits_loaded: number
}

export default function RejectedRequestsPage() {
  const [requests, setRequests] = useState<RejectedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchRejectedRequests() {
      try {
        const { data, error } = await supabase
          .from('recharge_requests')
          .select('status, game_username, game_platform, credits_loaded')
          .eq('status', 'sc_rejected')

        if (error) throw error

        setRequests(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchRejectedRequests()
  }, [supabase])

  // make a method that converts string "sc_rejected" to "Rejected
  // "
  const convertStatus = (status: string) => {
    if (status === 'sc_rejected') return 'Rejected'
    return status
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-destructive font-semibold">Error loading requests</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container ml-64 mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 p-6 rounded-lg backdrop-blur-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Rejected Recharge Requests
            </h1>
            <p className="text-muted-foreground mt-2">
              Displaying all recharge requests with rejected status
            </p>
          </div>
          <Badge variant="destructive" className="px-4 py-2 text-sm font-medium shadow-lg hover:shadow-red-500/20 transition-shadow">
            {requests.length} Rejected
          </Badge>
        </div>

        <Card className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-white shadow-xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-900 border-b border-neutral-800">
                  <TableHead className="font-semibold text-gray-300">Status</TableHead>
                  <TableHead className="font-semibold text-gray-300">Game Username</TableHead>
                  <TableHead className="font-semibold text-gray-300">Game Platform</TableHead>
                  <TableHead className="font-semibold text-gray-300 text-right">Credits Loaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <p>No rejected requests found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request, index) => (
                    <TableRow 
                      key={index} 
                      className="hover:bg-neutral-800/50 transition-colors duration-200 border-b border-neutral-800"
                    >
                      <TableCell>
                        <Badge 
                          variant="destructive" 
                          className="font-medium shadow-sm hover:shadow-red-500/20 transition-shadow"
                        >
                          {convertStatus(request.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-gray-100">{request.game_username}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="font-medium text-white border-neutral-700 bg-neutral-800/50 shadow-sm"
                        >
                          {request.game_platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-medium text-emerald-400">
                          {request.credits_loaded.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  )
}
