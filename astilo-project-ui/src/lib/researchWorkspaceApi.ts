import { apiClient } from "./apiClient";
import type { NimroseProject } from "./nimroseApi";

/** A NimroseProject that's the target of at least one research-collection
 * CosmosSavedItem — the picker in the Nimrose Workspace section only
 * lists these, not every project. */
export interface ResearchLinkedProject extends NimroseProject {
  researchItemId: number;
  researchTitle: string;
}

export const fetchResearchLinkedProjects = () =>
  apiClient.get<ResearchLinkedProject[]>("/nimrose/research-projects").then((r) => r.data);
