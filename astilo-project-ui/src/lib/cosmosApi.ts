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

export interface ResearchSummaryData {
  title: string | null;
  extract: string | null;
  detailedExtract: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  pageUrl: string | null;
  articleImages: { title: string; url: string }[];
}

/** Real Wikipedia-sourced background summary for an object — free, keyless,
 * used to give Research notes actual understandable prose. */
export async function fetchResearchSummary(query: string): Promise<CosmosEnvelope<ResearchSummaryData>> {
  const { data } = await cosmos.get(`/research-summary`, { params: { q: query } });
  return data;
}

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

// -- Moons & spacecraft (JPL Horizons, resolved by name — no lookup table) --

export interface AmbiguousMatch {
  ambiguous: true;
  candidates: string[];
}

function isAmbiguousMatch(value: unknown): value is AmbiguousMatch {
  return Boolean(value) && typeof value === "object" && (value as { ambiguous?: boolean }).ambiguous === true;
}

export interface HorizonsVector {
  jd: number;
  x: number;
  y: number;
  z: number;
}

export async function fetchMoon(name: string, startTime: string, stopTime: string, stepSize = "1d", center?: string) {
  const { data } = await cosmos.get(`/moons`, {
    params: { name, start_time: startTime, stop_time: stopTime, step_size: stepSize, center },
  });
  return data as CosmosEnvelope<{ result: string; vectors: HorizonsVector[] }> | AmbiguousMatch;
}

export async function fetchSpacecraft(name: string, startTime: string, stopTime: string, stepSize = "1d", center?: string) {
  const { data } = await cosmos.get(`/spacecraft`, {
    params: { name, start_time: startTime, stop_time: stopTime, step_size: stepSize, center },
  });
  return data as CosmosEnvelope<{ result: string; vectors: HorizonsVector[] }> | AmbiguousMatch;
}

export { isAmbiguousMatch };

// -- Comet & nebula (reuse existing SBDB/SIMBAD backing under new categories) --

export async function fetchComet(designation: string): Promise<CosmosEnvelope<AsteroidData>> {
  const { data } = await cosmos.get(`/comets`, { params: { designation } });
  return data;
}

export async function fetchNebula(name: string): Promise<CosmosEnvelope<GalaxyData>> {
  const { data } = await cosmos.get(`/nebulae`, { params: { name } });
  return data;
}

// -- Observatories / mission browse (MAST, free-text mission, no target needed) --

export async function browseMission(
  mission: string,
  limit = 25,
  instrument?: string,
  startDate?: string,
  endDate?: string
) {
  const { data } = await cosmos.get(`/mission-browse`, {
    params: { mission, limit, instrument, start_date: startDate, end_date: endDate },
  });
  return data as CosmosEnvelope<{ count: number; results: ObservationData[] }>;
}

export interface SpectrumData {
  wavelength: (number | null)[];
  flux: (number | null)[];
  wavelengthUnit: string | null;
  fluxUnit: string | null;
  productFilename: string | null;
}

export async function fetchSpectrum(obsid: string | number): Promise<CosmosEnvelope<SpectrumData>> {
  const { data } = await cosmos.get(`/spectrum`, { params: { obsid } });
  return data;
}

export interface FitsImageStats {
  width: number;
  height: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  std: number | null;
}

export interface FitsImageHeader {
  instrument: string | null;
  telescope: string | null;
  filter: string | null;
  exposureTime: number | null;
  dateObs: string | null;
  object: string | null;
  ra: number | null;
  dec: number | null;
}

export interface FitsImageData {
  productFilename: string | null;
  imagePngBase64: string;
  stats: FitsImageStats;
  header: FitsImageHeader;
}

/** A real, normalized preview generated server-side from the observation's
 * own FITS image data (not the jpegURL quick-look thumbnail, which many
 * observations lack) — see app/cosmos/mast.py's fetch_fits_image. Slower
 * than the other Cosmos calls since it downloads and decodes an actual
 * science FITS file, sometimes tens of MB. */
export async function fetchFitsImage(obsid: string | number): Promise<CosmosEnvelope<FitsImageData>> {
  const { data } = await cosmos.get(`/fits-image`, { params: { obsid }, timeout: 60_000 });
  return data;
}

// -- Satellite tracker (CelesTrak live TLE catalog + SGP4, no API key) --

export interface SatellitePositionData {
  name: string;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  timestamp: string;
}

export async function fetchSatellitePosition(name = "ISS", group = "stations") {
  const { data } = await cosmos.get(`/satellites`, { params: { name, group } });
  return data as CosmosEnvelope<SatellitePositionData | AmbiguousMatch>;
}

export async function searchSatellites(query: string, group = "stations") {
  const { data } = await cosmos.get(`/satellites/search`, { params: { q: query, group } });
  return data as { count: number; results: { name: string }[] };
}

export interface SatellitePass {
  riseTime: string;
  maxElevationTime: string;
  maxElevationDeg: number;
  azimuthAtMax: number;
  setTime: string | null;
}

