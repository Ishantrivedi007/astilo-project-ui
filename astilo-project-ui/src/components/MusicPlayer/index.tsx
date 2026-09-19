import { useEffect, useState } from "react";
import { PageHeading, Reveal } from "../shared";
import MusicPlayer from "./MusicPlayer";
import SongLyricsCard from "./SongLyricsCard";
import PlaylistCard from "./PlaylistCard";
import MusicTabs, { type MusicTabId } from "./MusicTabs";
import SongSearchTab from "./SongSearchTab";
import LyricsSearchTab from "./LyricsSearchTab";
import ManageTab from "./ManageTab";
import VideoLibraryTab from "./VideoLibraryTab";
import EqualizerTab from "./EqualizerTab";
import { usePlayer } from "./PlayerContext";

const MusicPlayerIndex = () => {
  const [tab, setTab] = useState<MusicTabId>("player");
  const {
    tracks,
    activeIndex,
    select,
    removeTrack,
    queueSource,
    setQueueSource,
    playlists,
    track,
    currentTime,
    isPlaying,
    playSong,
    setOnPlayerTab,
  } = usePlayer();

  // Tell the mini-player whether we're currently looking at the full Music
  // Player tab — it should hide only then, not on the other music tabs.
  useEffect(() => {
    setOnPlayerTab(tab === "player");
    return () => setOnPlayerTab(false);
  }, [tab, setOnPlayerTab]);

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
              onSelect={select}
              onRemove={removeTrack}
              source={queueSource}
              onSourceChange={setQueueSource}
              playlists={playlists}
            />
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <MusicPlayer />
          </Reveal>
          <Reveal index={2} className="order-3 h-[520px]">
            {track ? (
              <SongLyricsCard
                track={track}
                currentTime={currentTime}
                isPlaying={isPlaying}
              />
            ) : (
              <div className="neon-card flex h-full w-full items-center justify-center p-6 text-sm text-ink/50">
                No lyrics to show.
              </div>
            )}
          </Reveal>
        </div>
      )}

      {tab === "search" && (
        <Reveal>
          <SongSearchTab
            onPlay={(song) => {
              playSong(song);
              setTab("player");
            }}
          />
        </Reveal>
      )}

      {tab === "lyrics" && (
        <Reveal>
          <LyricsSearchTab />
        </Reveal>
      )}

      {tab === "video" && (
        <Reveal>
          <VideoLibraryTab />
        </Reveal>
      )}

      {tab === "equalizer" && (
        <Reveal>
          <EqualizerTab />
        </Reveal>
      )}

      {tab === "manage" && (
        <Reveal>
          <ManageTab />
        </Reveal>
      )}
    </section>
  );
};

export default MusicPlayerIndex;
