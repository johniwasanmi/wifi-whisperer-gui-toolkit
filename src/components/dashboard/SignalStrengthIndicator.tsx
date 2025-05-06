
import React from 'react';
import { cn } from '@/lib/utils';

interface SignalStrengthIndicatorProps {
  signal: number; // Signal strength in percentage (0-100)
  className?: string;
}

const SignalStrengthIndicator = ({ signal, className }: SignalStrengthIndicatorProps) => {
  // Calculate color based on signal strength
  const getColor = (threshold: number) => {
    if (signal >= threshold) {
      if (signal > 80) return 'bg-melon-green dark:bg-melon-green';
      if (signal > 50) return 'bg-melon-lightGreen dark:bg-melon-lightGreen/80';
      if (signal > 30) return 'bg-yellow-500 dark:bg-yellow-600';
      return 'bg-melon-red dark:bg-melon-red';
    }
    return 'bg-gray-300 dark:bg-gray-600';
  };

  return (
    <div className={cn("flex items-end gap-0.5 h-4", className)}>
      <div className={cn("signal-bar w-1 h-1", getColor(20))}></div>
      <div className={cn("signal-bar w-1 h-2", getColor(40))}></div>
      <div className={cn("signal-bar w-1 h-3", getColor(60))}></div>
      <div className={cn("signal-bar w-1 h-4", getColor(80))}></div>
    </div>
  );
};

export default SignalStrengthIndicator;
