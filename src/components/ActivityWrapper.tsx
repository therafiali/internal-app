import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { ActivityCheckModal } from './ActivityCheckModal';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ActivityWrapperProps {
  children: React.ReactNode;
}

export const ActivityWrapper: React.FC<ActivityWrapperProps> = ({ children }) => {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const { showModal, setShowModal } = useInactivityTimer({
    timeoutMinutes: 10,
  });

  const handleStayActive = () => {
    setShowModal(false);
  };

  return (
    <>
      {children}
      <ActivityCheckModal
        isOpen={showModal}
        onStayActive={handleStayActive}
        onLogout={handleLogout}
      />
    </>
  );
}; 