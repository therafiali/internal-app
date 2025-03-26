"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { AdminHeader, SupportHeader } from '@/app/components/Headers';
import { KeyRound, History } from 'lucide-react';
import Loader from '@/app/components/Loader';
import PasswordChangeModal from '@/app/components/PasswordChangeModal';
import ActivityLogModal from '@/app/components/ActivityLogModal';
import OperationCard from '@/app/components/OperationCard';
import UserInfoCard from '@/app/components/UserInfoCard';
import { useActivityLogger } from '@/hooks/useActivityLogger';

interface User {
  name: string;
  email: string;
  department: string;
  role: string;
  joinedDate?: string;
  agentId?: string;
  status?: 'active' | 'inactive';
  lastActive?: string;
  performanceRating?: number;
  handledCases?: number;
}

const AgentSupportPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    const token = Cookies.get('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.department !== 'Support' && parsedUser.department !== 'Admin') {
        router.push('/login');
        return;
      }
      setUser(parsedUser);
      setLoading(false);
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

  const handlePasswordSuccess = async () => {
    setShowPasswordModal(false);
    
    // Log password reset activity
    if (user) {
      try {
        await logActivity({
          actionType: 'OTHER',
          actionDescription: `Agent ${user.name} changed their password`,
          targetResource: 'other',
          targetResourceId: user.agentId,
          status: 'success',
          additionalDetails: {
            agentId: user.agentId,
            agentName: user.name,
            department: user.department,
            action: 'password_change'
          }
        });
      } catch (error) {
        console.error('Failed to log password change activity:', error);
      }
    }
  };

  const handleViewActivityLog = async () => {
    setShowActivityModal(true);
    
    // Log activity log view
    if (user) {
      try {
        await logActivity({
          actionType: 'OTHER',
          actionDescription: `Agent ${user.name} viewed their activity log`,
          targetResource: 'other',
          targetResourceId: user.agentId,
          status: 'success',
          additionalDetails: {
            agentId: user.agentId,
            agentName: user.name,
            department: user.department,
            action: 'view_logs'
          }
        });
      } catch (error) {
        console.error('Failed to log activity view:', error);
      }
    }
  };

  const operationCards = [
    {
      title: 'Reset Password',
      description: 'Change your account password',
      icon: <KeyRound className="w-6 h-6" />,
      onClick: () => setShowPasswordModal(true),
      color: 'emerald'
    },
    // {
    //   title: 'Activity Log',
    //   description: 'View your recent activities',
    //   icon: <History className="w-6 h-6" />,
    //   onClick: handleViewActivityLog,
    //   color: 'purple'
    // }
  ];

  if (loading) {
    return <Loader text="Agent Support" />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {user.department === 'Support' ? (
        <SupportHeader user={user} />
      ) : (
          <AdminHeader user={user} />
        )}
      <div className="flex-1 pl-64">
        <main className="p-8">
          <div className="max-w-7xl mx-auto">

            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                Agent Support
              </h1>
              <UserInfoCard user={user} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {operationCards.map((card, index) => (
                <OperationCard
                  key={index}
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                  onClick={card.onClick}
                  color={card.color}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
      {showPasswordModal && (
        <PasswordChangeModal 
          onClose={() => setShowPasswordModal(false)}
        />
      )}
      {showActivityModal && (
        <ActivityLogModal 
          onClose={() => {
            setShowActivityModal(false);
            // Log activity log close
            if (user) {
              logActivity({
                actionType: 'OTHER',
                actionDescription: `Agent ${user.name} closed activity log view`,
                targetResource: 'other',
                targetResourceId: user.agentId,
                status: 'success',
                additionalDetails: {
                  agentId: user.agentId,
                  agentName: user.name,
                  department: user.department,
                  action: 'close_logs'
                }
              }).catch(error => {
                console.error('Failed to log activity close:', error);
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default AgentSupportPage; 