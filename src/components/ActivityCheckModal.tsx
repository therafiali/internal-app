import React, { useEffect, useState } from 'react';

interface ActivityCheckModalProps {
  isOpen: boolean;
  onStayActive: () => void;
  onLogout: () => void;
}

export const ActivityCheckModal: React.FC<ActivityCheckModalProps> = ({
  isOpen,
  onStayActive,
  onLogout,
}) => {
  const [countdown, setCountdown] = useState(60); // 60 seconds to respond
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isOpen && !isLoggingOut) {
      setCountdown(60); // Reset countdown when modal opens
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleLogout(); // Use the handleLogout function for consistency
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isOpen, isLoggingOut]);

  // Handle logout to ensure modal state is cleaned up
  const handleLogout = () => {
    setIsLoggingOut(true); // Set logging out state to stop the timer
    setCountdown(0); // Reset countdown
    onLogout(); // Trigger the logout action
  };

  // If we're logging out or modal is closed, don't render
  if (!isOpen || isLoggingOut) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Are you still active?</h2>
        <p className="mb-2 text-gray-600 dark:text-gray-300">
          Please confirm if you would like to stay logged in.
        </p>
        <p className="mb-6 text-red-500 dark:text-red-400 text-sm">
          Auto-logout in {countdown} seconds
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            No, Logout
          </button>
          <button
            onClick={onStayActive}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Yes, I'm Active
          </button>
        </div>
      </div>
    </div>
  );
}; 