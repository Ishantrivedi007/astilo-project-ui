/** Rough, dependency-free user-agent summary for the sign-in history list —
 * not meant to be exhaustive, just enough to tell devices apart at a glance. */
export const summarizeUserAgent = (ua: string | null | undefined): { browser: string; os: string; icon: string } => {
  const s = ua ?? "";

  let browser = "Unknown browser";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/Chrome\//.test(s) && !/Chromium/.test(s)) browser = "Chrome";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Safari\//.test(s) && !/Chrome/.test(s)) browser = "Safari";
  else if (s) browser = "Browser";

  let os = "Unknown device";
  let icon = "🖥️";
  if (/iPhone|iPad/.test(s)) {
    os = "iOS";
    icon = "📱";
  } else if (/Android/.test(s)) {
    os = "Android";
    icon = "📱";
  } else if (/Mac OS X/.test(s)) {
    os = "macOS";
    icon = "💻";
  } else if (/Windows/.test(s)) {
    os = "Windows";
    icon = "🖥️";
  } else if (/Linux/.test(s)) {
    os = "Linux";
    icon = "🖥️";
  }

  return { browser, os, icon };
};
