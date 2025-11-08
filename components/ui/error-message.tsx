"use client"

import { AlertCircle } from "lucide-react"

interface ErrorMessageProps {
  children: React.ReactNode
}

export function ErrorMessage({ children }: ErrorMessageProps) {
  return (
    <div className="flex items-center gap-2 text-red-600">
      <AlertCircle className="h-4 w-4" />
      {children}
    </div>
  )
}