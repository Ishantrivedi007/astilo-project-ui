/** Deterministic generated avatar image for a user — no upload needed, just a name/email seed. */
export const avatarUrl = (seed: string, size = 64) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
