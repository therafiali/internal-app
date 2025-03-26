"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabase/client';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DepartmentStats {
  redeem: {
    pending: number;
    rejected: number;
  };
  transfer: {
    pending: number;
    rejected: number;
  };
  resetPassword: {
    pending: number;
    rejected: number;
  };
  recharge: {
    pending: number;
    rejected: number;
  };
}

interface VerificationStats {
  redeem: {
    pending: number;
    rejected: number;
  };
  recharge: {
    pending: number;
    rejected: number;
  };
}

interface FinanceStats {
  redeem: {
    pending: number;
    rejected: number;
  };
  recharge: {
    pending: number;
    rejected: number;
  };
  pendingConfirmation: {
    pending: number;
    rejected: number;
  };
}

const DashboardPage = () => {
  const [operationStats, setOperationStats] = useState<DepartmentStats>({
    redeem: { pending: 0, rejected: 0 },
    transfer: { pending: 0, rejected: 0 },
    resetPassword: { pending: 0, rejected: 0 },
    recharge: { pending: 0, rejected: 0 },
  });

  const [verificationStats, setVerificationStats] = useState<VerificationStats>({
    redeem: { pending: 0, rejected: 0 },
    recharge: { pending: 0, rejected: 0 },
  });

  const [financeStats, setFinanceStats] = useState<FinanceStats>({
    redeem: { pending: 0, rejected: 0 },
    recharge: { pending: 0, rejected: 0 },
    pendingConfirmation: { pending: 0, rejected: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [realtimeChannels, setRealtimeChannels] = useState<RealtimeChannel[]>([]);

  const fetchStats = async () => {
    try {
      // Fetch operation stats
      const { data: redeemData } = await supabase
        .from('redeem_requests')
        .select('status')
        .in('status', ['pending', 'verification_failed']);

      const { data: transferData } = await supabase
        .from('transfer_requests')
        .select('status')
        .in('status', ['pending', 'rejected']);

      const { data: resetPasswordData } = await supabase
        .from('reset_password_requests')
        .select('status')
        .in('status', ['pending', 'rejected']);

      const { data: rechargeData } = await supabase
        .from('recharge_requests')
        .select('status')
        .in('status', ['sc_processed', 'rejected']);

      // Fetch verification stats
      const { data: verifyRedeemData } = await supabase
        .from('redeem_requests')
        .select('status')
        .in('status', ['verification_pending', 'verification_rejected']);

      const { data: verifyRechargeData } = await supabase
        .from('recharge_requests')
        .select('status')
        .in('status', ['sc_submitted', 'sc_rejected']);

      // Fetch finance stats
      const { data: financeRedeemData } = await supabase
        .from('redeem_requests')
        .select('status')
        .in('status', ['queued', 'rejected']);

      const { data: financeRechargeData } = await supabase
        .from('recharge_requests')
        .select('status')
        .in('status', ['pending', 'finance_rejected']);

      const { data: pendingConfirmationData } = await supabase
        .from('recharge_requests')
        .select('status')
        .in('status', ['sc_processed', 'completed'])
        .is('assigned_redeem', null);

      // Process and set operation stats
      setOperationStats({
        redeem: {
          pending: (redeemData || []).filter(item => item.status === 'pending' || item.status === 'verification_failed').length,
          rejected: (redeemData || []).filter(item => item.status === 'rejected').length,
        },
        transfer: processStats(transferData || []),
        resetPassword: processStats(resetPasswordData || []),
        recharge: {
          pending: (rechargeData || []).filter(item => item.status === 'sc_processed').length,
          rejected: (rechargeData || []).filter(item => item.status === 'rejected').length,
        },
      });

      // Process and set verification stats
      setVerificationStats({
        redeem: {
          pending: (verifyRedeemData || []).filter(item => item.status === 'verification_pending').length,
          rejected: (verifyRedeemData || []).filter(item => item.status === 'verification_rejected').length,
        },
        recharge: {
          pending: (verifyRechargeData || []).filter(item => item.status === 'sc_submitted').length,
          rejected: (verifyRechargeData || []).filter(item => item.status === 'sc_rejected').length,
        },
      });

      // Process and set finance stats
      setFinanceStats({
        redeem: {
          pending: (financeRedeemData || []).filter(item => item.status === 'queued').length,
          rejected: (financeRedeemData || []).filter(item => item.status === 'rejected').length,
        },
        recharge: {
          pending: (financeRechargeData || []).filter(item => item.status === 'pending').length,
          rejected: (financeRechargeData || []).filter(item => item.status === 'finance_rejected').length,
        },
        pendingConfirmation: {
          pending: (pendingConfirmationData || []).filter(item => item.status === 'sc_processed' || item.status === 'completed').length,
          rejected: (pendingConfirmationData || []).filter(item => item.status === 'rejected').length,
        },
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const tables = [
      'redeem_requests',
      'transfer_requests',
      'reset_password_requests',
      'recharge_requests',
      'verification_redeem_requests',
      'verification_recharge_requests',
      'finance_redeem_requests',
      'finance_recharge_requests',
      'pending_confirmation_requests'
    ];

    const channels = tables.map(table => {
      const channel = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          () => {
            fetchStats();
          }
        )
        .subscribe();

      return channel;
    });

    setRealtimeChannels(channels);
  };

  useEffect(() => {
    fetchStats();
    setupRealtimeSubscriptions();

    // Cleanup subscriptions
    return () => {
      realtimeChannels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  const processStats = (data: any[]) => {
    return {
      pending: data.filter(item => item.status === 'pending').length,
      rejected: data.filter(item => item.status === 'rejected').length,
    };
  };

  const processVerificationStats = (data: any[], pendingStatus: string, rejectedStatus: string) => {
    return {
      pending: data.filter(item => item.status === pendingStatus).length,
      rejected: data.filter(item => item.status === rejectedStatus).length,
    };
  };

  const StatCard = ({ title, stats }: { title: string; stats: { pending: number; rejected: number } }) => (
    <Card className="w-full">
      <CardHeader>
        <h3 className="text-lg font-semibold">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-600 mr-2"></div>
              <span className="text-yellow-600">Pending</span>
            </div>
            <span className="font-medium">{stats.pending}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-600 mr-2"></div>
              <span className="text-red-600">Rejected</span>
            </div>
            <span className="font-medium">{stats.rejected}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Operations Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Operations Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Redeem Requests" stats={operationStats.redeem} />
          <StatCard title="Transfer Requests" stats={operationStats.transfer} />
          <StatCard title="Reset Password Requests" stats={operationStats.resetPassword} />
          <StatCard title="Recharge Requests" stats={operationStats.recharge} />
        </div>
      </div>

      {/* Verifications Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Verifications Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard title="Redeem Verifications" stats={verificationStats.redeem} />
          <StatCard title="Recharge Verifications" stats={verificationStats.recharge} />
        </div>
      </div>

      {/* Finance Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Finance Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Finance Redeem" stats={financeStats.redeem} />
          <StatCard title="Finance Recharge" stats={financeStats.recharge} />
          <StatCard title="Pending Confirmation" stats={financeStats.pendingConfirmation} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;