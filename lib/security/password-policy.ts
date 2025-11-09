import { SECURITY_CONFIG } from "@/lib/config/security"

export function validateUsername(username: string) {
  const errors: string[] = []
  const trimmed = username.trim()

  if (trimmed.length < SECURITY_CONFIG.username.minLength || trimmed.length > SECURITY_CONFIG.username.maxLength) {
    errors.push(`Username must be between ${SECURITY_CONFIG.username.minLength} and ${SECURITY_CONFIG.username.maxLength} characters.`)
  }

  if (!SECURITY_CONFIG.username.pattern.test(trimmed)) {
    errors.push("Username may only include letters, numbers, and underscores.")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validatePassword(password: string) {
  const errors: string[] = []
  if (password.length < SECURITY_CONFIG.password.minLength) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.password.minLength} characters.`)
  }

  if (SECURITY_CONFIG.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter.")
  }

  if (SECURITY_CONFIG.password.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter.")
  }

  if (SECURITY_CONFIG.password.requireNumber && !/\d/.test(password)) {
    errors.push("Password must include at least one number.")
  }

  if (SECURITY_CONFIG.password.requireSymbol && !/[!@#$%^&*(),.?\":{}|<>_\-\\[\]\\\/~`+=;']/.test(password)) {
    errors.push("Password must include at least one symbol.")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function passwordStrength(password: string) {
  let strength = 0
  if (password.length >= SECURITY_CONFIG.password.minLength) strength += 1
  if (/[A-Z]/.test(password)) strength += 1
  if (/[a-z]/.test(password)) strength += 1
  if (/\d/.test(password)) strength += 1
  if (/[!@#$%^&*(),.?\":{}|<>_\-\\[\]\\\/~`+=;']/.test(password)) strength += 1

  return Math.min(strength, 5)
}
