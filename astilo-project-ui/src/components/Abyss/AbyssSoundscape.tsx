import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, ScanLine } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { classifySound, fetchSoundCatalog, soundProxyUrl, type BioacousticResult, type SoundClip } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

/** Draws a real-time spectrogram (frequency over time) from whatever is
 * currently playing in `audioEl`, using an actual FFT of the real audio
 * samples — no synthesized or placeholder visualization. */
const useSpectrogram = (audioEl: HTMLAudioElement | null, canvas: HTMLCanvasElement | null) => {
  useEffect(() => {
    if (!audioEl || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(audioEl);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const bins = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    let x = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (audioEl.paused) return;
      analyser.getByteFrequencyData(bins);

      if (x >= canvas.width) {
        const img = ctx.getImageData(1, 0, canvas.width - 1, canvas.height);
        ctx.putImageData(img, 0, 0);
        x = canvas.width - 1;
      }

      for (let i = 0; i < bins.length; i++) {
        const v = bins[i];
        const y = canvas.height - Math.floor((i / bins.length) * canvas.height);
        const hue = 180 - (v / 255) * 180; // teal (quiet) -> yellow/red (loud)
        ctx.fillStyle = `hsl(${hue}, 90%, ${20 + (v / 255) * 40}%)`;
        ctx.fillRect(x, y, 1, 2);
      }
      x += 1;
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
      audioCtx.close();
    };
  }, [audioEl, canvas]);
};

const AbyssSoundscape = () => {
  const navigate = useNavigate();
  const [activeClip, setActiveClip] = useState<SoundClip | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  useSpectrogram(audioEl, canvasEl);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["abyss", "sounds"],
    queryFn: () => fetchSoundCatalog(),
    staleTime: Infinity,
    retry: false,
  });

  // Register the <audio>/<canvas> DOM nodes with useSpectrogram once, on
  // mount — they're stable refs, so this only needs to run a single time
  // regardless of which clip is later selected.
  useEffect(() => {
    setAudioEl(audioRef.current);
    setCanvasEl(canvasRef.current);
  }, []);

  // Switching clips changes the <audio> src via React's render; play()
  // here runs post-commit so it still counts as part of the user's click.
  useEffect(() => {
    if (!activeClip || !audioRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.fillStyle = "#020b10";
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    audioRef.current.load();
    audioRef.current.play().catch(() => {});
  }, [activeClip]);

  const [classification, setClassification] = useState<BioacousticResult | null>(null);

  const play = (clip: SoundClip) => {
    setActiveClip(clip);
    setClassification(null);
  };

  const classifyMutation = useMutation({
    mutationFn: () => classifySound(activeClip!.id),
    onSuccess: (res) => setClassification(res.data),
  });

  const groups = (data?.data.clips ?? []).reduce<Record<string, SoundClip[]>>((acc, clip) => {
    (acc[clip.category] ??= []).push(clip);
    return acc;
  }, {});

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Ocean Soundscape</p>
        <h1 className="abyss-title">Listen to the ocean.</h1>
        <p className="abyss-tagline">
          Real marine-mammal recordings from NOAA Fisheries, with a live spectrogram built from an
          actual FFT of the playing audio — not a stylized animation.
        </p>
      </Reveal>

      <Reveal>
        <div className="abyss-card mt-6" style={{ padding: "0.75rem" }}>
          <canvas ref={canvasRef} width={640} height={200} style={{ width: "100%", height: 200, borderRadius: "0.75rem", background: "#020b10" }} />
          <audio ref={audioRef} src={activeClip ? soundProxyUrl(activeClip.id) : undefined} controls crossOrigin="anonymous" className="w-full mt-2" />
          {activeClip && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <AbyssSourceBadge source="NOAA Fisheries" />
              <AbyssConfidenceBadge confidence="OBSERVED" />
              <span className="text-sm text-white/70">{activeClip.commonName}</span>
              <button
                type="button"
                className="abyss-source-badge"
                onClick={() => classifyMutation.mutate()}
                disabled={classifyMutation.isPending}
              >
                <ScanLine size={11} /> {classifyMutation.isPending ? "Classifying…" : "Classify with local AI"}
              </button>
            </div>
          )}
          {!activeClip && <p className="abyss-unavailable mt-2">Pick a sound below to play it and see its spectrogram.</p>}

          {classification && (
            <div className="abyss-card mt-3" style={{ padding: "0.9rem 1rem" }}>
              <div className="flex items-center gap-2 mb-2">
                <AbyssSourceBadge source="Astilo (local YAMNet model)" />
                <AbyssConfidenceBadge confidence="AI_INFERRED" />
              </div>
              <p className="text-xs uppercase tracking-wide text-white/40 mb-2">Possible classification — not a confirmed species ID</p>
              <div className="flex flex-col gap-1">
                {classification.classes.map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{c.label}</span>
                    <span className="text-white/50">{c.scorePercent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {isLoading && <p className="abyss-unavailable mt-4">Loading sound catalog…</p>}
      {isError && <p className="abyss-unavailable mt-4">Catalog unavailable — backend may be offline.</p>}

      {Object.entries(groups).map(([category, clips]) => (
        <div key={category}>
          <h2 className="abyss-section-title">{category}s</h2>
          <div className="abyss-nav-grid">
            {clips.map((clip) => (
              <Reveal key={clip.id}>
                <button type="button" className="abyss-nav-tile" onClick={() => play(clip)}>
                  <Play size={18} strokeWidth={2} />
                  <span>{clip.commonName}</span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AbyssSoundscape;
