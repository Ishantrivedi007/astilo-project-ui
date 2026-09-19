import type { CSSProperties } from "react";
import {
  EQ_BANDS,
  EQ_PRESETS,
  useEqualizer,
  type EqualizerDomain,
} from "./EqualizerContext";

const bandLabel = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

const DOMAINS: { id: EqualizerDomain; title: string; blurb: string }[] = [
  {
    id: "audio",
    title: "🎵 Music",
    blurb: "Applies to every song played from this app's Music Player, app-wide.",
  },
  {
    id: "video",
    title: "🎬 Video Library",
    blurb: "Applies to your downloaded videos in the Video Library tab.",
  },
];

const DomainPanel = ({ id, title, blurb }: (typeof DOMAINS)[number]) => {
  const { settings, setEnabled, setBand, setPreset, setBassBoost, setSurround, reset } =
    useEqualizer();
  const s = settings[id];

  return (
    <div className="neon-card p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
          <p className="mt-1 text-xs text-ink/50">{blurb}</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(id, !s.enabled)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            s.enabled
              ? "bg-gradient-to-r from-accent to-accent-2 text-app"
              : "bg-ink/10 text-ink/60 hover:bg-ink/15"
          }`}
        >
          {s.enabled ? "On" : "Off"}
        </button>
      </div>

      <div className={`space-y-5 transition-opacity ${s.enabled ? "" : "pointer-events-none opacity-40"}`}>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(EQ_PRESETS).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(id, p)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                s.preset === p
                  ? "bg-ink text-app"
                  : "bg-ink/10 text-ink/60 hover:bg-ink/15"
              }`}
            >
              {p}
            </button>
          ))}
          {s.preset === "Custom" && (
            <span className="rounded-full bg-accent-2/15 px-3 py-1 text-[11px] font-bold text-accent-2">
              Custom
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-2 rounded-2xl bg-ink/5 p-4">
          {EQ_BANDS.map((hz, i) => (
            <div key={hz} className="flex flex-col items-center gap-2">
              <span className="font-mono text-[10px] text-ink/40">
                {s.bands[i] > 0 ? `+${s.bands[i]}` : s.bands[i]}
              </span>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={s.bands[i] ?? 0}
                onChange={(e) => setBand(id, i, Number(e.target.value))}
                className="eq-band-slider"
                aria-label={`${bandLabel(hz)}Hz`}
              />
              <span className="font-mono text-[10px] text-ink/40">{bandLabel(hz)}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 flex justify-between text-[11px] font-bold uppercase tracking-wide text-ink/50">
              <span>Bass boost</span>
              <span className="font-mono normal-case text-ink/60">+{s.bassBoost}dB</span>
            </span>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={s.bassBoost}
              onChange={(e) => setBassBoost(id, Number(e.target.value))}
              className="vol-range w-full"
              style={{ "--fill": `${(s.bassBoost / 12) * 100}%` } as CSSProperties}
            />
          </label>
          <label className="block">
            <span className="mb-1 flex justify-between text-[11px] font-bold uppercase tracking-wide text-ink/50">
              <span>Surround / widen</span>
              <span className="font-mono normal-case text-ink/60">
                {Math.round(s.surround * 100)}%
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(s.surround * 100)}
              onChange={(e) => setSurround(id, Number(e.target.value) / 100)}
              className="vol-range w-full"
              style={{ "--fill": `${s.surround * 100}%` } as CSSProperties}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => reset(id)}
          className="text-xs font-semibold text-ink/50 hover:text-ink/80"
        >
          Reset to flat
        </button>
      </div>
    </div>
  );
};

const EqualizerTab = () => {
  return (
    <div className="space-y-6">
      <div className="neon-card p-6">
        <h3 className="font-display text-lg font-extrabold text-ink">Sound Equalizer</h3>
        <p className="mt-1 text-sm text-ink/60">
          Shape the sound with a 6-band EQ, bass boost, and a stereo-widening surround
          effect — separately for music and your downloaded video library. Turn either
          off any time to go back to the raw source. These settings are saved on this
          device.
        </p>
        <p className="mt-2 text-xs text-ink/40">
          Note: Movies &amp; Anime stream through an embedded third-party player, which
          browsers can't apply audio effects to — the equalizer only reaches audio this
          app plays directly (Music and Video Library).
        </p>
      </div>

      {DOMAINS.map((d) => (
        <DomainPanel key={d.id} {...d} />
      ))}
    </div>
  );
};

export default EqualizerTab;
