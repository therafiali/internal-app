import React from 'react';

interface CreateButtonProps {
  onClick: () => void;
}

const CreateButton: React.FC<CreateButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
    >
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d="M12 4v16m8-8H4"
        />
      </svg>
      <span className="font-medium">Create Request</span>
    </button>
  );
};

export default CreateButton; 