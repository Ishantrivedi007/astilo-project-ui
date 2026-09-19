import { apiClient } from "./apiClient";
import type { CosmosObjectType } from "./cosmosApi";
import type { NimroseProject } from "./nimroseApi";

export interface ResearchNextStep {
  text: string;
  done: boolean;
}

export interface ResearchBrief {
  summary: string | null;
  detailedSummary: string | null;
  wikiTitle: string | null;
  wikiUrl: string | null;
  thumbnailUrl: string | null;
  keyPoints: string[];
  nextSteps: ResearchNextStep[];
  dataSnapshot: Record<string, unknown>;
  generatedAt: string;
}

export interface ResearchItem {
  id: number;
  objectType: CosmosObjectType;
  externalId: string;
  collection: string;
  title: string;
  source: string | null;
  sourceDataset: string | null;
  imageUrl: string | null;
  data: Record<string, unknown> | null;
  notes: string | null;
  researchProjectId: number | null;
  researchBrief: ResearchBrief | null;
  createdAt: string | null;
  project: NimroseProject | null;
  documentCount: number;
}

export interface ResearchCreateResult {
  createdNew: boolean;
  cosmosItem: ResearchItem;
  browserSpaceId: number | null;
}

export const researchObject = (payload: {
  objectType: CosmosObjectType;
  externalId: string;
  title: string;
  source?: string;
  sourceDataset?: string;
  imageUrl?: string;
  data?: unknown;
}) => apiClient.post<ResearchCreateResult>("/research", payload).then((r) => r.data);

export const fetchResearchItems = () => apiClient.get<ResearchItem[]>("/research").then((r) => r.data);

export const fetchResearchItem = (id: number) => apiClient.get<ResearchItem>(`/research/${id}`).then((r) => r.data);

export const refreshResearchBrief = (id: number) =>
  apiClient.put<ResearchItem>(`/research/${id}`, { action: "refresh" }).then((r) => r.data);

export const toggleResearchStep = (id: number, index: number) =>
  apiClient.put<ResearchItem>(`/research/${id}`, { action: "toggle_step", index }).then((r) => r.data);

export const deleteResearchItem = (id: number) => apiClient.delete(`/research/${id}`).then((r) => r.data);
