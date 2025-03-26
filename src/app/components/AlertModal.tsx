import React from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning';
  message: string;
  title?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, type, message, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm border border-gray-800/20 shadow-lg">
        <div className="p-6 text-center">
          <div className="mb-4">
            <div className={`mx-auto w-12 h-12 rounded-full ${
              type === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'
            } flex items-center justify-center`}>
              {type === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-500" />
              )}
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-4">
            {title || (type === 'success' ? 'Success!' : 'Error!')}
          </h3>
          <p className="text-sm text-gray-400 mb-6">{message}</p>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              type === 'success' 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal; 