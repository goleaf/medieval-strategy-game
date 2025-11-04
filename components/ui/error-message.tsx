"use client"

interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="bg-destructive/10 border border-destructive rounded p-3 flex items-center justify-between">
      <span className="text-destructive text-sm">❌ {message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-destructive hover:text-destructive/80 text-sm"
        >
          ✕
        </button>
      )}
    </div>
  )
}


