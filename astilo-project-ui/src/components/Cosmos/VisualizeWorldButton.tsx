import { useState } from "react";
import { Sparkles, X } from "lucide-react";

interface Props {
  name: string;
  equilibriumTemperatureK?: number | null;
  radiusEarthRadii?: number | null;
  massEarthMasses?: number | null;
  hostStarTeffK?: number | null;
}

/** Builds a short descriptive prompt from real queried data (temperature, size,
 * host star type) so the rendering reflects this specific planet rather than a
 * generic scene. Image itself is AI-generated speculation, never presented as
 * real imagery — labelled as such in the UI. */
function buildPrompt(p: Props): string {
  const bits: string[] = [`exoplanet ${p.name}`, "space art, realistic digital painting, seen from orbit"];
  if (p.equilibriumTemperatureK != null) {
    if (p.equilibriumTemperatureK > 800) bits.push("scorched volcanic hellish surface, molten");
    else if (p.equilibriumTemperatureK > 400) bits.push("arid desert world, rocky, hot");
    else if (p.equilibriumTemperatureK > 250) bits.push("temperate, oceans and clouds, earth-like");
    else bits.push("frozen icy world, glaciers");
  }
  if (p.radiusEarthRadii != null) {
    if (p.radiusEarthRadii > 6) bits.push("gas giant, thick banded atmosphere");
    else if (p.radiusEarthRadii > 2) bits.push("sub-neptune, deep atmosphere haze");
    else bits.push("rocky terrestrial planet");
  }
  if (p.hostStarTeffK != null) {
    if (p.hostStarTeffK < 3800) bits.push("dim red dwarf star glowing in the sky");
    else if (p.hostStarTeffK > 7500) bits.push("bright blue-white star in the sky");
    else bits.push("yellow-white star in the sky");
  }
  return bits.join(", ");
}

const VisualizeWorldButton = (props: Props) => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prompt = buildPrompt(props);
  const seed = Math.abs([...props.name].reduce((a, c) => a + c.charCodeAt(0), 0));
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&seed=${seed}&nologo=true`;

  return (
    <>
      <button
        type="button"
        className="cosmos-chip inline-flex items-center gap-1"
        onClick={() => {
          setLoaded(false);
          setOpen(true);
        }}
      >
        <Sparkles size={12} /> Visualize this world
      </button>

      {open && (
        <div className="cosmos-modal-overlay" onClick={() => setOpen(false)}>
          <div className="cosmos-imagelab-detail glass-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="cosmos-chip" style={{ position: "absolute", top: 12, right: 12 }} onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
            {!loaded && <p className="p-6 text-sm text-white/60">Generating a speculative rendering…</p>}
            <img src={imageUrl} alt={`AI-generated speculative visualization of ${props.name}`} onLoad={() => setLoaded(true)} style={{ display: loaded ? "block" : "none" }} />
            <div className="cosmos-imagelab-detail-body">
              <h3>{props.name}</h3>
              <p className="cosmos-unavailable" style={{ fontStyle: "normal" }}>
                AI-generated speculative art based on this planet's known temperature, size, and host star —
                not a real photograph. Generated via Pollinations.ai.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VisualizeWorldButton;
