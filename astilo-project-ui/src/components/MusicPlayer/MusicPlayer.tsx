import { useEffect, useState } from "react";
import { Slider, Button } from "@heroui/react";
import { toast } from "sonner";
import "./MusicPlayer.scss";

const COVER = "/nextuiplayer.jpeg";

const sliderClassNames = {
  base: "w-full",
  filler: "bg-gradient-to-r from-accent to-accent-2",
  track: "bg-ink/15 border-x-transparent",
  thumb: [
    "bg-ink shadow-glow",
    "data-[dragging=true]:scale-125",
  ],
};

const toNumber = (value: number | number[]): number =>
  Array.isArray(value) ? value[0] : value;

const formatTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const TOTAL = 216;

const MusicPlayer = () => {
  const [currentTime, setCurrentTime] = useState(72);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(65);
  const [liked, setLiked] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setCurrentTime((t) => (t >= TOTAL ? 0 : t + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  return (
    <div className="glass-card h-full w-full p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-full bg-ink/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink/70">
          Now vibing
        </span>
        <div className="eq" data-paused={!isPlaying}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="relative animate-float">
          <span
            className="album-glow"
            data-playing={isPlaying}
            aria-hidden
          />
          <img
            src={COVER}
            alt="Copines — Aya Nakamura"
            className={`relative h-52 w-52 rounded-3xl object-cover shadow-xl ring-2 ring-ink/20 transition-transform ${
              isPlaying ? "scale-100" : "scale-95"
            }`}
          />
        </div>

        <div className="text-center">
          <h3 className="font-display text-2xl font-extrabold gradient-text">
            Copines
          </h3>
          <p className="text-sm text-ink/60">Aya Nakamura</p>
        </div>

        <div className="w-full">
          <Slider
            aria-label="Progress"
            classNames={sliderClassNames}
            value={currentTime}
            maxValue={TOTAL}
            onChange={(v) => setCurrentTime(toNumber(v))}
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-ink/50">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(TOTAL - currentTime)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            radius="full"
            variant="light"
            className={`text-lg ${shuffle ? "text-accent-2" : "text-ink/50"}`}
            onPress={() => setShuffle((s) => !s)}
            aria-label="Shuffle"
          >
            🔀
          </Button>
          <Button
            isIconOnly
            radius="full"
            variant="light"
            className="text-xl text-ink/70"
            aria-label="Previous"
          >
            ⏮️
          </Button>
          <Button
            isIconOnly
            radius="full"
            size="lg"
            className="h-16 w-16 animate-pulse-glow bg-gradient-to-br from-accent to-accent-2 text-2xl text-[#17131f] shadow-glow"
            onPress={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </Button>
          <Button
            isIconOnly
            radius="full"
            variant="light"
            className="text-xl text-ink/70"
            aria-label="Next"
          >
            ⏭️
          </Button>
          <Button
            isIconOnly
            radius="full"
            variant="light"
            className={`text-lg transition-transform hover:scale-125 ${
              liked ? "text-accent animate-wiggle" : "text-ink/50"
            }`}
            onPress={() => {
              setLiked((l) => !l);
              toast(liked ? "Removed from liked songs" : "Added to liked songs 💖");
            }}
            aria-label="Like"
          >
            {liked ? "💖" : "🤍"}
          </Button>
        </div>

        <div className="flex w-full items-center gap-3">
          <span className="text-sm">🔈</span>
          <Slider
            aria-label="Volume"
            size="sm"
            classNames={sliderClassNames}
            value={volume}
            onChange={(v) => setVolume(toNumber(v))}
          />
          <span className="text-sm">🔊</span>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
