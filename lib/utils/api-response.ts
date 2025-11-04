import { NextResponse } from "next/server"
import { ZodError } from "zod"

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errors?: Record<string, string[]>
}

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(
  error: string | Error | ZodError,
  status = 400,
): NextResponse<ApiResponse> {
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    error.errors.forEach((err) => {
      const path = err.path.join(".")
      if (!errors[path]) {
        errors[path] = []
      }
      errors[path].push(err.message)
    })
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        errors,
      },
      { status },
    )
  }

  const message = error instanceof Error ? error.message : error
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  )
}

export function unauthorizedResponse(): NextResponse<ApiResponse> {
  return errorResponse("Unauthorized", 401)
}

export function notFoundResponse(): NextResponse<ApiResponse> {
  return errorResponse("Not found", 404)
}

export function serverErrorResponse(error: unknown): NextResponse<ApiResponse> {
  console.error("[API Error]:", error)
  const message = error instanceof Error ? error.message : "Internal server error"
  return errorResponse(message, 500)
}

