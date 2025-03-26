"use client"

import { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import { FiArrowDown, FiEdit2, FiDollarSign } from 'react-icons/fi';
import { AdminHeader, FinanceHeader } from '@/app/components/Headers';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie'
import Link from 'next/link';
import { supabase } from '@/supabase/client';
import EditTagModal from '@/app/components/EditTagModal';
import WithdrawModal from '@/app/components/WithdrawModal';
import { useCTActivityLogger } from '@/hooks/useCTActivityLogger';

interface ActivityLog {
    _id: string;
    agentId: {
        _id: string;
        email: string;
        name: string;
        department: string;
        role: string;
    };
    agentName: string;
    agentDepartment: string;
    agentRole: string;
    actionType: string;
    actionDescription: string;
    targetResource: string;
    status: string;
    ipAddress: string;
    browser: string;
    operatingSystem: string;
    additionalDetails: any;
    createdAt: string;
    updatedAt: string;
}

interface TagData {
    _id: string;
    agentId: {
        _id: string;
        email: string;
        name: string;
        department: string;
        role: string;
    };
    id: string;
    c_id: string;
    cashtag: string;
    name: string;
    status: string;
    procurement_cost: number;
    procured_by: {
        name: string;
        email: string;
    };
    created_at: string;
    updated_at: string;
    balance: number;
    transaction_count: number;
    total_received: number;
    total_withdrawn: number;
    full_name: string;
    last4_ss: string;
    address: string;
    ct_type: string;
    verification_status: string;
    email: string;
    pin: string;
    linked_card: string;
    linked_bank: string;
    cash_card: string;
    limit: number;
}

interface User {
    name: string;
    email: string;
    department: string;
    role: string;
  }

interface PageProps {
  params: Promise<{
    tags: string;
  }>;
  searchParams?: { [key: string]: string | string[] | undefined };
}

interface InfoRowProps {
    label: string;
    value: string;
    valueClassName?: string;
    labelClassName?: string;
}

const InfoRow = ({ 
    label, 
    value, 
    valueClassName = "", 
    labelClassName = ""
}: InfoRowProps) => (
    <div className="flex justify-between items-center">
        <span className={`text-sm ${labelClassName}`}>{label}</span>
        <span className={`text-sm ${valueClassName}`}>{value}</span>
    </div>
);

export default function CashtagPage({ params }: PageProps) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [tagData, setTagData] = useState<TagData | null>(null);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [timeFilter, setTimeFilter] = useState('Last 24 Hours');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [activityTypeFilter, setActivityTypeFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;
    const { logCTActivity } = useCTActivityLogger();

    const resolvedParams = use(params);
    const tagId = decodeURIComponent(resolvedParams.tags);

    const handleStatusChange = async (newStatus: string) => {
        // TODO: Implement API call to update status
        console.log('Changing status to:', newStatus);
        setShowStatusDropdown(false);
    };

    const fetchTagData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch tag data using Supabase
            const { data: tagResults, error: tagError } = await supabase
                .from('company_tags')
                .select(`
                    id,
                    c_id,
                    cashtag,
                    name,
                    status,
                    procurement_cost,
                    procured_by,
                    created_at,
                    updated_at,
                    balance,
                    transaction_count,
                    total_received,
                    total_withdrawn,
                    full_name,
                    last4_ss,
                    address,
                    ct_type,
                    verification_status,
                    email,
                    pin,
                    linked_card,
                    linked_bank,
                    cash_card,
                    limit
                `)
                .eq('cashtag', tagId);

            if (tagError) {
                throw new Error(tagError.message);
            }

            if (!tagResults || tagResults.length === 0) {
                throw new Error('Tag not found');
            }

            if (tagResults.length > 1) {
                throw new Error('Multiple tags found with the same cashtag');
            }

            const tagData = tagResults[0];

            // Fetch user data for procured_by
            const { data: userData, error: userError } = await supabase
                .from('auth.users')
                .select('id, email, name, department')
                .eq('id', tagData.procured_by)
                .single();

            if (!userError && userData) {
                tagData.procured_by = userData;
            }

            setTagData(tagData as TagData);

         
            

        } catch (error) {
            console.error("Error fetching tag data:", error);
            setError(error instanceof Error ? error.message : "Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    const fetchActivityLogs = async () => {
        try {
            let query = supabase
                .from('ct_activity_logs')
                .select('*')
                .eq('tag', tagId)
                .order('created_at', { ascending: false });

            // Apply time filter
            const now = new Date();
            if (timeFilter === 'Last 24 Hours') {
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                query = query.gte('created_at', yesterday.toISOString());
            } else if (timeFilter === 'Last 7 Days') {
                const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                query = query.gte('created_at', lastWeek.toISOString());
            } else if (timeFilter === 'Last 30 Days') {
                const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                query = query.gte('created_at', lastMonth.toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;
            setActivityLogs(data || []);
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        }
    };

    useEffect(() => {
        const token = Cookies.get('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        try {
            const parsedUser = JSON.parse(userData)
            if (parsedUser.department !== 'Admin'  && parsedUser.role !== 'Agent' && parsedUser.role !== 'Manager' && parsedUser.role !== 'Executive') {
                router.push('/login')
                return
            }
            setUser(parsedUser)
            fetchTagData()
        } catch (error) {
            console.error('Error parsing user data:', error)
            router.push('/login')
        }
    }, [router, tagId])

    useEffect(() => {
        if (tagId) {
            fetchActivityLogs();
        }
    }, [tagId, timeFilter]);

    const getUniqueActivityTypes = () => {
        const types = activityLogs.map(log => log.action_type);
        return ['All', ...new Set(types)];
    };

    const filteredLogs = activityLogs
        .filter(log => activityTypeFilter === 'All' || log.action_type === activityTypeFilter);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (loading) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>;

    if (error) return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-red-500 text-center">
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p>{error}</p>
        </div>
    </div>;

    if (!tagData || !user) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {user.department === 'Admin' ? (
                <AdminHeader user={user} />
            ) : (
                <FinanceHeader user={user} />
            )}
            <div className="p-8 pl-72">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/main/finance/cashtags"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-[#151C2F]/50 rounded-lg hover:bg-[#151C2F] transition-colors group"
                        >
                            <svg
                                className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                            Back to Tags
                        </Link>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{tagData.cashtag}</h1>
                        <span className="text-gray-400 bg-gray-800/50 px-3 py-1 rounded-lg text-sm">Company Tag</span>
                        <span className={`px-4 py-1 rounded-full text-sm font-medium ${
                            tagData.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' 
                                : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                        }`}>
                            {tagData.status.charAt(0).toUpperCase() + tagData.status.slice(1)}
                        </span>
                        {(user.department === 'Admin' || user.role === 'Manager' || user.role === 'Executive') && (
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="p-1.5 rounded-lg bg-amber-500/10 text-blue-500 hover:bg-amber-500/20 transform hover:scale-110 transition-all duration-200 flex items-center gap-2"
                            >
                               Edit Details <FiEdit2 size={15} />
                            </button>
                        )}
                    </div>
                    {(user.department === 'Admin' || user.role === 'Manager' || user.role === 'Executive') && (
                        <button
                            onClick={() => setShowWithdrawModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
                        >
                            <FiDollarSign size={18} />
                            <span>Withdraw Funds</span>
                            <FiArrowDown size={18} />
                        </button>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    <div className="relative overflow-hidden bg-[#151C2F] p-6 rounded-2xl border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">CURRENT BALANCE</h3>
                        <p className="text-2xl font-bold text-blue-400">${tagData?.balance?.toLocaleString() || '0.00'}</p>
                    </div>
                    <div className="relative overflow-hidden bg-[#151C2F] p-6 rounded-2xl border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">TRANSACTIONS</h3>
                        <p className="text-2xl font-bold text-purple-400">{tagData?.transaction_count || '0'}</p>
                    </div>
                    <div className="relative overflow-hidden bg-[#151C2F] p-6 rounded-2xl border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">RECEIVED</h3>
                        <p className="text-2xl font-bold text-emerald-400">${tagData?.total_received?.toLocaleString() || '0.00'}</p>
                    </div>
                    <div className="relative overflow-hidden bg-[#151C2F] p-6 rounded-2xl border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">SENT</h3>
                        <p className="text-2xl font-bold text-amber-400">${tagData?.total_withdrawn?.toLocaleString() || '0.00'}</p>
                    </div>
                </div>

                {/* Details Grid - Conditional rendering based on user role */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                    {/* Basic Information - Visible to both Admin and Agent */}

                    {/* Admin-only sections */}
                    {(user.department === 'Admin' || user.role === 'Manager' || user.role === 'Executive') && (
                        <>
                            <div className="bg-[#151C2F] p-6 rounded-2xl border border-gray-800/50 hover:border-gray-700/50 transition-colors">
                                <h2 className="text-lg font-semibold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Basic Information</h2>
                                <div className="space-y-4">
                                    <InfoRow 
                                        label="Cashtag ID" 
                                        value={tagData.cashtag} 
                                        labelClassName="text-gray-400"
                                        valueClassName="text-gray-300 font-mono text-sm"
                                    />
                                    <InfoRow 
                                        label="Account Type" 
                                        value={tagData.ct_type}
                                        labelClassName="text-gray-400"
                                        valueClassName="text-gray-300 capitalize"
                                    />
                                    <InfoRow 
                                        label="Verification Status" 
                                        value={tagData.verification_status}
                                        labelClassName="text-gray-400"
                                        valueClassName={`${
                                            tagData.verification_status === 'verified' 
                                                ? 'text-emerald-400' 
                                                : tagData.verification_status === 'pending'
                                                ? 'text-amber-400'
                                                : 'text-red-400'
                                        } capitalize`}
                                    />
                                </div>
                            </div>
                            {/* Personal Information */}
                            <div className="bg-[#151C2F] p-6 rounded-2xl border border-gray-800/50 hover:border-gray-700/50 transition-colors">
                                <h2 className="text-lg font-semibold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Personal Information</h2>
                                <div className="space-y-4">
                                    <InfoRow 
                                        label="Name" 
                                        value={tagData.full_name}
                                        labelClassName="text-gray-400"
                                        valueClassName="text-gray-300"
                                    />
                                    <InfoRow 
                                        label="Last 4 SS" 
                                        value={`${tagData.last4_ss}`}
                                        labelClassName="text-gray-400"
                                        valueClassName="text-gray-300 font-mono"
                                    />
                                    <InfoRow 
                                        label="Address" 
                                        value={tagData.address}
                                        labelClassName="text-gray-400"
                                        valueClassName="text-gray-300"
                                    />
                                    <InfoRow 
                                        label="Email" 
                                        value={tagData.email}
                                        labelClassName="text-gray-400"
                                        valueClassName="text-gray-300"
                                    />
                                </div>
                            </div>
                            {/* Withdraw Details */}
                            <div className="bg-[#151C2F] p-6 rounded-2xl border border-gray-800/50 hover:border-gray-700/50 transition-colors">
                                <h2 className="text-lg font-semibold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Withdraw Details</h2>
                                <div className="space-y-4">
                                    <InfoRow 
                                        label="Linked Card" 
                                        value={tagData.linked_card}
                                        labelClassName="text-gray-400"
                                        valueClassName="text-gray-300 font-mono"
                                    />
                                    <InfoRow 
                                        label="Linked Bank" 
                                        value={tagData.linked_bank}
                                        labelClassName="text-gray-400"
                                        valueClassName="text-gray-300 font-mono"
                                    />
                                    <InfoRow
                                        label="Cash Card"
                                        value={tagData.cash_card}
                                        labelClassName="text-gray-400"
                                        valueClassName={`${
                                            tagData.cash_card === 'activated' 
                                                ? 'text-emerald-400' 
                                                : tagData.cash_card === 'pending'
                                                ? 'text-amber-400'
                                                : 'text-red-400'
                                        } capitalize`}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Activity Logs */}
                <div className="bg-[#151C2F] rounded-2xl border border-gray-800/50">
                    <div className="p-6 border-b border-gray-800/50">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">Activity Logs</h2>
                            <div className="flex gap-4">
                                <select
                                    className="bg-[#0B1120] border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-gray-700"
                                    value={activityTypeFilter}
                                    onChange={(e) => {
                                        setActivityTypeFilter(e.target.value);
                                        setCurrentPage(1); // Reset to first page when filter changes
                                    }}
                                >
                                    {getUniqueActivityTypes().map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                {/* <select
                                    className="bg-[#0B1120] border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-gray-700"
                                    value={timeFilter}
                                    onChange={(e) => {
                                        setTimeFilter(e.target.value);
                                        setCurrentPage(1); // Reset to first page when filter changes
                                    }}
                                >
                                    <option>Last 24 Hours</option>
                                    <option>Last 7 Days</option>
                                    <option>Last 30 Days</option>
                                </select> */}
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#151D2E]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Date & Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Activity Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Before</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">After</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">User</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {paginatedLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                                            No activity logs found for this period
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-[#151D2E]">
                                            <td className="px-6 py-4 text-sm text-gray-300">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs ${
                                                    log.action_type.includes('CREATE') ? 'bg-green-600/20 text-green-400' :
                                                    log.action_type.includes('DELETE') ? 'bg-red-600/20 text-red-400' :
                                                    log.action_type.includes('WITHDRAW') ? 'bg-purple-600/20 text-purple-400' :
                                                    log.action_type.includes('FAILED') ? 'bg-red-600/20 text-red-400' :
                                                    log.action_type.includes('RECEIVED') ? 'bg-green-600/20 text-green-400' :
                                                    log.action_type.includes('UPDATE') ? 'bg-blue-600/20 text-blue-400' :
                                                    log.action_type.includes('PAUSE') ? 'bg-amber-600/20 text-amber-400' :
                                                    log.action_type.includes('RESUME') ? 'bg-green-600/20 text-green-400' :
                                                    log.action_type.includes('TRANSFER') ? 'bg-yellow-600/20 text-yellow-400' :
                                                    log.action_type.includes('ENABLE') ? 'bg-green-600/20 text-green-400' :
                                                    log.action_type.includes('DISABLE') ? 'bg-red-600/20 text-red-400' :

                                                    'bg-blue-600/20 text-blue-400'
                                                }`}>
                                                    {log.action_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300">
                                                {log.action_description}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {log.status === 'failed' ? (
                                                     <span className={Number(log.amount) >= 0 ? 'text-red-400' : 'text-red-400'}>
                                                     {Number(log.amount) >= 0 ? '' : ''}{log.amount.toLocaleString('en-US', {
                                                         style: 'currency',
                                                         currency: 'USD'
                                                     })}
                                                 </span>
                                                )
                                                : log.action_type.includes('CT_WITHDRAW') ? (
                                                    <span className={Number(log.amount) >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                        {Number(log.amount) >= 0 ? '-' : ''}{log.amount.toLocaleString('en-US', {
                                                            style: 'currency',
                                                            currency: 'USD'
                                                        })}
                                                    </span>
                                                )
                                                : log.action_type.includes('CT_SENT') || log.action_type.includes('CT_TRANSFER') ? (
                                                    <span className={Number(log.amount) >= 0 ? 'text-yellow-400' : 'text-red-400'}>
                                                        {Number(log.amount) >= 0 ? '-' : ''}{log.amount.toLocaleString('en-US', {
                                                            style: 'currency',
                                                            currency: 'USD'
                                                        })}
                                                    </span>
                                                    
                                                ) : log.amount ? (
                                                    <span className={Number(log.amount) >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                        {Number(log.amount) >= 0 ? '+' : ''}{log.amount.toLocaleString('en-US', {
                                                            style: 'currency',
                                                            currency: 'USD'
                                                        })}
                                                    </span>
                                                ) : 'N/A'}
                                                
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300">
                                                {log.balance_before ? log.balance_before.toLocaleString('en-US', {
                                                    style: 'currency',
                                                    currency: 'USD'
                                                }) : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300">
                                                {log.balance_after ? log.balance_after.toLocaleString('en-US', {
                                                    style: 'currency',
                                                    currency: 'USD'
                                                }) : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300">
                                                {log.user_name} ({log.user_department})
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {/* Pagination Controls */}
                        {filteredLogs.length > 0 && (
                            <div className="flex justify-between items-center px-6 py-4 bg-[#151D2E] border-t border-gray-700">
                                <div className="text-sm text-gray-400">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1 rounded-lg text-sm ${
                                            currentPage === 1
                                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                        }`}
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-1 rounded-lg text-sm ${
                                                currentPage === page
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1 rounded-lg text-sm ${
                                            currentPage === totalPages
                                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                        }`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <EditTagModal
                    selectedTag={tagData}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={fetchTagData}
                />
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <WithdrawModal
                    currentBalance={tagData?.balance || 0}
                    tagId={tagData.c_id}
                    userEmail={user.email}
                    onClose={() => setShowWithdrawModal(false)}
                    onSuccess={fetchTagData}
                />
            )}
        </div>
    );
}
