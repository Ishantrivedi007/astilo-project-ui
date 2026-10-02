import { useNavigate } from "react-router-dom";
import { ArrowLeft, Dna, Microscope, Puzzle, TestTube2, Volume2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import "./Abyss.scss";

const MODULES = [
  { label: "Virtual Microscope", description: "Real, licensed reference images of plankton, diatoms and more.", icon: Microscope, href: AppRoute.abyssMicroscope },
  { label: "eDNA Detective", description: "A simulated collect-to-identify sequencing workflow.", icon: Dna, href: AppRoute.abyssEdnaLab },
  { label: "Ocean Soundscape", description: "Real NOAA recordings with a live spectrogram.", icon: Volume2, href: AppRoute.abyssSoundscape },
  { label: "Ocean Chemistry", description: "Curated pH, salinity and oxygen reference by depth zone.", icon: TestTube2, href: AppRoute.abyssChemistry },
  { label: "Mystery Species Lab", description: "A reasoning puzzle built from real species.", icon: Puzzle, href: AppRoute.abyssMysteryLab },
];

const AbyssLab = () => {
  const navigate = useNavigate();

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Virtual Marine Laboratory</p>
        <h1 className="abyss-title">The lab.</h1>
        <p className="abyss-tagline">Every analytical tool in Abyss, in one place.</p>
      </Reveal>

      <div className="abyss-nav-grid mt-6">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Reveal key={m.label}>
              <button type="button" className="abyss-card text-left w-full" style={{ height: "100%" }} onClick={() => navigate(m.href)}>
                <Icon size={22} className="mb-2" />
                <p className="font-bold mb-1">{m.label}</p>
                <p className="text-xs text-white/60">{m.description}</p>
              </button>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

export default AbyssLab;
