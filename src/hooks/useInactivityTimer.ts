import { useEffect, useState } from 'react';

interface UseInactivityTimerProps {
  timeoutMinutes: number;
  onTimeout?: () => void;
}

export const useInactivityTimer = ({ timeoutMinutes, onTimeout }: UseInactivityTimerProps) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      
      inactivityTimer = setTimeout(() => {
        setShowModal(true);
        onTimeout?.();
      }, timeoutMinutes * 60 * 1000);
    };

    // Reset timer on user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initial timer setup
    resetTimer();

    // Cleanup
    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [timeoutMinutes, onTimeout]);

  return {
    showModal,
    setShowModal
  };
}; 