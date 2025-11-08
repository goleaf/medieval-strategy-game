export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

export type RateLimitKey =
  | "invite"
  | "announcement"
  | "announcement-emergency"
  | "member-note"
  | "report";

const rateLimits: Record<RateLimitKey, RateLimitConfig> = {
  invite: { windowSeconds: 3600, maxRequests: 20 },
  announcement: { windowSeconds: 86400, maxRequests: 3 },
  "announcement-emergency": { windowSeconds: 86400, maxRequests: 1 },
  "member-note": { windowSeconds: 900, maxRequests: 15 },
  report: { windowSeconds: 3600, maxRequests: 10 }
};

export function getRateLimit(key: RateLimitKey): RateLimitConfig {
  return rateLimits[key];
}

export function describeRateLimit(key: RateLimitKey): string {
  const config = getRateLimit(key);
  const hours = config.windowSeconds / 3600;
  return `${config.maxRequests} actions per ${hours}h`;
}
