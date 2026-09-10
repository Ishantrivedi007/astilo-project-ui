import { PageHeading, Reveal } from "../shared";
import MusicPlayer from "./MusicPlayer";
import SongLyricsCard from "./SongLyricsCard";
import PlaylistCard from "./PlaylistCard";

const MusicPlayerIndex = () => {
  return (
    <section>
      <PageHeading eyebrow="✦ your sound">
        The <span className="gradient-text">vibe</span> room
      </PageHeading>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <Reveal index={1} className="order-2 h-[520px] lg:order-1">
          <PlaylistCard />
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <MusicPlayer />
        </Reveal>
        <Reveal index={2} className="order-3 h-[520px]">
          <SongLyricsCard />
        </Reveal>
      </div>
    </section>
  );
};

export default MusicPlayerIndex;
