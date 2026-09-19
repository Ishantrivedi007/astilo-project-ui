import { Link } from "react-router-dom";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

import { AppRoute } from "../../../app/AppRoute";
import { usePlayer } from "../../MusicPlayer/PlayerContext";
import { DEFAULT_COVER } from "../../MusicPlayer/tracks";

const MusicWidget = () => {
  const { track, isPlaying, togglePlay, next, prev } = usePlayer();

  if (!track) {
    return (
      <div>
        <p className="nimrose-widget-empty">Nothing playing.</p>
        <Link to={AppRoute.music} className="nimrose-widget-link">
          Open Music
        </Link>
      </div>
    );
  }

  return (
    <div className="nimrose-music">
      <img src={track.cover || DEFAULT_COVER} alt="" className="nimrose-music-cover" />
      <div className="nimrose-music-info">
        <p className="nimrose-music-title">{track.name}</p>
        <p className="nimrose-music-artist">{track.artist}</p>
      </div>
      <div className="nimrose-music-controls">
        <button type="button" onClick={prev} aria-label="Previous">
          <SkipBack size={14} />
        </button>
        <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" onClick={next} aria-label="Next">
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  );
};

export default MusicWidget;
