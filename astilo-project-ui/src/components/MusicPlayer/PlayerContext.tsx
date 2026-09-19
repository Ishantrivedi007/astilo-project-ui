import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMusicLibrary } from "./useMusicLibrary";
import { lengthToSeconds, secondsToLength, type Track } from "./tracks";
import type { DownloadedSong } from "../../lib/musicApi";
import {
  fetchPlaylist,
  fetchPlaylists,
  removeTrackFromPlaylist,
  type Playlist,
} from "../../lib/playlistsApi";
import { useEqualizerChain } from "./EqualizerContext";

export type QueueSource = "all" | "downloaded" | number;

const PLAYLISTS_QUERY_KEY = ["music", "playlists"];

interface PlayerContextValue {
  tracks: Track[];
  track: Track | undefined;
  activeIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  closed: boolean;
  queueSource: QueueSource;
  playlists: Playlist[];
  select: (index: number) => void;
  playSong: (song: DownloadedSong) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  close: () => void;
  setQueueSource: (source: QueueSource) => void;
  removeTrack: (track: Track, index: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** True while the user is actually looking at the "Music Player" tab under
   * /music — the mini-player hides only then, per spec ("show it everywhere
   * except the Music Player tab"), staying visible on the other music tabs
   * (Search, Lyrics, Video Library, Equalizer, Manage) and every other page. */
  onPlayerTab: boolean;
  setOnPlayerTab: (active: boolean) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const { tracks: libraryTracks, downloaded } = useMusicLibrary();
  const queryClient = useQueryClient();

  const [queueSource, setQueueSource] = useState<QueueSource>("all");
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(65);
  const [muted, setMuted] = useState(false);
  const [closed, setClosed] = useState(true);
  const [onPlayerTab, setOnPlayerTab] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEqualizerChain(audioRef, "audio");

  const { data: playlists = [] } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => fetchPlaylists("music"),
    staleTime: 30_000,
  });

  const activePlaylistId = typeof queueSource === "number" ? queueSource : null;

  const { data: activePlaylist } = useQuery({
    queryKey: ["music", "playlist", activePlaylistId],
    queryFn: () => fetchPlaylist(activePlaylistId as number),
    enabled: activePlaylistId != null,
    staleTime: 10_000,
  });

  const trackKey = (t: Track) => (t.songId != null ? `song-${t.songId}` : `name-${t.name}`);

  const removeFromPlaylistMutation = useMutation({
    mutationFn: (playlistTrackId: number) =>
      removeTrackFromPlaylist(activePlaylistId as number, playlistTrackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["music", "playlist", activePlaylistId] });
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      toast.success("Removed from playlist");
    },
    onError: () => toast.error("Couldn't remove that track."),
  });

  const tracks = useMemo<Track[]>(() => {
    if (activePlaylistId != null) {
      const songById = new Map(downloaded.map((s) => [String(s.id), s]));
      return (activePlaylist?.tracks ?? []).map((pt) => {
        const song = songById.get(pt.trackId);
        return {
          name: pt.title || song?.title || "Unknown title",
          artist: pt.artist || song?.artist || "Unknown Artist",
          length: song ? secondsToLength(song.durationSeconds) : "--:--",
          emoji: "🎵",
          audio: song?.audioUrl,
          cover: pt.artworkUrl || song?.coverUrl || undefined,
          lyrics: song?.lyrics || undefined,
          syncedLyrics: song?.syncedLyrics || undefined,
          songId: song?.id,
          playlistTrackId: pt.id,
        } as Track;
      });
    }
    const base =
      queueSource === "downloaded"
        ? libraryTracks.filter((t) => t.songId != null)
        : libraryTracks;
    return base.filter((t) => !hiddenKeys.has(trackKey(t)));
  }, [activePlaylistId, activePlaylist, downloaded, libraryTracks, queueSource, hiddenKeys]);

  const track = tracks[Math.min(activeIndex, Math.max(tracks.length - 1, 0))];
  const isAvailable = Boolean(track?.audio);

  useEffect(() => {
    setActiveIndex(0);
  }, [queueSource]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [activeIndex]);

  // Real playback for available songs.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, [isPlaying, track]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = muted ? 0 : volume / 100;
  }, [volume, muted]);

  // Seed the timeline for songs without an audio file, and simulate progress.
  useEffect(() => {
    if (!track) return;
    if (!isAvailable) setDuration(lengthToSeconds(track.length));
  }, [isAvailable, track]);

  useEffect(() => {
    if (isAvailable || !isPlaying) return;
    const id = window.setInterval(() => {
      setCurrentTime((t) => (t >= duration ? 0 : t + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isAvailable, isPlaying, duration]);

  const select = (index: number) => {
    setActiveIndex(index);
    setClosed(false);
    setIsPlaying(true);
  };

  const playSong = (song: DownloadedSong) => {
    const idx = tracks.findIndex((t) => t.audio === song.audioUrl);
    if (idx >= 0) select(idx);
  };

  const togglePlay = () => {
    if (!track) return;
    setClosed(false);
    setIsPlaying((p) => !p);
  };

  const next = () => {
    if (!tracks.length) return;
    select((activeIndex + 1) % tracks.length);
  };

  const prev = () => {
    if (!tracks.length) return;
    select((activeIndex - 1 + tracks.length) % tracks.length);
  };

  const seek = (time: number) => {
    setCurrentTime(time);
    if (isAvailable && audioRef.current) audioRef.current.currentTime = time;
  };

  const close = () => {
    setIsPlaying(false);
    setClosed(true);
  };

  const removeTrack = (t: Track, index: number) => {
    if (activePlaylistId != null && t.playlistTrackId != null) {
      removeFromPlaylistMutation.mutate(t.playlistTrackId);
      return;
    }
    setHiddenKeys((prev) => new Set(prev).add(trackKey(t)));
    if (index === activeIndex) setActiveIndex(0);
    else if (index < activeIndex) setActiveIndex((i) => i - 1);
  };

  const value: PlayerContextValue = {
    tracks,
    track,
    activeIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    closed,
    queueSource,
    playlists,
    select,
    playSong,
    togglePlay,
    setPlaying: setIsPlaying,
    next,
    prev,
    seek,
    setVolume: setVolumeState,
    setMuted,
    close,
    setQueueSource,
    removeTrack,
    audioRef,
    onPlayerTab,
    setOnPlayerTab,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {track?.audio && (
        <audio
          ref={audioRef}
          src={track.audio}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={next}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
};
