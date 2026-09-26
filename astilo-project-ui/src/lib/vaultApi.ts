import { apiClient } from "./apiClient";

export interface VaultItem {
  id: number;
  title: string;
  itemType: string;
  content: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  sourceModule: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  relatedIds: number[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SaveToVaultInput {
  title: string;
  itemType?: string;
  content?: string;
  url?: string;
  thumbnailUrl?: string;
  sourceModule?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export const fetchVaultItems = (params?: { itemType?: string; tag?: string; sourceModule?: string; q?: string }) =>
  apiClient
    .get<VaultItem[]>("/vault", {
      params: {
        item_type: params?.itemType,
        tag: params?.tag,
        source_module: params?.sourceModule,
        q: params?.q,
      },
    })
    .then((r) => r.data);

export const fetchVaultItem = (id: number | string) => apiClient.get<VaultItem>("/vault", { params: { item_id: id } }).then((r) => r.data);

export const saveToVault = (input: SaveToVaultInput) => apiClient.post<VaultItem>("/vault", input).then((r) => r.data);

export const updateVaultItem = (id: number | string, patch: Partial<SaveToVaultInput>) =>
  apiClient.put<VaultItem>(`/vault/${id}`, patch).then((r) => r.data);

export const deleteVaultItem = (id: number | string) => apiClient.delete(`/vault/${id}`).then((r) => r.data);
