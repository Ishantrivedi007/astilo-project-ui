import { useEffect, useState } from "react";
import { PageHeading, Reveal } from "../shared";
import MusicPlayer from "./MusicPlayer";
import SongLyricsCard from "./SongLyricsCard";
import PlaylistCard from "./PlaylistCard";
import MusicTabs, { type MusicTabId } from "./MusicTabs";
import SongSearchTab from "./SongSearchTab";
import LyricsSearchTab from "./LyricsSearchTab";
import { useMusicLibrary } from "./useMusicLibrary";
import type { DownloadedSong } from "../../lib/musicApi";

const MusicPlayerIndex = () => {
  const [tab, setTab] = useState<MusicTabId>("player");
  const { tracks } = useMusicLibrary();
  const [activeIndex, setActiveIndex] = useState(0);
  const track = tracks[Math.min(activeIndex, tracks.length - 1)];

  // Playback state is lifted here so the lyrics card can follow the timeline.
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [activeIndex]);

  const playSong = (song: DownloadedSong) => {
    const idx = tracks.findIndex((t) => t.audio === song.audioUrl);
    if (idx >= 0) setActiveIndex(idx);
    setTab("player");
  };

  return (
    <section>
      <PageHeading eyebrow="✦ your sound">
        The <span className="gradient-text">vibe</span> room
      </PageHeading>

      <MusicTabs active={tab} onChange={setTab} />

      {tab === "player" && (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
          <Reveal index={1} className="order-2 h-[520px] lg:order-1">
            <PlaylistCard
              tracks={tracks}
              active={activeIndex}
              onSelect={setActiveIndex}
            />
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <MusicPlayer
              track={track}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onPlayingChange={setIsPlaying}
              onTimeChange={setCurrentTime}
              onDurationChange={setDuration}
            />
          </Reveal>
          <Reveal index={2} className="order-3 h-[520px]">
            <SongLyricsCard
              track={track}
              currentTime={currentTime}
              isPlaying={isPlaying}
            />
          </Reveal>
        </div>
      )}

      {tab === "search" && (
        <Reveal>
          <SongSearchTab onPlay={playSong} />
        </Reveal>
      )}

      {tab === "lyrics" && (
        <Reveal>
          <LyricsSearchTab />
        </Reveal>
      )}
    </section>
  );
};

export default MusicPlayerIndex;
