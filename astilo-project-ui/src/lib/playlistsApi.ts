import { apiClient } from "./apiClient";

export interface PlaylistTrack {
  id: number;
  trackId: string;
  title: string | null;
  artist: string | null;
  artworkUrl: string | null;
  position: number;
}

export interface Playlist {
  id: number;
  name: string;
  createdAt: string | null;
  tracks?: PlaylistTrack[];
}

export const fetchPlaylists = () => apiClient.get<Playlist[]>("/playlists").then((r) => r.data);

export const fetchPlaylist = (id: number) =>
  apiClient.get<Playlist>(`/playlists/${id}`).then((r) => r.data);

export const createPlaylist = (name: string) =>
  apiClient.post<Playlist>("/playlists", { name }).then((r) => r.data);

export const renamePlaylist = (id: number, name: string) =>
  apiClient.put<Playlist>(`/playlists/${id}`, { name }).then((r) => r.data);

export const deletePlaylist = (id: number) => apiClient.delete(`/playlists/${id}`).then((r) => r.data);

export interface AddTrackInput {
  trackId: string;
  title?: string;
  artist?: string;
  artworkUrl?: string;
}

export const addTrackToPlaylist = (playlistId: number, input: AddTrackInput) =>
  apiClient
    .post<PlaylistTrack>(`/playlists/${playlistId}?action=tracks`, input)
    .then((r) => r.data);

export const removeTrackFromPlaylist = (playlistId: number, trackId: number) =>
  apiClient.delete(`/playlists/${playlistId}`, { params: { track_id: trackId } }).then((r) => r.data);

// --- favorites ---

export type FavoriteMediaType = "movie" | "anime" | "track";

export interface Favorite {
  id: number;
  mediaType: FavoriteMediaType;
  mediaId: string;
  title: string | null;
  posterUrl: string | null;
  createdAt: string | null;
}

export const fetchFavorites = (mediaType?: FavoriteMediaType) =>
  apiClient
    .get<Favorite[]>("/favorites", { params: mediaType ? { media_type: mediaType } : undefined })
    .then((r) => r.data);

export interface AddFavoriteInput {
  mediaType: FavoriteMediaType;
  mediaId: string;
  title?: string;
  posterUrl?: string;
  artist?: string;
}

export const addFavorite = (input: AddFavoriteInput) =>
  apiClient.post<Favorite>("/favorites", input).then((r) => r.data);

export const removeFavorite = (id: number) => apiClient.delete(`/favorites/${id}`).then((r) => r.data);
