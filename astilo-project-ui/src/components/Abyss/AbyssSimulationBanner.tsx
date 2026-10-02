import type { ReactNode } from "react";

/** Mandatory on every simulation result page (blueprint rule #10/#14) —
 * never let a modeled/simulated output be mistaken for an observation or a
 * real-world forecast. */
const AbyssSimulationBanner = ({ children }: { children?: ReactNode }) => (
  <div className="abyss-sim-banner">
    <strong>ASTILO SIMULATION</strong>
    <p>{children ?? "This visualization demonstrates relationships for teaching purposes and is not a forecast of a real ecosystem."}</p>
  </div>
);

export default AbyssSimulationBanner;
