import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSongs } from "../../lib/musicApi";
import { tracks as staticTracks, secondsToLength, type Track } from "./tracks";

export const SONGS_QUERY_KEY = ["music", "songs"];

/** Merges the bundled static tracks with the user's downloaded songs from the backend. */
export const useMusicLibrary = () => {
  const queryClient = useQueryClient();
  const { data: downloaded = [], isLoading } = useQuery({
    queryKey: SONGS_QUERY_KEY,
    queryFn: fetchSongs,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const dynamicTracks: Track[] = downloaded
    .filter((song) => song.mediaType === "audio")
    .map((song) => ({
      name: song.title,
      artist: song.artist || "Unknown Artist",
      length: secondsToLength(song.durationSeconds),
      emoji: "🎧",
      audio: song.audioUrl,
      cover: song.coverUrl || undefined,
      songId: song.id,
    }));

  const tracks: Track[] = [...staticTracks, ...dynamicTracks];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY });

  return { tracks, downloaded, isLoading, invalidate };
};
