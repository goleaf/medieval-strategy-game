"use client"

import { CheckCircle } from "lucide-react"

interface SuccessMessageProps {
  children: React.ReactNode
}

export function SuccessMessage({ children }: SuccessMessageProps) {
  return (
    <div className="flex items-center gap-2 text-green-600">
      <CheckCircle className="h-4 w-4" />
      {children}
    </div>
  )
}