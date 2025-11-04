"use client"

interface ProgressBarProps {
  current: number
  max: number
  label?: string
  showNumbers?: boolean
  className?: string
}

export function ProgressBar({ current, max, label, showNumbers = true, className = "" }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  const filled = Math.floor(percentage / 5) // 20 segments max
  const empty = 20 - filled

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <div className="text-xs text-muted-foreground">{label}</div>}
      <div className="flex items-center gap-2">
        <div className="flex-1 font-mono text-xs">
          {showNumbers && (
            <span>
              {current.toLocaleString()} / {max.toLocaleString()} ({percentage}%)
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex h-2 overflow-hidden rounded border border-border bg-secondary">
            <div
              className="bg-primary transition-all"
              style={{ width: `${percentage}%` }}
            />
            <div className="flex-1 bg-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}

