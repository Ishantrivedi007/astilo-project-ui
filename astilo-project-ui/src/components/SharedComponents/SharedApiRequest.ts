import { useState } from "react";
import axios, { type Method } from "axios";

type Headers = Record<string, string>;

interface UseSharedApiRequest<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  requestCall: (
    url: string,
    method: Method,
    payload?: unknown,
    headers?: Headers
  ) => Promise<void>;
}

const SharedApiRequest = <T = unknown>(): UseSharedApiRequest<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const requestCall = async (
    url: string,
    method: Method,
    payload: unknown = null,
    headers: Headers = { "Content-Type": "application/json" }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.request({
        url,
        method,
        data: payload,
        headers,
      });
      setData(response.data as T);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, requestCall };
};

export default SharedApiRequest;
