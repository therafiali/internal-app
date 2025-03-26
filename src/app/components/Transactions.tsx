import React from 'react';
import useTransactions from '@/hooks/useTransactions';

interface Transaction {
  id: string;
  rechargeId: string;
  amount: number;
  status: 'pending' | 'assigned' | 'completed' | 'screenshot_processed' | 'screenshot_rejected';
  paymentStatus: 'pending' | 'completed' | 'failed';
  tagType: string;
  paymentMethod: {
    type: string;
    details: string;
  } | null;
  createdAt: string;
}

interface TransactionStats {
  totalPending: number;
  pendingCount: number;
  averageTime: string;
  successRate: string;
}

interface TransactionPagination {
  currentPage: number;
  totalPages: number;
  total: number;
}

interface UseTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  stats: TransactionStats;
  pagination: TransactionPagination | null;
  fetchTransactions: (page?: number, limit?: number) => Promise<void>;
}

const Transactions = () => {
  const { 
    transactions: rawTransactions, 
    loading, 
    error, 
    stats, 
    pagination, 
    fetchTransactions 
  } = useTransactions();

  // Cast the transactions to the correct type using a double cast through unknown
  const transactions = ((rawTransactions || []) as unknown) as Transaction[];

  if (error) {
    const errorMessage = typeof error === 'string' ? error : 'An error occurred';
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{errorMessage}</div>
      </div>
    );
  }

  const renderStatus = (status: string | undefined) => {
    if (!status) return 'N/A';
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusClass = (status: string | undefined, type: 'current' | 'payment') => {
    if (!status) return 'bg-gray-500/10 text-gray-500';
    
    if (type === 'current') {
      switch (status) {
        case 'pending':
          return 'bg-amber-500/10 text-amber-500';
        case 'assigned':
          return 'bg-blue-500/10 text-blue-500';
        case 'completed':
          return 'bg-emerald-500/10 text-emerald-500';
        case 'screenshot_processed':
          return 'bg-purple-500/10 text-purple-500';
        case 'screenshot_rejected':
          return 'bg-red-500/10 text-red-500';
        default:
          return 'bg-gray-500/10 text-gray-500';
      }
    } else {
      switch (status) {
        case 'pending':
          return 'bg-amber-500/10 text-amber-500';
        case 'failed':
          return 'bg-red-500/10 text-red-500';
        default:
          return 'bg-gray-500/10 text-gray-500';
      }
    }
  };

  return (
    <div className="p-6 bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Payout Queue
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {/* Total Pending Card */}
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="text-emerald-500 text-sm font-medium mb-1">TOTAL PENDING</div>
          <div className="text-3xl font-bold text-white">{stats.totalPending}</div>
          <div className="text-gray-500 text-xs mt-1">All Teams</div>
        </div>

        {/* Pending Count Card */}
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="text-emerald-500 text-sm font-medium mb-1">PENDING COUNT</div>
          <div className="text-3xl font-bold text-white">{stats.pendingCount}</div>
          <div className="text-gray-500 text-xs mt-1">All Teams</div>
        </div>

        {/* Average Time Card */}
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="text-emerald-500 text-sm font-medium mb-1">AVERAGE TIME</div>
          <div className="text-3xl font-bold text-white">{stats.averageTime}</div>
          <div className="text-gray-500 text-xs mt-1">All Teams</div>
        </div>

        {/* Success Rate Card */}
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="text-emerald-500 text-sm font-medium mb-1">SUCCESS RATE</div>
          <div className="text-3xl font-bold text-white">{stats.successRate}</div>
          <div className="text-gray-500 text-xs mt-1">Last 30 days</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800/20">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <select 
            className="bg-[#0a0a0a] text-white border border-gray-800 rounded-lg px-3 py-2 text-sm"
            onChange={(e) => {
              // Handle team filter change
            }}
          >
            <option value="all">All Teams</option>
            <option value="ENT-1">ENT-1</option>
            <option value="ENT-2">ENT-2</option>
            <option value="ENT-3">ENT-3</option>
          </select>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-400">
                <th className="text-left px-4 py-3">Transaction ID</th>
                <th className="text-left px-4 py-3">Recharge ID</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Payment Status</th>
                <th className="text-left px-4 py-3">Tag Type</th>
                <th className="text-left px-4 py-3">Payment Method</th>
                <th className="text-left px-4 py-3">Time Created</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm text-gray-300">{transaction.id}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg text-xs">
                      {transaction.rechargeId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">${transaction.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(transaction.status, 'current')}`}>
                      {renderStatus(transaction.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(transaction.paymentStatus, 'payment')}`}>
                      {renderStatus(transaction.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{transaction.tagType || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {transaction.paymentMethod ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-400">{transaction.paymentMethod.type}</span>
                        <span className="text-xs text-gray-300">{transaction.paymentMethod.details}</span>
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-amber-500">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button 
                        className={`px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs hover:bg-emerald-500/20 
                          ${(!transaction.status || transaction.status === 'completed') ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!transaction.status || transaction.status === 'completed'}
                      >
                        Pay
                      </button>
                      <button 
                        className={`px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-xs hover:bg-amber-500/20
                          ${(!transaction.status || transaction.status === 'completed') ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!transaction.status || transaction.status === 'completed'}
                      >
                        Pause
                      </button>
                      <button 
                        className={`px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-xs hover:bg-red-500/20
                          ${(!transaction.status || transaction.status === 'completed') ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!transaction.status || transaction.status === 'completed'}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex justify-between items-center mt-4 text-gray-400">
          <div>
            Showing {transactions.length} of {pagination.total} entries
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchTransactions(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className={`px-3 py-1 rounded ${
                pagination.currentPage === 1 
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Previous
            </button>
            <button className="px-3 py-1 bg-blue-500 text-white rounded">
              {pagination.currentPage}
            </button>
            <button 
              onClick={() => fetchTransactions(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className={`px-3 py-1 rounded ${
                pagination.currentPage === pagination.totalPages 
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;