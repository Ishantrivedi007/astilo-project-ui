import type { AbyssConfidence } from "../../lib/abyssApi";

const LABEL: Record<AbyssConfidence, string> = {
  OBSERVED: "Observed",
  MODELLED: "Modelled",
  CURATED: "Curated",
  SIMULATED: "Simulation",
  AI_INFERRED: "AI-inferred",
  UNKNOWN: "Unknown",
};

/** Renders Astilo Abyss's confidence vocabulary (rule #6) as a distinct,
 * color-coded badge so observed fact, model output, curated content and
 * simulation output can never be mistaken for one another in the UI. */
const AbyssConfidenceBadge = ({ confidence }: { confidence: AbyssConfidence }) => (
  <span className={`abyss-confidence-badge abyss-confidence-badge--${confidence.toLowerCase()}`}>
    {LABEL[confidence] ?? confidence}
  </span>
);

export default AbyssConfidenceBadge;
