/**
 * Strips sensitive keys (identity numbers, OTPs, bank details, credentials) from any
 * value before it is written to offline storage. Removed keys are dropped entirely.
 */

/** Normalised keys (lowercase, alphanumerics only) that are always forbidden as a whole token. */
const FORBIDDEN_EXACT_KEYS = new Set<string>([
  "aadhaar",
  "aadhar",
  "uid",
  "uidai",
  "otp",
  "bankaccount",
  "accountnumber",
  "account",
  "ifsc",
  "password",
  "passcode",
  "pin",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "cookie",
  "authorization",
]);

/**
 * Prefix/suffix rules applied to the normalised key. Matched against the whole normalised
 * key, so "pincode", "postcode", "guid" and "footprint" are not matched.
 */
export const FORBIDDEN_KEY_PATTERN =
  /^(aadhaar|aadhar|otp|password|passcode|secret|token)|(password|secret|token)$/;

function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isForbiddenKey(key: string): boolean {
  const normalised = normaliseKey(key);
  return FORBIDDEN_EXACT_KEYS.has(normalised) || FORBIDDEN_KEY_PATTERN.test(normalised);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Returns a copy of `value` with every forbidden key removed, recursing through
 * plain objects and arrays. Non-plain values (primitives, Dates, etc.) are returned as-is.
 */
export function sanitizeRecord<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRecord(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (isForbiddenKey(key)) continue;
      out[key] = sanitizeRecord(child);
    }
    return out as T;
  }
  return value;
}
