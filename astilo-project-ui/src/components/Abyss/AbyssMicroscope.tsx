import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchMicroscopeSamples, fetchMicroscopeSpecimens } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const AbyssMicroscope = () => {
  const navigate = useNavigate();
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [magnification, setMagnification] = useState(100);

  const { data: catalog } = useQuery({
    queryKey: ["abyss", "microscope", "samples"],
    queryFn: () => fetchMicroscopeSamples(),
    staleTime: Infinity,
  });

  const { data: specimensEnv, isLoading, isError } = useQuery({
    queryKey: ["abyss", "microscope", "specimens", sampleId],
    queryFn: () => fetchMicroscopeSpecimens(sampleId!),
    enabled: Boolean(sampleId),
    retry: false,
  });

  const zoom = magnification / 10; // 10x maps to 1.0 scale baseline

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Virtual Microscope</p>
        <h1 className="abyss-title">Examine a sample.</h1>
        <p className="abyss-tagline">
          Real, openly licensed reference images — not stock photos or random search results.
          Magnification here is a simulated zoom of the reference image, not a live optical
          capture at that power.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex flex-wrap gap-2 mt-6 mb-4">
          {catalog?.data.samples.map((s) => (
            <button
              key={s.id}
              type="button"
              className="abyss-source-badge"
              style={sampleId === s.id ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
              onClick={() => setSampleId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Reveal>

      {sampleId && (
        <Reveal>
          <div className="abyss-descent-controls" style={{ margin: "0 0 1.5rem" }}>
            <span className="abyss-unavailable">Magnification</span>
            {(catalog?.data.magnifications ?? [10, 40, 100, 400, 1000]).map((m) => (
              <button
                key={m}
                type="button"
                className="abyss-source-badge"
                style={magnification === m ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
                onClick={() => setMagnification(m)}
              >
                {m}×
              </button>
            ))}
          </div>
        </Reveal>
      )}

      {!sampleId && <p className="abyss-unavailable">Choose a sample type to begin.</p>}
      {isLoading && <p className="abyss-unavailable">Loading specimens…</p>}
      {isError && <p className="abyss-unavailable">Specimens unavailable — backend may be offline.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {specimensEnv?.data.specimens.map((sp) => (
          <Reveal key={sp.id}>
            <div className="abyss-card" style={{ overflow: "hidden", padding: 0 }}>
              <div style={{ overflow: "hidden", height: 220, background: "#020b10" }}>
                <img
                  src={sp.imageUrl}
                  alt={sp.commonName}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${zoom})`,
                    transition: "transform 0.3s ease",
                  }}
                />
              </div>
              <div style={{ padding: "0.9rem 1.1rem" }}>
                <p className="font-bold italic">{sp.commonName}</p>
                <p className="text-xs text-white/50 mb-2">{sp.imageType}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <AbyssSourceBadge source={sp.credit} />
                  <AbyssConfidenceBadge confidence="OBSERVED" />
                  <span className="abyss-unavailable">{sp.license}</span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export default AbyssMicroscope;
