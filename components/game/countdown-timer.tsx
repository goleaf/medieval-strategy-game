"use client"

interface CountdownTimerProps {
  targetDate: string | Date
  className?: string
}

export function CountdownTimer({ targetDate, className = "" }: CountdownTimerProps) {
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate
  const targetISO = target.toISOString()

  return (
    <span
      x-data={`{
        timeLeft: 'Calculating...',
        interval: null,
        init() {
          const target = new Date('${targetISO}');
          const updateTime = () => {
            const now = new Date();
            const diff = Math.max(0, target.getTime() - now.getTime());
            const totalSeconds = Math.floor(diff / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            let parts = [];
            if (days > 0) parts.push(`${days}d`);
            if (hours > 0 || days > 0) parts.push(`${hours}h`);
            parts.push(`${minutes}m`);
            parts.push(`${seconds}s`);
            this.timeLeft = parts.join(' ') + ' remaining';
          };
          updateTime();
          this.interval = setInterval(updateTime, 1000);
        },
        destroy() {
          if (this.interval) {
            clearInterval(this.interval);
          }
        }
      }`}
      x-text="timeLeft"
      data-countdown={targetISO}
      className={className}
    />
  )
}
