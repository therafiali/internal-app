"use client";
import React, { useState, useEffect } from 'react';

interface TimeElapsedProps {
  date: string;
  showFullDate?: boolean;
  className?: string;
  elapsedClassName?: string;
  fullDateClassName?: string;
}

export const useTimeElapsed = (date: string) => {
  const [timeElapsed, setTimeElapsed] = useState<string>('');

  useEffect(() => {
    const calculateTimeElapsed = () => {
      const now = new Date().getTime();
      const past = new Date(date).getTime();
      const diff = now - past;

      // Convert to seconds
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

      return parts.join(', ');
    };

    // Initial calculation
    setTimeElapsed(calculateTimeElapsed());

    // Update every second
    const timer = setInterval(() => {
      setTimeElapsed(calculateTimeElapsed());
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, [date]); // Only re-run effect if date changes

  return timeElapsed;
};

const TimeElapsed: React.FC<TimeElapsedProps> = ({ 
  date, 
  showFullDate = true,
  className = "flex flex-col w-[200px]",
  elapsedClassName = "text-sm font-medium text-gray-300",
  fullDateClassName = "text-xs text-gray-400"
}) => {
  const timeElapsed = useTimeElapsed(date);
  
  return (
    <div className={className}>
      <span className={elapsedClassName}>
        {timeElapsed}
      </span>
      {showFullDate && (
        <span className={fullDateClassName}>
          {/* i only want to show the date */}
          {new Date(date).toLocaleDateString()}
        </span>
      )}
      {showFullDate && (
        <span className={fullDateClassName}>
          {/* i only want to show the date */}
          {new Date(date).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default TimeElapsed; 