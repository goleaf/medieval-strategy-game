"use client"

interface SuccessMessageProps {
  message: string
  onDismiss?: () => void
}

export function SuccessMessage({ message, onDismiss }: SuccessMessageProps) {
  return (
    <div
      x-data="{ show: true }"
      x-show="show"
      x-transition
      className="bg-green-500/10 border border-green-500 rounded p-3 flex items-center justify-between"
    >
      <span className="text-green-600 text-sm">✅ {message}</span>
      {onDismiss && (
        <button
          x-on:click="show = false; if (onDismiss) onDismiss()"
          className="text-green-600 hover:text-green-600/80 text-sm"
        >
          ✕
        </button>
      )}
    </div>
  )
}


