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
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            this.timeLeft = \`\${minutes}m \${seconds}s\`;
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

