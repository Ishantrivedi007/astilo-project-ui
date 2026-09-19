import { apiClient } from "./apiClient";

export type PulseSeverity = "low" | "medium" | "high";

export interface PulseNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  section: string;
  severity: PulseSeverity;
}

export const fetchPulse = () => apiClient.get<PulseNotification[]>("/nimrose/pulse").then((r) => r.data);
