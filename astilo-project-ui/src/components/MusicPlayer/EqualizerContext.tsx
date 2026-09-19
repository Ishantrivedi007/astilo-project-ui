import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export const EQ_BANDS = [60, 170, 350, 1000, 3500, 10000] as const;

export type EqualizerDomain = "audio" | "video";

export interface DomainEqSettings {
  enabled: boolean;
  preset: string;
  bands: number[]; // dB, parallel to EQ_BANDS, range -12..12
  bassBoost: number; // dB, 0..12
  surround: number; // 0..1 stereo-widening amount
}

export interface EqualizerSettings {
  audio: DomainEqSettings;
  video: DomainEqSettings;
}

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0],
  "Bass Boost": [8, 6, 3, 0, 0, 0],
  Vocal: [-2, -1, 2, 5, 3, 0],
  "Treble Boost": [0, 0, 0, 2, 6, 9],
  Rock: [5, 3, -2, -1, 3, 5],
  Cinema: [3, 2, 0, 2, 4, 3],
};

const defaultDomain = (): DomainEqSettings => ({
  enabled: false,
  preset: "Flat",
  bands: [...EQ_PRESETS.Flat],
  bassBoost: 0,
  surround: 0,
});

const STORAGE_KEY = "astilo:equalizer";

const loadSettings = (): EqualizerSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw);
    return {
      audio: { ...defaultDomain(), ...parsed.audio },
      video: { ...defaultDomain(), ...parsed.video },
    };
  } catch {
    return { audio: defaultDomain(), video: defaultDomain() };
  }
};

interface EqualizerContextValue {
  settings: EqualizerSettings;
  setEnabled: (domain: EqualizerDomain, enabled: boolean) => void;
  setBand: (domain: EqualizerDomain, index: number, value: number) => void;
  setPreset: (domain: EqualizerDomain, preset: string) => void;
  setBassBoost: (domain: EqualizerDomain, value: number) => void;
  setSurround: (domain: EqualizerDomain, value: number) => void;
  reset: (domain: EqualizerDomain) => void;
}

const EqualizerContext = createContext<EqualizerContextValue | null>(null);

export const EqualizerProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<EqualizerSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const patchDomain = useCallback(
    (domain: EqualizerDomain, patch: Partial<DomainEqSettings>) => {
      setSettings((prev) => ({ ...prev, [domain]: { ...prev[domain], ...patch } }));
    },
    []
  );

  const value = useMemo<EqualizerContextValue>(
    () => ({
      settings,
      setEnabled: (domain, enabled) => patchDomain(domain, { enabled }),
      setBand: (domain, index, val) =>
        setSettings((prev) => {
          const bands = [...prev[domain].bands];
          bands[index] = val;
          return { ...prev, [domain]: { ...prev[domain], bands, preset: "Custom" } };
        }),
      setPreset: (domain, preset) =>
        patchDomain(domain, {
          preset,
          bands: EQ_PRESETS[preset] ? [...EQ_PRESETS[preset]] : settings[domain].bands,
        }),
      setBassBoost: (domain, value) => patchDomain(domain, { bassBoost: value }),
      setSurround: (domain, value) => patchDomain(domain, { surround: value }),
      reset: (domain) => patchDomain(domain, defaultDomain()),
    }),
    [settings, patchDomain]
  );

  return <EqualizerContext.Provider value={value}>{children}</EqualizerContext.Provider>;
};

export const useEqualizer = () => {
  const ctx = useContext(EqualizerContext);
  if (!ctx) throw new Error("useEqualizer must be used within an EqualizerProvider");
  return ctx;
};

/** Media elements we've already wired into the Web Audio graph — a source
 * node can only ever be created once per <audio>/<video> element. */
const attachedElements = new WeakSet<HTMLMediaElement>();

interface EqGraph {
  ctx: AudioContext;
  bass: BiquadFilterNode;
  bands: BiquadFilterNode[];
  splitter: ChannelSplitterNode;
  delayL: DelayNode;
  delayR: DelayNode;
}

/** Wires a live Web Audio processing chain (EQ bands + bass shelf + a Haas-effect
 * stereo widener standing in for "surround") onto a media element we control,
 * and keeps it live-updated from the given domain's settings. No-ops safely
 * when Web Audio is unavailable or the element is already wired elsewhere. */
export function useEqualizerChain(
  mediaRef: RefObject<HTMLMediaElement | null>,
  domain: EqualizerDomain
) {
  const { settings } = useEqualizer();
  const domainSettings = settings[domain];
  const graphRef = useRef<EqGraph | null>(null);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || graphRef.current || attachedElements.has(el)) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx: AudioContext = new AudioCtx();
      const source = ctx.createMediaElementSource(el);

      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 120;
      bass.gain.value = 0;

      const bands = EQ_BANDS.map((freq) => {
        const f = ctx.createBiquadFilter();
        f.type = "peaking";
        f.frequency.value = freq;
        f.Q.value = 1;
        f.gain.value = 0;
        return f;
      });

      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const delayL = ctx.createDelay(0.05);
      const delayR = ctx.createDelay(0.05);

      let node: AudioNode = source;
      node.connect(bass);
      node = bass;
      bands.forEach((f) => {
        node.connect(f);
        node = f;
      });
      node.connect(splitter);
      splitter.connect(delayL, 0);
      splitter.connect(delayR, 1);
      delayL.connect(merger, 0, 0);
      delayR.connect(merger, 0, 1);
      merger.connect(ctx.destination);

      attachedElements.add(el);
      graphRef.current = { ctx, bass, bands, splitter, delayL, delayR };

      const resume = () => ctx.state === "suspended" && ctx.resume();
      el.addEventListener("play", resume);
      return () => el.removeEventListener("play", resume);
    } catch {
      // Element already has a MediaElementSource, or Web Audio threw — the
      // element still plays fine natively, it just skips DSP.
    }
  }, [mediaRef]);

  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    if (!domainSettings.enabled) {
      g.bands.forEach((f) => (f.gain.value = 0));
      g.bass.gain.value = 0;
      g.delayL.delayTime.value = 0;
      g.delayR.delayTime.value = 0;
      return;
    }
    g.bands.forEach((f, i) => (f.gain.value = domainSettings.bands[i] ?? 0));
    g.bass.gain.value = domainSettings.bassBoost;
    g.delayL.delayTime.value = 0;
    g.delayR.delayTime.value = domainSettings.surround * 0.03;
  }, [domainSettings]);
}
