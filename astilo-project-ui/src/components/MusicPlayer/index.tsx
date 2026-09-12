import { useEffect, useState } from "react";
import { PageHeading, Reveal } from "../shared";
import MusicPlayer from "./MusicPlayer";
import SongLyricsCard from "./SongLyricsCard";
import PlaylistCard from "./PlaylistCard";
import { tracks } from "./tracks";

const MusicPlayerIndex = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const track = tracks[activeIndex];

  // Playback state is lifted here so the lyrics card can follow the timeline.
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [activeIndex]);

  return (
    <section>
      <PageHeading eyebrow="✦ your sound">
        The <span className="gradient-text">vibe</span> room
      </PageHeading>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
        <Reveal index={1} className="order-2 h-[520px] lg:order-1">
          <PlaylistCard active={activeIndex} onSelect={setActiveIndex} />
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
    </section>
  );
};

export default MusicPlayerIndex;
