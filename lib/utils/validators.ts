import { WORLD_MAX_COORDINATE } from "@/lib/world/constants"

/**
 * Validate that a coordinate pair falls within the configured world bounds.
 */
export function validateCoordinates(
  x: number,
  y: number,
  maxX = WORLD_MAX_COORDINATE,
  maxY = WORLD_MAX_COORDINATE,
): boolean {
  return x >= 0 && x <= maxX && y >= 0 && y <= maxY && Number.isInteger(x) && Number.isInteger(y)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 32 && /^[a-zA-Z0-9_-]+$/.test(username)
}

export function validateResourceAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 0 && amount <= 1000000
}

export function validatePassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128
}
