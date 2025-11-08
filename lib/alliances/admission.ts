interface InviteConfig {
  baseHours: number;
  reminderHours: number[];
}

const defaultInviteConfig: InviteConfig = {
  baseHours: 72,
  reminderHours: [24, 48, 60]
};

export function calculateInviteExpiry(createdAt: Date, config = defaultInviteConfig): Date {
  const expires = new Date(createdAt);
  expires.setHours(expires.getHours() + config.baseHours);
  return expires;
}

export function reminderSchedule(config = defaultInviteConfig): Date[] {
  const now = new Date();
  return config.reminderHours.map(hours => {
    const reminder = new Date(now);
    reminder.setHours(reminder.getHours() + hours);
    return reminder;
  });
}

export function shouldAutoJoin(
  allowAutoJoin: boolean,
  memberCount: number,
  softCap: number
): boolean {
  return allowAutoJoin && memberCount < softCap;
}
