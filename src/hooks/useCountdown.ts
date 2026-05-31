import { useState, useEffect } from 'react';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

export const useCountdown = (targetDate: string | Date): CountdownTime => {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    totalSeconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        if (!targetDate) {
          return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
            totalSeconds: 0
          };
        }

        const target = new Date(targetDate).getTime();
        
        if (isNaN(target)) {
          return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
            totalSeconds: 0
          };
        }

        const now = new Date().getTime();
        const difference = target - now;

        if (difference <= 0) {
          return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
            totalSeconds: 0
          };
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        const totalSeconds = Math.floor(difference / 1000);

        return {
          days,
          hours,
          minutes,
          seconds,
          isExpired: false,
          totalSeconds
        };
      } catch (error) {
        console.error('Error calculating countdown:', error);
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          totalSeconds: 0
        };
      }
    };

    // Calculate initial time
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

export const formatCountdown = (timeLeft: CountdownTime): string => {
  if (timeLeft.isExpired) {
    return 'Auction Ended';
  }

  const { days, hours, minutes, seconds } = timeLeft;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

export const getCountdownColor = (timeLeft: CountdownTime): string => {
  if (timeLeft.isExpired) {
    return 'text-red-500';
  }

  const totalHours = timeLeft.totalSeconds / 3600;

  if (totalHours < 1) {
    return 'text-red-500'; // Less than 1 hour - urgent
  } else if (totalHours < 6) {
    return 'text-orange-500'; // Less than 6 hours - warning
  } else if (totalHours < 24) {
    return 'text-yellow-500'; // Less than 24 hours - caution
  } else {
    return 'text-green-500'; // More than 24 hours - safe
  }
};