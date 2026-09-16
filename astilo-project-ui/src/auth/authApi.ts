import axios from "axios";
import { apiClient } from "../lib/apiClient";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** Friendly, status-based messages — the backend's error responses aren't JSON (CherryPy default error pages). */
export const authErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    switch (err.response?.status) {
      case 401:
        return "That email or password doesn't match our records.";
      case 409:
        return "An account with that email already exists.";
      case 400:
        return "Please check your details — name, a valid email, and a password of 6+ characters.";
      case undefined:
        return "Can't reach the server. Is the backend running?";
    }
  }
  return fallback;
};

export const loginRequest = (email: string, password: string) =>
  apiClient
    .post<AuthResponse>("/auth", { email, password }, { params: { action: "login" } })
    .then((r) => r.data);

export const registerRequest = (name: string, email: string, password: string) =>
  apiClient
    .post<AuthResponse>("/auth", { name, email, password }, { params: { action: "register" } })
    .then((r) => r.data);
