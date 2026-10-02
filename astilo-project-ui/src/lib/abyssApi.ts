import axios from "axios";
import { apiClient } from "./apiClient";

const API_BASE = import.meta.env.VITE_BASE_URL?.trim() || "http://localhost:8080/api";

// Astilo Abyss rule #6 — every value shown to a user is tagged with one of
// these so observed fact, model output, curated content and simulation
// never blur together. Mirrors app/abyss/http.py's CONFIDENCE_LEVELS.
export type AbyssConfidence = "OBSERVED" | "MODELLED" | "CURATED" | "SIMULATED" | "AI_INFERRED" | "UNKNOWN";

// Every Abyss response the backend returns is wrapped with provenance, so
// the UI can always show "where this came from" instead of presenting
// external, modelled or simulated data as if it were an observed fact.
export interface AbyssEnvelope<T> {
  source: string;
  sourceDataset: string;
  externalId: string | null;
  retrievedAt: string;
  confidence: AbyssConfidence;
  data: T;
  raw?: unknown;
}

export interface AbyssStatusData {
  phase: string;
  confidenceLevels: AbyssConfidence[];
  registeredDataSources: number;
  enabledDataSources: number;
}

export interface DataSourceData {
  id: number;
  module: string;
  provider: string;
  dataset: string;
  license: string;
  commercialAllowed: boolean | null;
  attributionRequired: boolean;
  enabled: boolean;
  sourceUrl: string | null;
  termsUrl: string | null;
  notes: string | null;
  retrievedAt: string | null;
  licenseCheckedAt: string | null;
}

const abyss = axios.create({ baseURL: `${API_BASE}/abyss`, timeout: 20000 });

export async function fetchAbyssStatus(): Promise<AbyssEnvelope<AbyssStatusData>> {
  const { data } = await abyss.get("/status");
  return data;
}

export async function fetchDataSources(params: { module?: string; enabled?: boolean } = {}): Promise<{ dataSources: DataSourceData[] }> {
  const { data } = await abyss.get("/data-sources", {
    params: { module: params.module, enabled: params.enabled === undefined ? undefined : String(params.enabled) },
  });
  return data;
}

export interface WormsRecordData {
  aphiaId: number;
  scientificName: string;
  authority: string | null;
  status: string | null;
  rank: string | null;
  kingdom: string | null;
  phylum: string | null;
  className: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  isMarine: number | null;
  isExtinct: number | null;
  validName: string | null;
  validAphiaId: number | null;
  citation: string | null;
}

export interface ClassificationLineageEntry {
  rank: string | null;
  scientificName: string | null;
  aphiaId: number | null;
}

export interface WormsDistributionEntry {
  locality: string | null;
  higherGeography: string | null;
  recordStatus: string | null;
  establishmentMeans: string | null;
}

export interface ObisOccurrence {
  id: string | null;
  scientificName: string | null;
  decimalLatitude: number | null;
  decimalLongitude: number | null;
  depth: number | null;
  eventDate: string | null;
  datasetName: string | null;
  institutionCode: string | null;
  basisOfRecord: string | null;
  country: string | null;
}

export interface GbifOccurrence {
  key: number | null;
  decimalLatitude: number | null;
  decimalLongitude: number | null;
  eventDate: string | null;
  basisOfRecord: string | null;
  institutionCode: string | null;
  datasetKey: string | null;
  license: string;
}

export interface SpeciesProfileData {
  taxonomy: AbyssEnvelope<WormsRecordData>;
  classification: AbyssEnvelope<{ lineage: ClassificationLineageEntry[] }>;
  distribution: AbyssEnvelope<{ results: WormsDistributionEntry[] }>;
  occurrences: AbyssEnvelope<{ total: number; results: ObisOccurrence[] }>;
}

export async function searchSpecies(q: string, limit = 10): Promise<AbyssEnvelope<{ results: WormsRecordData[] }>> {
  const { data } = await abyss.get("/species/search", { params: { q, limit } });
  return data;
}

export async function fetchSpeciesProfile(aphiaId: number): Promise<SpeciesProfileData> {
  const { data } = await abyss.get("/species/profile", { params: { aphiaId } });
  return data;
}

