import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import { GradientButton } from "../shared";
import { fetchLyrics } from "../../lib/lyrics";
import "./MusicPlayer.scss";

const ARTIST = "Aya Nakamura";
const TITLE = "Copines";

const FALLBACK_LYRICS = `Des menottes aux poignets, en bas de chez toi
Tu la connais, elle t'appelle "mon roi"
Copines, copines, copines de la miff
Copines, copines, elles m'ont bien capté

Toi t'es un vrai type sûr, un peu comme moi
Elle sait qu'elle t'aura pas, mais elle y croit
J'suis dans le carré VIP avec mes copines
On fait le show, on fait le show toute la night`;

const SongLyricsCard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["lyrics", ARTIST, TITLE],
    queryFn: () => fetchLyrics(ARTIST, TITLE, FALLBACK_LYRICS),
    staleTime: Infinity,
  });

  return (
    <div className="glass-card flex h-full flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-extrabold text-ink">
          Lyrics 🎤
        </h3>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] uppercase tracking-widest text-ink/50">
          {TITLE}
        </span>
      </div>

      <div className="lyrics-scroll flex-1 overflow-y-auto whitespace-pre-line py-4 text-center text-sm leading-7 text-ink/80 hide-scrollbar">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner color="secondary" label="finding the words…" />
          </div>
        ) : (
          data
        )}
      </div>

      <GradientButton fullWidth size="sm" className="mt-3 shrink-0">
        Sing along ✨
      </GradientButton>
    </div>
  );
};

export default SongLyricsCard;
