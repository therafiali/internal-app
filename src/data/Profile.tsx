import { KeyRound, UserCircle, History } from "lucide-react";

export const OperationCards = [
    {
      title: 'Reset Password',
      description: 'Change your account password',
      icon: <KeyRound className="w-6 h-6" />,
      color: 'emerald'
    },
    {
      title: 'Edit Profile',
      description: 'Manage your account preferences',
      icon: <UserCircle className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Activity Log',
      description: 'View your recent activities',
      icon: <History className="w-6 h-6" />,
      color: 'purple'
    }
  ];