export async function fetchGbifOccurrences(scientificName: string, limit = 50): Promise<AbyssEnvelope<{ total: number; results: GbifOccurrence[]; excludedByLicense: number }>> {
  const { data } = await abyss.get("/species/occurrences/gbif", { params: { scientificName, limit } });
  return data;
}

export interface AbyssCodexItem {
  id: number;
  objectType: string;
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

export interface SaveCodexItemInput {
  objectType: "species" | "occurrence" | "habitat" | "expedition" | "sound";
  externalId: string;
  collection?: string;
  title?: string;
  source?: string;
  sourceDataset?: string;
  imageUrl?: string;
  data?: unknown;
  notes?: string;
}

export async function fetchCodex(params: { objectType?: string; collection?: string } = {}): Promise<AbyssCodexItem[]> {
  const { data } = await apiClient.get<AbyssCodexItem[]>("/abyss/codex", { params });
  return data;
}

export async function saveCodexItem(input: SaveCodexItemInput): Promise<AbyssCodexItem> {
  const { data } = await apiClient.post<AbyssCodexItem>("/abyss/codex", input);
  return data;
}

export async function deleteCodexItem(itemId: number): Promise<void> {
  await apiClient.delete(`/abyss/codex/${itemId}`);
}

export interface OceanXyzLayer {
  id: string;
  label: string;
  kind: "xyz";
  tileUrlTemplate: string;
  defaultTime: string;
  source: string;
  attribution: string;
  confidence: AbyssConfidence;
}

export interface OceanWmsLayer {
  id: string;
  label: string;
  kind: "wms";
  wmsBaseUrl: string;
  wmsLayer: string;
  source: string;
  attribution: string;
  confidence: AbyssConfidence;
}

export type OceanLayer = OceanXyzLayer | OceanWmsLayer;

export async function fetchOceanLayers(): Promise<AbyssEnvelope<{ layers: OceanLayer[] }>> {
  const { data } = await abyss.get("/ocean/layers");
  return data;
}

export interface OceanDepthData {
  latitude: number;
  longitude: number;
  depthMeters: number | null;
}

export async function fetchDepthAtPoint(lat: number, lon: number): Promise<AbyssEnvelope<OceanDepthData>> {
  const { data } = await abyss.get("/ocean/depth", { params: { lat, lon } });
  return data;
}

export interface DepthZoneSpecies {
  scientificName: string;
  commonName: string;
}

export interface DepthZone {
  id: string;
  label: string;
  minMeters: number;
  maxMeters: number;
  lightPercent: number;
  tempRangeC: string;
  description: string;
  species: DepthZoneSpecies[];
}

export async function fetchDepthZones(): Promise<AbyssEnvelope<{ zones: DepthZone[] }>> {
  const { data } = await abyss.get("/depth-descent/zones");
  return data;
}

export interface LicensedImage {
  url: string;
  license: string;
  artist: string;
  pageTitle: string;
}

/** Returns null (not a rejected promise) when no appropriately-licensed
 * image exists for this topic — callers must render a graceful placeholder,
 * never treat it as a fetch failure. */
export async function fetchSpeciesImage(title: string): Promise<AbyssEnvelope<LicensedImage | null>> {
  const { data } = await abyss.get("/species-image", { params: { title } });
  return data;
}

export interface DepthComparisonPoint {
  id: string;
  label: string;
  meters: number;
}

export interface DepthComparisonData {
  depths: DepthComparisonPoint[];
  mountains: DepthComparisonPoint[];
  maxScaleMeters: number;
  note: string;
}

export async function fetchDepthComparisons(): Promise<AbyssEnvelope<DepthComparisonData>> {
  const { data } = await abyss.get("/depth-descent/comparisons");
  return data;
}

export interface TaxonNode {
  aphiaId: number;
  scientificName: string;
  rank: string | null;
  status: string | null;
  isExtinct: boolean;
}

export async function fetchTaxonomyChildren(aphiaId?: number): Promise<AbyssEnvelope<{ results: TaxonNode[] }>> {
  const { data } = await abyss.get("/taxonomy/children", { params: aphiaId ? { aphiaId } : {} });
  return data;
}

export async function fetchEvolutionRelatives(parentAphiaId: number): Promise<AbyssEnvelope<{ results: TaxonNode[] }>> {
  const { data } = await abyss.get("/evolution/relatives", { params: { parentAphiaId } });
  return data;
}

export interface DivergenceEstimate {
  taxonA: string;
  taxonB: string;
  myaRange: string | null;
  note: string;
}

export async function fetchDivergence(taxonA: string, taxonB: string): Promise<AbyssEnvelope<DivergenceEstimate>> {
  const { data } = await abyss.get("/evolution/divergence", { params: { taxonA, taxonB } });
  return data;
}

export interface Habitat {
  id: string;
  label: string;
  depthRange: string;
  temperatureRange: string;
  salinityPsu: string;
  description: string;
  threats: string[];
  exampleSpecies: string[];
  imageTopic: string;
}

export async function fetchHabitats(): Promise<AbyssEnvelope<{ habitats: Habitat[] }>> {
  const { data } = await abyss.get("/habitats");
  return data;
}

export interface VentFeature {
  id: string;
  label: string;
  description: string;
}

export interface VentOrganism {
  scientificName: string;
  commonName: string;
  note: string;
}

export async function fetchHydrothermalVents(): Promise<AbyssEnvelope<{ features: VentFeature[]; organisms: VentOrganism[]; chemosynthesisExplainer: string }>> {
  const { data } = await abyss.get("/hydrothermal-vents");
  return data;
}

export interface MicrobialGroup {
  id: string;
  label: string;
  exampleGenus: string;
  description: string;
}

export interface PlanktonCategory {
  id: string;
  label: string;
  description: string;
}

export interface MicrobialConcept {
  id: string;
  label: string;
  description: string;
}

export async function fetchMicrobialOcean(): Promise<AbyssEnvelope<{ microbialGroups: MicrobialGroup[]; planktonCategories: PlanktonCategory[]; concepts: MicrobialConcept[] }>> {
  const { data } = await abyss.get("/microbial-ocean");
  return data;
}

export interface ScalePoint {
  id: string;
  label: string;
  meters: number;
  scientificName: string | null;
}

export async function fetchScaleExplorer(): Promise<AbyssEnvelope<{ points: ScalePoint[] }>> {
  const { data } = await abyss.get("/scale-explorer");
  return data;
}

export interface CoverageIndexRegion {
  id: string;
  label: string;
  records: number;
  coverageIndex: number;
}

export async function fetchCoverageIndex(): Promise<AbyssEnvelope<{ regions: CoverageIndexRegion[]; methodology: string }>> {
  const { data } = await abyss.get("/coverage/index", { timeout: 60000 });
  return data;
}

export interface RareSpecies {
  scientificName: string;
  commonName: string;
  obisRecordCount: number | null;
}

export interface UnresolvedTaxonomyExample {
  topic: string;
  note: string;
}

export interface DepthProfilePoint {
  depthMeters: number;
}

export interface AnatomySpecies {
  id: string;
  label: string;
  searchQuery: string;
}

export async function fetchAnatomySpecies(): Promise<AbyssEnvelope<{ species: AnatomySpecies[] }>> {
  const { data } = await abyss.get("/anatomy/species");
  return data;
}

export interface AnatomyDiagram extends LicensedImage {
  system: string;
}

export async function fetchAnatomyDiagrams(speciesId: string): Promise<AbyssEnvelope<{ speciesLabel: string; diagrams: AnatomyDiagram[] }>> {
  const { data } = await abyss.get("/anatomy/diagrams", { params: { speciesId }, timeout: 60000 });
  return data;
}

export async function fetchTemperatureProfile(lat: number, lon: number): Promise<AbyssEnvelope<{ latitude: number; longitude: number; profile: (DepthProfilePoint & { temperatureC: number })[]; observedAt: string }>> {
  const { data } = await abyss.get("/copernicus/temperature", { params: { lat, lon }, timeout: 60000 });
  return data;
}

export async function fetchSalinityProfile(lat: number, lon: number): Promise<AbyssEnvelope<{ latitude: number; longitude: number; profile: (DepthProfilePoint & { salinityPsu: number })[]; observedAt: string }>> {
  const { data } = await abyss.get("/copernicus/salinity", { params: { lat, lon }, timeout: 60000 });
  return data;
}

export async function fetchSurfaceCurrent(lat: number, lon: number): Promise<AbyssEnvelope<{ latitude: number; longitude: number; speedMs: number | null; directionDeg: number | null; observedAt: string }>> {
  const { data } = await abyss.get("/copernicus/current", { params: { lat, lon }, timeout: 60000 });
  return data;
}

export async function fetchTheUnknown(): Promise<AbyssEnvelope<{
  poorlySampledRegions: RegionCoverage[];
  rarelyObservedSpecies: RareSpecies[];
  unresolvedTaxonomyExamples: UnresolvedTaxonomyExample[];
  scientificQuestions: string[];
}>> {
  const { data } = await abyss.get("/the-unknown", { timeout: 60000 });
  return data;
}

export interface DepthPhysicsData {
  depthMeters: number;
  zoneId: string;
  zoneLabel: string;
  lightPercent: number;
  pressureAtm: number;
}

export async function fetchDepthPhysics(depth: number): Promise<AbyssEnvelope<DepthPhysicsData>> {
  const { data } = await abyss.get("/depth-descent/at", { params: { depth } });
  return data;
}

export interface DepthEncounterData {
  zoneId: string;
  scientificName: string;
  commonName: string;
  distanceMeters: number;
  estimatedSizeCm: number;
}

export async function fetchDepthEncounter(depth: number): Promise<AbyssEnvelope<DepthEncounterData>> {
  const { data } = await abyss.get("/depth-descent/encounter", { params: { depth } });
  return data;
}

export interface SoundClip {
  id: string;
  commonName: string;
  category: string;
  url: string;
}

export async function fetchSoundCatalog(): Promise<AbyssEnvelope<{ clips: SoundClip[] }>> {
  const { data } = await abyss.get("/sounds/catalog");
  return data;
}

/** Same-origin proxy URL for a clip — required so a Web Audio AnalyserNode
 * can read real frequency data (NOAA's own S3 bucket sends no CORS headers). */
export function soundProxyUrl(clipId: string): string {
  return `${API_BASE}/abyss/sounds/proxy?id=${encodeURIComponent(clipId)}`;
}

export interface BioacousticClass {
  label: string;
  scorePercent: number;
}

export interface BioacousticResult {
  clipId: string;
  commonName: string;
  classes: BioacousticClass[];
  durationSeconds: number;
}

/** Runs a real local YAMNet model — first call on a cold server can take a
 * while (one-time ~14MB model download), hence the long timeout. */
export async function classifySound(clipId: string): Promise<AbyssEnvelope<BioacousticResult>> {
  const { data } = await abyss.get("/sounds/classify", { params: { clipId }, timeout: 90000 });
  return data;
}

export interface ChemistryZone {
  zoneId: string;
  zoneLabel: string;
  salinityPsu: string;
  phApprox: string;
  dissolvedOxygenMgL: string;
}

export async function fetchOceanChemistry(): Promise<AbyssEnvelope<{ zones: ChemistryZone[] }>> {
  const { data } = await abyss.get("/ocean/chemistry");
  return data;
}

export interface EdnaMatch {
  scientificName: string | null;
  matchPercent: number;
}

export async function fetchEdnaSample(): Promise<AbyssEnvelope<{ sampleId: string; matches: EdnaMatch[] }>> {
  const { data } = await abyss.get("/edna/sample");
  return data;
}

export interface MicroscopeSample {
  id: string;
  label: string;
  categories: string[];
}

export async function fetchMicroscopeSamples(): Promise<AbyssEnvelope<{ samples: MicroscopeSample[]; magnifications: number[] }>> {
  const { data } = await abyss.get("/microscope/samples");
  return data;
}

export interface MicroscopeSpecimen {
  id: string;
  category: string;
  commonName: string;
  imageUrl: string;
  imageType: string;
  credit: string;
  license: string;
}

export async function fetchMicroscopeSpecimens(sampleId: string): Promise<AbyssEnvelope<{ sampleLabel: string; specimens: MicroscopeSpecimen[] }>> {
  const { data } = await abyss.get("/microscope/specimens", { params: { sampleId } });
  return data;
}

export interface MysteryEvidence {
  type: string;
  available: boolean;
}

export interface MysteryOption {
  scientificName: string;
  commonName: string;
}

export async function fetchMysteryPuzzle(): Promise<AbyssEnvelope<{ puzzleId: string; zoneLabel: string; evidence: MysteryEvidence[]; options: MysteryOption[] }>> {
  const { data } = await abyss.get("/mystery/puzzle");
  return data;
}

export async function guessMysteryPuzzle(puzzleId: string, scientificName: string): Promise<AbyssEnvelope<{ puzzleId: string; correct: boolean; answerScientificName: string }>> {
  const { data } = await abyss.post("/mystery/guess", { puzzleId, scientificName });
  return data;
}

export interface FoodWebNode {
  id: string;
  label: string;
  level: number;
}

export interface FoodWebEdge {
  from: string;
  to: string;
}

export async function fetchFoodWebGraph(): Promise<AbyssEnvelope<{ nodes: FoodWebNode[]; edges: FoodWebEdge[] }>> {
  const { data } = await abyss.get("/food-web/graph");
  return data;
}

export async function simulateFoodWeb(changes: Record<string, number>): Promise<AbyssEnvelope<{ inputs: Record<string, number>; populationChangePercent: Record<string, number> }>> {
  const { data } = await abyss.post("/food-web/simulate", { changes });
  return data;
}

export interface ReefTwinYear {
  year: number;
  coralCoverPercent: number;
  fishBiomassPercent: number;
}

export interface ReefTwinData {
  baseline: { temperatureC: number; ph: number; coralCoverPercent: number; fishBiomassPercent: number };
  inputs: { temperatureDeltaC: number; phDelta: number; pollutionPercent: number; fishingPercent: number; years: number };
  timeline: ReefTwinYear[];
}

export async function simulateReefTwin(params: { tempDelta: number; phDelta: number; pollution: number; fishing: number; years: number }): Promise<AbyssEnvelope<ReefTwinData>> {
  const { data } = await abyss.get("/reef-twin/simulate", { params });
  return data;
}

export interface CreatureEnvironment {
  depthMeters: number;
  lightPercent: number;
  foodAvailability: "scarce" | "moderate" | "abundant";
}

export interface CreatureTraits {
  bioluminescence: boolean;
  eyeSize: "none" | "small" | "medium" | "large";
  skeleton: "rigid" | "reduced" | "none";
  metabolism: "slow" | "normal" | "fast";
  feedingStrategy: "active-hunter" | "ambush" | "filter-feeder" | "scavenger";
}

export interface CreatureEvaluation {
  ecologicalFitScore: number;
  verdict: string;
  notes: string[];
  pressureAtm: number;
}

export async function evaluateCreature(environment: CreatureEnvironment, traits: CreatureTraits): Promise<AbyssEnvelope<CreatureEvaluation>> {
  const { data } = await abyss.post("/creature/evaluate", { environment, traits });
  return data;
}

export interface EvolutionPressures {
  temperature: number;
  oxygen: number;
  food: number;
  predators: number;
}

export interface EvolutionGenerationSample {
  generation: number;
  meanSize: number;
  meanSpeed: number;
  population: number;
}

export async function runEvolutionSimulation(generations: number, pressures: EvolutionPressures): Promise<AbyssEnvelope<{ generations: number; pressures: EvolutionPressures; history: EvolutionGenerationSample[] }>> {
  const { data } = await abyss.post("/evolution/run", { generations, pressures });
  return data;
}

export type NereusMode = "ask" | "learn" | "scientist" | "guide" | "quiz" | "explain" | "compare";

export interface NereusStatusData {
  online: boolean;
  model: string;
  baseUrl: string;
  modes: NereusMode[];
}

export async function fetchNereusStatus(): Promise<AbyssEnvelope<NereusStatusData>> {
  const { data } = await abyss.get("/nereus/status");
  return data;
}

export interface NereusSource {
  label: string;
  text: string;
  url?: string;
}

export interface NereusAskContext {
  depth?: number;
  selectedSpecies?: string;
  selectedSpeciesAphiaId?: number;
}

export interface NereusAnswer {
  answer: string;
  mode: NereusMode;
  sources: NereusSource[];
  offline: boolean;
}

export interface KnowledgeBaseStatus {
  built: boolean;
  chunkCount: number;
  topicCount?: number;
}

export async function fetchKnowledgeBaseStatus(): Promise<AbyssEnvelope<KnowledgeBaseStatus>> {
  const { data } = await abyss.get("/knowledge/status");
  return data;
}

export async function buildKnowledgeBase(): Promise<AbyssEnvelope<{ chunkCount: number; fetchedTitles: string[]; skippedTitles: string[] }>> {
  const { data } = await abyss.post("/knowledge/build", {}, { timeout: 120000 });
  return data;
}

/** Local LLM generation can take well over the shared client's default
 * timeout, especially on a cold model load — give this call its own. */
export async function askNereus(question: string, mode: NereusMode, context: NereusAskContext): Promise<AbyssEnvelope<NereusAnswer>> {
  const { data } = await abyss.post("/nereus/ask", { question, mode, context }, { timeout: 120000 });
  return data;
}

export interface RegionCoverage {
  id: string;
  label: string;
  records: number | null;
  species: number | null;
  datasets: number | null;
  yearRange: [number, number] | null;
}

export async function fetchRegionalCoverage(): Promise<AbyssEnvelope<{ regions: RegionCoverage[] }>> {
  const { data } = await abyss.get("/coverage/regions", { timeout: 60000 });
  return data;
}

export interface DatasetComparisonData {
  scientificName: string;
  obisTotal: number;
  gbifTotal: number;
  gbifExcludedByLicense: number;
}

export async function compareDatasets(scientificName: string): Promise<AbyssEnvelope<DatasetComparisonData>> {
  const { data } = await abyss.get("/compare/datasets", { params: { scientificName } });
  return data;
}

export interface PaleoEra {
  id: string;
  label: string;
  myaRange: string;
  description: string;
  taxa: string[];
  illustrativeTaxon: string;
}

export async function fetchPaleoEras(): Promise<AbyssEnvelope<{ eras: PaleoEra[] }>> {
  const { data } = await abyss.get("/paleo-ocean/eras");
  return data;
}

export interface OceanVsSpaceWorld {
  id: string;
  label: string;
  water: string;
  sunlight: string;
  temperatureC: string;
  pressureAtm: string;
  energySource: string;
  knownLife: string;
  lifeStatus: "CONFIRMED" | "UNKNOWN";
  confidence: AbyssConfidence;
  summary: string;
  imageTopic?: string;
  imageUrl?: string;
  imageCredit?: string;
  imageLicense?: string;
}

export async function fetchOceanVsSpaceWorlds(): Promise<AbyssEnvelope<{ worlds: OceanVsSpaceWorld[] }>> {
  const { data } = await abyss.get("/ocean-vs-space/worlds");
  return data;
}

export interface RealExpeditionProgram {
  id: string;
  name: string;
  operator: string;
  categories: string[];
  description: string;
  url: string;
}

export async function fetchRealExpeditions(): Promise<AbyssEnvelope<{ categories: string[]; programs: RealExpeditionProgram[] }>> {
  const { data } = await abyss.get("/real-expeditions");
  return data;
}

export interface ProvenanceNode {
  id: string;
  label: string;
  kind: "species" | "dataset";
  source?: string;
  sourceDataset?: string;
  confidence?: AbyssConfidence;
  retrievedAt?: string;
  license?: string | null;
  citationUrl?: string | null;
  termsUrl?: string | null;
}

export interface ProvenanceEdge {
  from: string;
  to: string;
}

export async function fetchProvenanceGraph(aphiaId: number): Promise<AbyssEnvelope<{ nodes: ProvenanceNode[]; edges: ProvenanceEdge[] }>> {
  const { data } = await abyss.get("/provenance/graph", { params: { aphiaId } });
  return data;
}
