export const SECURITY_CONFIG = {
  username: {
    minLength: 3,
    maxLength: 16,
    pattern: /^[a-zA-Z0-9_]+$/,
  },
  password: {
    minLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: true,
  },
  captcha: {
    expiryMinutes: parseInt(process.env.CAPTCHA_EXPIRY_MINUTES || "5", 10),
  },
  emailVerification: {
    expiryHours: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || "24", 10),
  },
  session: {
    idleTimeoutMinutes: parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || "30", 10),
    defaultLifetimeHours: parseInt(process.env.SESSION_LIFETIME_HOURS || "24", 10),
    rememberLifetimeDays: parseInt(process.env.SESSION_REMEMBER_DAYS || "30", 10),
  },
  login: {
    maxFailures: parseInt(process.env.LOGIN_FAILURE_THRESHOLD || "5", 10),
    lockoutMinutes: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || "15", 10),
    windowMinutes: parseInt(process.env.LOGIN_WINDOW_MINUTES || "15", 10),
    suspiciousIps: parseInt(process.env.LOGIN_SUSPICIOUS_IP_THRESHOLD || "3", 10),
  },
  twoFactor: {
    backupCodeCount: 10,
    backupCodeLength: 10,
    trustedDeviceDays: parseInt(process.env.TRUSTED_DEVICE_DAYS || "30", 10),
    challengeExpiryMinutes: 10,
  },
  passwordReset: {
    expiryMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES || "30", 10),
    maxRequestsPerHour: parseInt(process.env.PASSWORD_RESET_PER_HOUR || "3", 10),
    maxRequestsPerDay: parseInt(process.env.PASSWORD_RESET_PER_DAY || "10", 10),
  },
  recovery: {
    rateLimitHours: parseInt(process.env.RECOVERY_RATE_LIMIT_HOURS || "12", 10),
  },
}

export type SecurityConfig = typeof SECURITY_CONFIG
