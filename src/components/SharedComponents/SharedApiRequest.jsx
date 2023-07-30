import { useState } from "react";
import axios from "axios";

const SharedApiRequest = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestCall = async (
    url,
    method,
    payload = null,
    headers = { "Content-Type": "application/json" }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios({
        url,
        method,
        data: payload,
        headers,
      });

      setData(response.data);
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
