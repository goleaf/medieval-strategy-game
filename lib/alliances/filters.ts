export interface FilterResult {
  allowed: boolean;
  borderline: boolean;
  matches?: string[];
}

export interface FilterOptions {
  strength?: "low" | "medium" | "high";
  allowBypass?: boolean;
}

export async function runAllianceFilter(
  text: string,
  options: FilterOptions = {}
): Promise<FilterResult> {
  const normalized = text.trim();
  if (!normalized) {
    return { allowed: false, borderline: false, matches: ["EMPTY"] };
  }
  const banned = ["admin", "moderator"];
  const hit = banned.find(entry => normalized.toLowerCase().includes(entry));
  if (hit) {
    return { allowed: false, borderline: false, matches: [hit] };
  }
  if (options.strength === "high" && /test/.test(normalized.toLowerCase())) {
    return { allowed: false, borderline: true, matches: ["potential_impersonation"] };
  }
  return { allowed: true, borderline: false };
}
