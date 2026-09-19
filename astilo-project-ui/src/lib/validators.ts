/** Small, dependency-free field validators shared across every form in the
 * app. Each returns an error string (shown in AppInput's errorMessage) or
 * null when the value is valid. */

export const required = (value: string, label = "This field"): string | null =>
  value.trim() ? null : `${label} is required.`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const email = (value: string): string | null => {
  if (!value.trim()) return "Email is required.";
  return EMAIL_RE.test(value.trim()) ? null : "Enter a valid email address.";
};

export const minLength = (value: string, min: number, label = "This field"): string | null =>
  value.trim().length >= min ? null : `${label} must be at least ${min} characters.`;

export const maxLength = (value: string, max: number, label = "This field"): string | null =>
  value.length <= max ? null : `${label} must be ${max} characters or fewer.`;

export const passwordStrength = (value: string): string | null => {
  if (value.length < 6) return "Password must be at least 6 characters.";
  return null;
};

export const matches = (value: string, other: string, message: string): string | null =>
  value === other ? null : message;

const PHONE_RE = /^[+\d][\d\s().-]{6,}$/;
export const phone = (value: string): string | null => {
  if (!value.trim()) return null; // optional field
  return PHONE_RE.test(value.trim()) ? null : "Enter a valid phone number.";
};

const URL_RE = /^https?:\/\/.+\..+/i;
export const url = (value: string): string | null => {
  if (!value.trim()) return null; // optional field
  return URL_RE.test(value.trim()) ? null : "Enter a valid URL (starting with http:// or https://).";
};

export const positiveNumber = (value: number, label = "This field"): string | null =>
  value > 0 ? null : `${label} must be greater than 0.`;

export const nonNegativeNumber = (value: number, label = "This field"): string | null =>
  value >= 0 ? null : `${label} can't be negative.`;

const CARD_NUMBER_RE = /^\d{13,19}$/;
export const cardNumber = (value: string): string | null => {
  const digits = value.replace(/\s+/g, "");
  if (!digits) return "Card number is required.";
  return CARD_NUMBER_RE.test(digits) ? null : "Enter a valid card number.";
};

const CARD_EXPIRY_RE = /^(0[1-9]|1[0-2])\/\d{2}$/;
export const cardExpiry = (value: string): string | null => {
  if (!value.trim()) return "Expiry is required.";
  if (!CARD_EXPIRY_RE.test(value.trim())) return "Use MM/YY format.";
  const [mm, yy] = value.trim().split("/").map(Number);
  const now = new Date();
  const curYear = now.getFullYear() % 100;
  const curMonth = now.getMonth() + 1;
  if (yy < curYear || (yy === curYear && mm < curMonth)) return "Card has expired.";
  return null;
};

const CARD_CVC_RE = /^\d{3,4}$/;
export const cardCvc = (value: string): string | null => {
  if (!value.trim()) return "CVC is required.";
  return CARD_CVC_RE.test(value.trim()) ? null : "Enter a valid CVC.";
};

const ZIP_RE = /^[A-Za-z0-9][A-Za-z0-9\s-]{2,9}$/;
export const postalCode = (value: string): string | null => {
  if (!value.trim()) return "Postal code is required.";
  return ZIP_RE.test(value.trim()) ? null : "Enter a valid postal code.";
};

/** Runs a set of {field: validator(value)} checks and returns the first
 * error per field, plus whether the whole set passed. */
export function validateAll<T extends Record<string, string | null>>(
  results: T
): { errors: T; isValid: boolean } {
  const isValid = Object.values(results).every((v) => !v);
  return { errors: results, isValid };
}
