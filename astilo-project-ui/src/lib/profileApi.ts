import axios from "axios";
import { apiClient } from "./apiClient";
import type { AuthUser } from "../auth/authApi";

/** Friendly, status-based messages — CherryPy's default error pages aren't JSON. */
export const profileErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    switch (err.response?.status) {
      case 401:
        return "Your current password doesn't match.";
      case 400:
        return "Please check the details you entered.";
      case 403:
        return "You don't have permission to do that.";
      case 404:
        return "Couldn't find your account.";
      case undefined:
        return "Can't reach the server. Is the backend running?";
    }
  }
  return fallback;
};

export const fetchMe = () => apiClient.get<AuthUser>("/users/me").then((r) => r.data);

export interface ProfilePatch {
  name?: string;
  bio?: string;
  phone?: string;
  location?: string;
  dateOfBirth?: string;
  gender?: string;
  website?: string;
  avatar?: string | null;
  gitLinksEnabled?: boolean;
  pinnedModules?: string[] | null;
}

export const updateProfile = (patch: ProfilePatch) =>
  apiClient.put<AuthUser>("/users/me", patch).then((r) => r.data);

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiClient.put<AuthUser>("/users/me", { currentPassword, newPassword }).then((r) => r.data);

export interface SessionEvent {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | null;
  isActive: boolean;
}

export const fetchSessions = () => apiClient.get<SessionEvent[]>("/sessions").then((r) => r.data);