export async function fetchSatellitePasses(
  name: string,
  group: string,
  lat: number,
  lon: number,
  alt = 0,
  hours = 48,
  minElevation = 10
) {
  const { data } = await cosmos.get(`/satellites/passes`, {
    params: { name, group, lat, lon, alt, hours, min_elevation: minElevation },
  });
  return data as { satellite: string; passes: SatellitePass[] };
}

// -- Space weather alerts (live-computed on each poll, no persisted alert state) --

export interface SpaceWeatherEvent {
  messageType: string | null;
  issueTime: string | null;
  body: string | null;
  url: string | null;
}

export async function fetchSpaceWeatherPulse(sinceHours = 24) {
  const { data } = await cosmos.get(`/space-weather/pulse`, { params: { since_hours: sinceHours } });
  return data as CosmosEnvelope<{ count: number; results: SpaceWeatherEvent[] }>;
}

// -- Astronomy reference library (live Wikipedia category membership) --

export interface AstronomyTopic {
  title: string;
  isCategory: boolean;
}

export async function fetchAstronomyTopics(category = "Astronomy", limit = 30) {
  const { data } = await cosmos.get(`/astronomy-topics`, { params: { category, limit } });
  return data as CosmosEnvelope<{ count: number; results: AstronomyTopic[] }>;
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
  commonName: string | null;
  objectType: string | null;
  rawObjectType: string | null;
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

// -- Hubble research catalog (curated seed list + SIMBAD-classified search) --

export type HubbleCategory =
  | "planet"
  | "moon"
  | "asteroid"
  | "comet"
  | "star"
  | "exoplanet"
  | "nebula"
  | "galaxy"
  | "supernova"
  | "black_hole"
  | "uncategorized";

export interface HubbleCatalogEntry {
  targetId: string;
  name: string;
  category: HubbleCategory;
  thumbnailUrl: string | null;
  obsCount: number;
  hasImages: boolean;
}

export async function browseHubbleCatalog(category?: string, q?: string, limit = 40, offset = 0) {
  const { data } = await cosmos.get(`/hubble/catalog`, { params: { category, q, limit, offset } });
  return data as CosmosEnvelope<{ count: number; results: HubbleCatalogEntry[] }>;
}

export interface HubbleMonitorFinding {
  targetId: string;
  name: string;
  category: HubbleCategory;
  previousCount: number;
  currentCount: number;
  newObservations: number;
}

export interface HubbleMonitorData {
  checkedTargetIds: string[];
  findings: HubbleMonitorFinding[];
  targetsEverChecked: number;
  totalTargetsInCatalog: number;
  checkedAt: string;
}

/** A real, polled diff against MAST's own observation counts for a
 * rotating slice of the Hubble catalog — not a simulated live-telescope
 * feed. Call on an interval (e.g. via react-query's refetchInterval) to
 * build a live-updating "what's new" dashboard. */
export async function fetchHubbleMonitor(limit = 12) {
  const { data } = await cosmos.get(`/hubble/monitor`, { params: { limit } });
  return data as CosmosEnvelope<HubbleMonitorData>;
}

export interface HubblePositionData {
  name: string;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  timestamp: string;
}

/** Hubble's real current position in low Earth orbit (lat/lon/altitude) —
 * live CelesTrak TLE + SGP4 propagation, the same mechanism the satellite
 * tracker uses for the ISS. This is where the telescope physically is in
 * orbit, not where it's pointing/aiming for an observation (no public API
 * exposes that). Not cached server-side — recomputed every call. */
export async function fetchHubblePosition() {
  const { data } = await cosmos.get(`/hubble/position`);
  return data as CosmosEnvelope<HubblePositionData>;
}

export interface HubbleDistance {
  valuePc: number | null;
  valueLy: number | null;
  method: string | null;
  confidence: "measured" | "approximate" | "unavailable";
}

export interface HubbleClassification {
  objectType: string | null;
  spectralType: string | null;
  morphologicalType: string | null;
  orbitClass: string | null;
}

export interface HubbleComposition {
  extract: string | null;
  detailedExtract: string | null;
  articleImages: { title: string; url: string }[];
  pageUrl: string | null;
}

export interface HubbleTargetDetail {
  target: { targetId: string; name: string; category: HubbleCategory };
  classification: HubbleClassification;
  distance: HubbleDistance;
  composition: HubbleComposition;
  physicalProperties: {
    exoplanet: ExoplanetData | null;
    star: StarData | null;
    smallBody: AsteroidData | null;
    highEnergy: unknown | null;
  };
  images: ObservationData[];
  sourceEnvelopes: Record<string, CosmosEnvelope<unknown>>;
}

export async function fetchHubbleTarget(targetId: string) {
  const { data } = await cosmos.get(`/hubble/target`, { params: { target: targetId } });
  return data as CosmosEnvelope<HubbleTargetDetail>;
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
  | "supernova"
  | "moon"
  | "nebula"
  | "comet"
  | "spacecraft"
  | "hubbleTarget";

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
