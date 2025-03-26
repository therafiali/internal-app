import React from 'react';
import { useEntPages, EntPage } from '@/app/hooks/useEntPages';

interface EntPagesDropdownProps {
  teamCode?: string;
  value: string;
  onChange: (pageName: string) => void;
  disabled?: boolean;
  className?: string;
}

const EntPagesDropdown: React.FC<EntPagesDropdownProps> = ({
  teamCode,
  value,
  onChange,
  disabled = false,
  className = ''
}) => {
  const { pages, isLoading, error } = useEntPages(teamCode);

  if (isLoading) {
    return (
      <div className={`w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-gray-400 ${className}`}>
        Loading pages...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-red-400 ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <select
      className={`w-full bg-[#252b3b] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">Select page...</option>
      {pages.map((page) => (
        <option key={page.id} value={page.page_name}>
          {page.page_name}
        </option>
      ))}
    </select>
  );
};

export default EntPagesDropdown; 