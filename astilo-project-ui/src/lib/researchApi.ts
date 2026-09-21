import { apiClient } from "./apiClient";
import type { CosmosObjectType } from "./cosmosApi";
import type { NimroseProject } from "./nimroseApi";

export interface ResearchNextStep {
  text: string;
  done: boolean;
}

export interface RelatedArticle {
  title: string;
  description: string | null;
  pageUrl: string | null;
}

export interface ResearchBrief {
  summary: string | null;
  detailedSummary: string | null;
  wikiTitle: string | null;
  wikiUrl: string | null;
  thumbnailUrl: string | null;
  topics: string[];
  relatedArticles: RelatedArticle[];
  keyPoints: string[];
  nextSteps: ResearchNextStep[];
  dataSnapshot: Record<string, unknown>;
  skyImageUrl: string | null;
  raDeg: number | null;
  decDeg: number | null;
  generatedAt: string;
}

export interface ResearchImage {
  url: string;
  caption: string | null;
  source: string | null;
  addedAt: string;
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
  images: ResearchImage[];
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

export const renameResearchItem = (id: number, title: string) =>
  apiClient.put<ResearchItem>(`/research/${id}`, { action: "rename", title }).then((r) => r.data);

export const toggleResearchStep = (id: number, index: number) =>
  apiClient.put<ResearchItem>(`/research/${id}`, { action: "toggle_step", index }).then((r) => r.data);

export const addResearchStep = (id: number, text: string) =>
  apiClient.put<ResearchItem>(`/research/${id}`, { action: "add_step", text }).then((r) => r.data);

export const updateResearchStep = (id: number, index: number, text: string) =>
  apiClient.put<ResearchItem>(`/research/${id}`, { action: "update_step", index, text }).then((r) => r.data);

export const removeResearchStep = (id: number, index: number) =>
  apiClient.put<ResearchItem>(`/research/${id}`, { action: "remove_step", index }).then((r) => r.data);

export interface AutoResearchResult extends ResearchItem {
  autoResearchNoteId: number;
}

export const autoResearchStep = (id: number, index: number) =>
  apiClient.put<AutoResearchResult>(`/research/${id}`, { action: "auto_research_step", index }).then((r) => r.data);

export const deleteResearchItem = (id: number) => apiClient.delete(`/research/${id}`).then((r) => r.data);

export interface GenerateReportResult extends ResearchItem {
  reportNoteId: number;
}

export const generateResearchReport = (id: number) =>
  apiClient.put<GenerateReportResult>(`/research/${id}`, { action: "generate_report" }).then((r) => r.data);

export const addResearchImage = (id: number, image: { url: string; caption?: string; source?: string }) =>
  apiClient.put<ResearchItem>(`/research/${id}`, { action: "add_image", ...image }).then((r) => r.data);

export const removeResearchImage = (id: number, index: number) =>
  apiClient.put<ResearchItem>(`/research/${id}`, { action: "remove_image", index }).then((r) => r.data);
