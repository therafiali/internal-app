'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/app/components/Headers';
import { createClient } from '@supabase/supabase-js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ActivityType } from '@/types/activity';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgentImage } from '@/app/components/recharge/AgentImage';

interface ActivityLog {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_department: string;
  agent_role: string;
  action_type: string;
  action_description: string;
  target_resource: string;
  target_resource_id: string | null;
  status: 'success' | 'failure' | 'pending';
  ip_address: string;
  browser: string;
  operating_system: string;
  additional_details: Record<string, any>;
  error_details: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  
  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const token = Cookies.get('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.department !== 'Admin') {
        router.push('/login');
        return;
      }
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    Cookies.remove('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Apply filters
      let baseQuery = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' });

      if (actionTypeFilter !== 'all') {
        baseQuery = baseQuery.eq('action_type', actionTypeFilter);
      }
      if (statusFilter !== 'all') {
        baseQuery = baseQuery.eq('status', statusFilter);
      }
      if (departmentFilter !== 'all') {
        baseQuery = baseQuery.eq('agent_department', departmentFilter);
      }
      if (searchQuery) {
        baseQuery = baseQuery.or(`agent_name.ilike.%${searchQuery}%,action_description.ilike.%${searchQuery}%`);
      }

      // Get data with pagination
      const { data: logsData, error: logsError, count } = await baseQuery
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (logsError) {
        throw logsError;
      }

      setLogs(logsData || []);
      setTotalItems(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Set up realtime subscription
    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          // Refresh the logs when there's any change
          fetchLogs();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage, actionTypeFilter, statusFilter, departmentFilter, searchQuery]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'failure':
        return 'bg-red-500/10 text-red-500';
      case 'pending':
        return 'bg-amber-500/10 text-amber-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const handleRowClick = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const formatResponse = (response: any): React.ReactNode => {
    if (!response) return "-";
    try {
      const parsed = typeof response === 'string' ? JSON.parse(response) : response;
      if (parsed.data) {
        const data = parsed.data;
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400">Status:</span>
                <Badge className={`ml-2 ${parsed.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {parsed.success ? 'Success' : 'Failed'}
                </Badge>
              </div>
              {parsed.message && (
                <div>
                  <span className="text-gray-400">Message:</span>
                  <span className="ml-2">{parsed.message}</span>
                </div>
              )}
            </div>
            {data && (
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(data).map(([key, value]) => {
                    // Skip internal fields and long objects
                    if (['__v', '_id', 'id', 'createdAt', 'updatedAt'].includes(key)) return null;
                    if (typeof value === 'object' && value !== null) return null;
                    
                    return (
                      <div key={key} className="flex items-center">
                        <span className="text-gray-400 capitalize">{key.split(/(?=[A-Z])/).join(" ")}:</span>
                        <span className="ml-2">{value?.toString() || "-"}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Render nested objects separately */}
                {Object.entries(data).map(([key, value]) => {
                  if (typeof value !== 'object' || value === null || ['__v', '_id', 'id'].includes(key)) return null;
                  
                  return (
                    <div key={key} className="mt-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2 capitalize">{key.split(/(?=[A-Z])/).join(" ")}</h4>
                      <div className="bg-black/20 p-3 rounded-lg grid grid-cols-2 gap-3">
                        {Object.entries(value as object).map(([subKey, subValue]) => (
                          <div key={subKey} className="flex items-center">
                            <span className="text-gray-400 capitalize">{subKey.split(/(?=[A-Z])/).join(" ")}:</span>
                            <span className="ml-2">{subValue?.toString() || "-"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(response);
    }
  };

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return "-";
    
    // If the key contains 'response', use the formatted response renderer
    if (typeof value === 'object' || (typeof value === 'string' && value.trim().startsWith('{'))) {
      return formatResponse(value);
    }
    
    // For status changes, render with badges
    if (typeof value === 'string' && (value === 'active' || value === 'paused' || value === 'blocked')) {
      return (
        <Badge className={
          value === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
          value === 'paused' ? 'bg-amber-500/10 text-amber-500' :
          'bg-red-500/10 text-red-500'
        }>
          {value}
        </Badge>
      );
    }

    // For cashtags, render with special formatting
    if (typeof value === 'string' && value.startsWith('$')) {
      return <span className="font-mono text-blue-400">{value}</span>;
    }

    return String(value);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="">
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Activity Logs
            </h1>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-xl">
            <div className="p-6 border-b border-gray-800">
              <div className="flex flex-wrap gap-4">
                <Input
                  placeholder="Search by agent name, email, or description..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="max-w-xs bg-[#18181b] text-white placeholder:text-gray-500 border-gray-800"
                />
                <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                  <SelectTrigger className="w-[200px] bg-[#18181b] text-white border-gray-800">
                    <SelectValue placeholder="Filter by action type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-gray-800">
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                    <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
                    <SelectItem value="REDEEM_APPROVE">Redeem Approve</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px] bg-[#18181b] text-white border-gray-800">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-gray-800">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[200px] bg-[#18181b] text-white border-gray-800">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-gray-800">
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-[#252b3b] border-b border-gray-800">
                    <TableHead className="text-gray-400">Timestamp</TableHead>
                    <TableHead className="text-gray-400">Agent</TableHead>
                    <TableHead className="text-gray-400">Department</TableHead>
                    <TableHead className="text-gray-400">Role</TableHead>
                    <TableHead className="text-gray-400">Action Type</TableHead>
                    <TableHead className="text-gray-400">Description</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Browser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                          <span className="ml-2 text-gray-400">Loading...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-red-500">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-gray-400">
                        No activity logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="hover:bg-[#252b3b] border-b border-gray-800 cursor-pointer"
                        onClick={() => handleRowClick(log)}
                      >
                        <TableCell className="text-white">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <div>
                         
                            {
                              log.agent_id ? (
                                <AgentImage id={log.agent_id} width={32} height={32} />
                              )
                              : (
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                               {log.agent_name}
                                </div>
                              )
                            }
                          </div>
                        </TableCell>
                        <TableCell className="text-white">{log.agent_department}</TableCell>
                        <TableCell className="text-white">{log.agent_role}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-gray-800 text-white capitalize">
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-white" title={log.action_description}>
                            {log.action_description}
                          </div>
                        </TableCell>
                        <TableCell className='capitalize'>
                          <Badge className={getStatusBadgeColor(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm text-white">{log.browser}</div>
                            <div className="text-xs text-gray-400">{log.operating_system}</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Details Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="bg-[#1a1a1a] text-white border border-gray-800 max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b border-gray-800 px-6 py-4">
                  <DialogTitle className="text-xl font-bold">Activity Log Details</DialogTitle>
                </DialogHeader>
                {selectedLog && (
                  <div className="space-y-4 overflow-y-auto px-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-400">Timestamp</h3>
                        <p>{format(new Date(selectedLog.created_at), 'MMM d, yyyy HH:mm:ss')}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-400">Agent Information</h3>
                        <p className="font-medium">{selectedLog.agent_name || "-"}</p>
                        <p>Department: {selectedLog.agent_department || "-"}</p>
                        <p>Role: {selectedLog.agent_role || "-"}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-400">Action Details</h3>
                        <Badge variant="outline" className="border-gray-800 text-white">
                          {selectedLog.action_type || "-"}
                        </Badge>
                        <p className="mt-2">{selectedLog.action_description || "-"}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-400">Status</h3>
                        <Badge className={getStatusBadgeColor(selectedLog.status)}>
                          {selectedLog.status || "-"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-400">System Information</h3>
                        <p>IP Address: {selectedLog.ip_address || "-"}</p>
                        <p>Browser: {selectedLog.browser || "-"}</p>
                        <p>OS: {selectedLog.operating_system || "-"}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-400">Resource Information</h3>
                        <p>Target Resource: {selectedLog.target_resource || "-"}</p>
                        <p>Resource ID: {selectedLog.target_resource_id || "-"}</p>
                      </div>
                    </div>
                    {selectedLog.additional_details && Object.keys(selectedLog.additional_details).length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-400">Additional Details</h3>
                        <div className="bg-[#0a0a0a] p-4 rounded-lg space-y-4">
                          {Object.entries(selectedLog.additional_details).map(([key, value]) => (
                            <div key={key}>
                              <div className="text-gray-400 capitalize mb-2">
                                {key.split(/(?=[A-Z])/).join(" ")}:
                              </div>
                              <div className="pl-4 text-white">
                                {renderValue(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <div className="p-4 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  {totalItems > 0 ? (
                    <>
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                    </>
                  ) : (
                    'No entries to show'
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                    className="border-gray-800 text-white hover:bg-[#252b3b] disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                    className="border-gray-800 text-white hover:bg-[#252b3b] disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}