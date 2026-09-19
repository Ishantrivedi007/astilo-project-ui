import { apiClient } from "./apiClient";
import type { CosmosObjectType, CosmosSavedItem } from "./cosmosApi";
import type { NimroseNote, NimroseProject } from "./nimroseApi";

export interface ResearchResult {
  createdNew: boolean;
  cosmosItem: CosmosSavedItem;
  project: NimroseProject;
  note: NimroseNote | null;
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
}) => apiClient.post<ResearchResult>("/research", payload).then((r) => r.data);
