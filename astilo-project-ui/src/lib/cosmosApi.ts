import axios from "axios";
import { apiClient } from "./apiClient";

const API_BASE = import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api";

// Every Cosmos response the backend returns is wrapped with provenance, so
// the UI can always show "where this came from" instead of presenting
// external data as if Astilo's produced it.
export interface CosmosEnvelope<T> {
  source: string;
  sourceDataset: string;
  externalId: string | null;
  retrievedAt: string;
  data: T;
  raw?: unknown;
}

export interface AsteroidData {
  name: string;
  designation: string;
  kind: string | null;
  orbitClass: string | null;
  neo: boolean | null;
  potentiallyHazardous: boolean | null;
  diameterKm: string | null;
  absoluteMagnitudeH: string | null;
  rotationPeriodHours: string | null;
  albedo: string | null;
  orbitalPeriodDays: string | null;
  semiMajorAxisAu: string | null;
  eccentricity: string | null;
  inclinationDeg: string | null;
  epoch: string | null;
}

export interface ExoplanetData {
  name: string;
  hostStar: string;
  discoveryMethod: string | null;
  discoveryYear: number | null;
  orbitalPeriodDays: number | null;
  semiMajorAxisAu: number | null;
  eccentricity: number | null;
  radiusEarthRadii: number | null;
  massEarthMasses: number | null;
  equilibriumTemperatureK: number | null;
  hostStarTeffK: number | null;
  hostStarRadiusSolarRadii: number | null;
  hostStarMassSolarMasses: number | null;
  hostStarSpectralType: string | null;
  distanceParsecs: number | null;
  _provenance: { source: string; sourceDataset: string };
}

export interface ObservationData {
  observationId: string | null;
  mission: string | null;
  instrument: string | null;
  filters: string | null;
  target: string | null;
  observationDate: number | null;
  raDeg: number | null;
  decDeg: number | null;
  productType: string | null;
  previewImageUrl: string | null;
  obsid: number | null;
}

export interface NasaImageData {
  nasaId: string;
  title: string;
  description: string | null;
  dateCreated: string | null;
  center: string | null;
  keywords: string[] | null;
  previewUrl: string | null;
}

export interface ApodData {
  title: string;
  explanation: string;
  date: string;
  mediaType: string;
  imageUrl: string;
  hdImageUrl: string | null;
  copyright: string | null;
}

const cosmos = axios.create({ baseURL: `${API_BASE}/cosmos`, timeout: 20000 });

// -- Keyless (JPL, NASA Exoplanet Archive, MAST, NASA image library) --

export async function fetchAsteroid(designation: string): Promise<CosmosEnvelope<AsteroidData>> {
  const { data } = await cosmos.get(`/asteroids`, { params: { designation } });
  return data;
}

export async function fetchCloseApproaches(params: { designation?: string; dateMin?: string; dateMax?: string; distMax?: string } = {}) {
  const { data } = await cosmos.get(`/close-approaches`, {
    params: {
      designation: params.designation,
      date_min: params.dateMin ?? "now",
      date_max: params.dateMax ?? "+60",
      dist_max: params.distMax ?? "0.05",
    },
  });
  return data as CosmosEnvelope<{ count: number; results: Record<string, string>[] }>;
}

export async function searchExoplanets(params: { name?: string; hostStar?: string; limit?: number }) {
  const { data } = await cosmos.get(`/exoplanets`, {
    params: { name: params.name, host_star: params.hostStar, limit: params.limit ?? 25 },
  });
  return data as CosmosEnvelope<{ count: number; results: ExoplanetData[] }>;
}

export async function fetchExoplanet(exactName: string): Promise<ExoplanetData> {
  const { data } = await cosmos.get(`/exoplanets`, { params: { exact_name: exactName } });
  return data;
}

export async function searchObservations(target: string, mission?: string, limit = 25) {
  const { data } = await cosmos.get(`/observations`, { params: { target, mission, limit } });
  return data as CosmosEnvelope<{ count: number; results: ObservationData[] }>;
}

export async function searchNasaImages(query: string, limit = 25) {
  const { data } = await cosmos.get(`/images`, { params: { q: query, limit } });
  return data as CosmosEnvelope<{ count: number; results: NasaImageData[] }>;
}

export async function fetchHorizonsEphemeris(command: string, startTime: string, stopTime: string, stepSize = "1d") {
  const { data } = await cosmos.get(`/horizons`, {
    params: { command, start_time: startTime, stop_time: stopTime, step_size: stepSize },
  });
  return data as CosmosEnvelope<{ result: string }>;
}

