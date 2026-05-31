import React from 'react';
import { useCountdown, formatCountdown, getCountdownColor } from '@/hooks/useCountdown';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  endDate: string | Date;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onExpired?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endDate,
  className = '',
  showIcon = true,
  size = 'md',
  onExpired
}) => {
  const timeLeft = useCountdown(endDate);
  const colorClass = getCountdownColor(timeLeft);
  const formattedTime = formatCountdown(timeLeft);

  // Call onExpired callback when timer expires
  React.useEffect(() => {
    if (timeLeft.isExpired && onExpired) {
      onExpired();
    }
  }, [timeLeft.isExpired, onExpired]);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (timeLeft.isExpired) {
    return (
      <div className={`flex items-center gap-1 ${sizeClasses[size]} ${colorClass} ${className}`}>
        {showIcon && <AlertTriangle className={iconSizes[size]} />}
        <span className="font-medium">Auction Ended</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${sizeClasses[size]} ${colorClass} ${className}`}>
      {showIcon && <Clock className={iconSizes[size]} />}
      <span className="font-medium">{formattedTime}</span>
    </div>
  );
};

interface DetailedCountdownProps {
  endDate: string | Date;
  className?: string;
  onExpired?: () => void;
}

export const DetailedCountdown: React.FC<DetailedCountdownProps> = ({
  endDate,
  className = '',
  onExpired
}) => {
  const timeLeft = useCountdown(endDate);
  const colorClass = getCountdownColor(timeLeft);

  // Call onExpired callback when timer expires
  React.useEffect(() => {
    if (timeLeft.isExpired && onExpired) {
      onExpired();
    }
  }, [timeLeft.isExpired, onExpired]);

  if (timeLeft.isExpired) {
    return (
      <div className={`glass-card p-4 border-red-500/20 bg-red-500/5 ${className}`}>
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">Auction Ended</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card p-4 border-primary/20 bg-primary/5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-primary" />
        <span className="font-semibold text-primary">Time Remaining</span>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {timeLeft.days > 0 && (
          <div className="text-center">
            <div className={`text-2xl font-bold ${colorClass}`}>{timeLeft.days}</div>
            <div className="text-xs text-muted-foreground">Days</div>
          </div>
        )}
        <div className="text-center">
          <div className={`text-2xl font-bold ${colorClass}`}>{timeLeft.hours.toString().padStart(2, '0')}</div>
          <div className="text-xs text-muted-foreground">Hours</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${colorClass}`}>{timeLeft.minutes.toString().padStart(2, '0')}</div>
          <div className="text-xs text-muted-foreground">Minutes</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${colorClass}`}>{timeLeft.seconds.toString().padStart(2, '0')}</div>
          <div className="text-xs text-muted-foreground">Seconds</div>
        </div>
      </div>
    </div>
  );
};