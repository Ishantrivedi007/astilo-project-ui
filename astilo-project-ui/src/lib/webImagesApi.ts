import axios from "axios";

const API_BASE = import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api";
const images = axios.create({ baseURL: `${API_BASE}/images`, timeout: 15000 });

export interface WebImageResult {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  creator: string | null;
  license: string | null;
  licenseUrl: string | null;
  provider: string | null;
  landingUrl: string | null;
  width: number | null;
  height: number | null;
}

/** General internet-wide image search (Openverse — free, keyless, every
 * result carries real creator/license attribution), for images beyond
 * what NASA's astronomy-only library covers. */
export async function searchWebImages(query: string, limit = 12) {
  const { data } = await images.get(`/search`, { params: { q: query, limit } });
  return data as {
    source: string;
    data: { count: number; results: WebImageResult[] };
  };
}