// -- Needs NASA_API_KEY on the backend (falls back to the rate-limited DEMO_KEY) --

export async function fetchApod(date?: string): Promise<CosmosEnvelope<ApodData>> {
  const { data } = await cosmos.get(`/apod`, { params: { date } });
  return data;
}

export async function fetchNearEarthObjects(startDate: string, endDate: string) {
  const { data } = await cosmos.get(`/neo`, { params: { start_date: startDate, end_date: endDate } });
  return data as CosmosEnvelope<{ count: number; results: Record<string, unknown>[] }>;
}

export async function fetchSpaceWeather(startDate: string, endDate: string, eventType = "all") {
  const { data } = await cosmos.get(`/space-weather`, {
    params: { start_date: startDate, end_date: endDate, event_type: eventType },
  });
  return data as CosmosEnvelope<{ count: number; results: Record<string, unknown>[] }>;
}

export interface StarData {
  queriedName: string;
  gaiaSourceId: number;
  raDeg: number | null;
  decDeg: number | null;
  parallaxMas: number | null;
  properMotionRaMasYr: number | null;
  properMotionDecMasYr: number | null;
  radialVelocityKmS: number | null;
  gMagnitude: number | null;
  bpRpColor: number | null;
  effectiveTempK: number | null;
}

export async function fetchStar(name: string): Promise<CosmosEnvelope<StarData>> {
  const { data } = await cosmos.get(`/stars`, { params: { name } });
  return data;
}

export interface HighEnergyObservationRow {
  name: string;
  ra: number;
  dec: number;
  obsid: string;
  time: number;
  exposure_a: number;
  public_date: number;
}

export async function searchHighEnergyObservations(name: string, catalog = "numaster", limit = 10) {
  const { data } = await cosmos.get(`/high-energy`, { params: { name, catalog, limit } });
  return data as CosmosEnvelope<{ queriedName: string; catalog: string; count: number; results: HighEnergyObservationRow[] }>;
}

export interface GalaxyData {
  name: string;
  objectType: string | null;
  raDeg: number | null;
  decDeg: number | null;
  angularMajorAxisArcmin: number | null;
  angularMinorAxisArcmin: number | null;
  morphologicalType: string | null;
  redshift: number | null;
  spectralType: string | null;
  parallaxMas: number | null;
}

export async function fetchGalaxy(name: string): Promise<CosmosEnvelope<GalaxyData>> {
  const { data } = await cosmos.get(`/galaxies`, { params: { name } });
  return data;
}

export interface SupernovaRemnantRow {
  name: string;
  ra: number;
  dec: number;
  major_diameter: number | null;
  minor_diameter: number | null;
  type: string | null;
  flux_1_ghz: number | null;
}

export async function searchSupernovae(name: string, limit = 10) {
  const { data } = await cosmos.get(`/supernovae`, { params: { name, limit } });
  return data as CosmosEnvelope<{ queriedName: string; catalog: string; count: number; results: SupernovaRemnantRow[] }>;
}

// -- Cosmos Library (requires auth; the axios instance below attaches the token) --

export type CosmosObjectType =
  | "planet"
  | "asteroid"
  | "exoplanet"
  | "star"
  | "observation"
  | "image"
  | "galaxy"
  | "supernova";

export interface CosmosSavedItem {
  id: number;
  objectType: CosmosObjectType;
  externalId: string;
  collection: string;
  title: string | null;
  source: string | null;
  sourceDataset: string | null;
  imageUrl: string | null;
  data: unknown;
  notes: string | null;
  createdAt: string | null;
}

export async function fetchCosmosLibrary(objectType?: CosmosObjectType, collection?: string) {
  const { data } = await apiClient.get<CosmosSavedItem[]>(`/cosmos/library`, {
    params: { object_type: objectType, collection },
  });
  return data;
}

export async function saveCosmosItem(item: {
  objectType: CosmosObjectType;
  externalId: string;
  collection?: string;
  title?: string;
  source?: string;
  sourceDataset?: string;
  imageUrl?: string;
  data?: unknown;
  notes?: string;
}) {
  const { data } = await apiClient.post<CosmosSavedItem>(`/cosmos/library`, item);
  return data;
}

export async function deleteCosmosItem(id: number) {
  await apiClient.delete(`/cosmos/library/${id}`);
}
