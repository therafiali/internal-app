"use client";
import { LucideIcon } from 'lucide-react';

interface OperationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

const OperationCard: React.FC<OperationCardProps> = ({
  title,
  description,
  icon,
  onClick,
  color
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#1a1a1a] rounded-xl p-6 border border-gray-800/20 hover:border-${color}-500/20 transition-all duration-300 cursor-pointer group`}
    >
      <div className={`w-12 h-12 rounded-lg bg-${color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <div className={`text-${color}-500`}>{icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
};

export default OperationCard; 