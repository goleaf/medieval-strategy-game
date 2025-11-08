import reservedNames from "@/config/reserved-alliance-names.json";

const cleanedReserved = reservedNames.map(name => normalize(name));

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeAllianceName(raw: string): string {
  const collapsed = normalize(raw);
  if (!collapsed) {
    throw new Error("Alliance name cannot be empty");
  }
  if (collapsed.length < 3 || collapsed.length > 30) {
    throw new Error("Alliance name must be between 3 and 30 characters");
  }
  return collapsed
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function normalizeAllianceTag(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
  if (cleaned.length < 2 || cleaned.length > 5) {
    throw new Error("Alliance tag must be 2-5 characters");
  }
  return cleaned;
}

export function generateAllianceSlug(name: string, randomSuffix = true): string {
  const base = normalize(name).replace(/\s+/g, "-");
  if (!randomSuffix) {
    return base;
  }
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export function isReservedAllianceName(name: string): boolean {
  const normalized = normalize(name);
  return cleanedReserved.some(entry => entry === normalized);
}

export function assertNameIsAllowed(name: string) {
  if (isReservedAllianceName(name)) {
    throw new Error("Alliance name is reserved");
  }
}
