'use client';

import { useAuth } from '@/hooks/useAuth';
import { AdminHeader, OperationsHeader, VerificationHeader, FinanceHeader, SupportHeader, AuditHeader } from '../components/Headers';


export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) return null;

  // Render appropriate header based on department and role
  const renderHeader = () => {
    switch (user.department) {
      case 'Admin':
        return <AdminHeader user={user} />;
      case 'Operations':
        return <OperationsHeader user={user} />;
      case 'Verification':
        return <VerificationHeader user={user} />;
      case 'Finance':
        return <FinanceHeader user={user} />;
      case 'Support':
        return <SupportHeader user={user} />;
      case 'Audit':
        return <AuditHeader user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      {renderHeader()}
      <main className="flex-1 ">
        {children}
      </main>
    </div>
  );
} 