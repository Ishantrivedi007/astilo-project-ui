import axios from "axios";

interface ApiErrorBody {
  error?: boolean;
  status?: number;
  message?: string;
}

/** Every backend error response is now real JSON — {error, status, message}
 * — from CherryPy's global error_page handler (app/server.py's
 * json_error_handler), so this always has the actual reason to show, not
 * just a status code. Falls back to `fallback` only for a genuine network
 * failure (no response at all) or a response shape that isn't ours. */
export const extractApiErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body && typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
    if (!err.response) return "Can't reach the server. Is the backend running?";
    return `${fallback} (${err.response.status})`;
  }
  return fallback;
};
