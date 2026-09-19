import axios from "axios";

/** Shared axios instance for the Astilo's backend (auth, store, favorites, playlists…). */
const API_BASE = import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api";

export const apiClient = axios.create({ baseURL: API_BASE });

/** Attach (or clear) the bearer token used for every authenticated request. */
export const setAuthToken = (token: string | null) => {
  if (token) apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete apiClient.defaults.headers.common.Authorization;
};

/** The raw current token, for the rare case (e.g. an <iframe src>) that
 * can't carry an Authorization header and needs it as a query param instead. */
export const getAuthToken = (): string | null => {
  const header = apiClient.defaults.headers.common.Authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
};

export const API_BASE_URL = API_BASE;
