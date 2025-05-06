
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
      if (signal > 80) return 'bg-melon-red dark:bg-melon-darkRedAccent';
      if (signal > 50) return 'bg-melon-lightRed dark:bg-melon-red/80';
      if (signal > 30) return 'bg-yellow-500 dark:bg-yellow-600';
      return 'bg-red-500 dark:bg-red-600';
    }
    return 'bg-gray-700 dark:bg-gray-800';
  };

  return (
    <div className={cn("signal-indicator", className)}>
      <div className={cn("signal-bar h-1", getColor(20))}></div>
      <div className={cn("signal-bar h-2", getColor(40))}></div>
      <div className={cn("signal-bar h-3", getColor(60))}></div>
      <div className={cn("signal-bar h-4", getColor(80))}></div>
    </div>
  );
};

export default SignalStrengthIndicator;
