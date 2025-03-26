
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const checkAccess = (requiredDepartment?: string, requiredRole?: string) => {
    if (!isAuthenticated || !user) return false;

    if (requiredDepartment && user.department !== requiredDepartment) {
      // Allow Admin department to access everything
      if (user.department !== 'Admin') return false;
    }

    if (requiredRole) {
      // Define role hierarchies
      const roleHierarchy = {
        Agent: 0,
        Supervisor: 1,
        Manager: 2,
        Admin: 3,
        Executive: 3
      };

      const userRoleLevel = roleHierarchy[user.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) return false;
    }

    return true;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    checkAccess
  };
};

export default useAuth; 