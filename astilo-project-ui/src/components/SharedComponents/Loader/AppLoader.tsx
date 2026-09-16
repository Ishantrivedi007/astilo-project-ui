import { RingLoader as RSRing, PulseLoader as RSPulse, ScaleLoader as RSScale } from "react-spinners";
import { usePreferences } from "../../../theme/PreferencesProvider";
import type { LoaderStyleId } from "../../../theme/preferences";
import "./loader.scss";

interface AppLoaderProps {
  /** Force a specific variant instead of the user's saved preference — used by the Customize page previews. */
  variant?: LoaderStyleId;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const PX: Record<"sm" | "md" | "lg", number> = { sm: 22, md: 34, lg: 48 };
// react-spinners takes a literal CSS color string — a `rgb(var(--x))` string
// is resolved by the browser at paint time, so theme-awareness still works.
const ACCENT = "rgb(var(--accent-rgb))";

/** Brand-flavoured: a spark swinging around a ring — kept custom, no library match for this. */
const OrbitLoader = () => (
  <span className="ldr-orbit" aria-hidden>
    <span className="ldr-orbit-ring" />
    <span className="ldr-orbit-spark" />
  </span>
);

/** Breathing glow with a sparkle — kept custom (react-spinners' "Pulse" is bouncing dots, mapped separately). */
const GlowPulseLoader = () => (
  <span className="ldr-pulse" aria-hidden>
    <span className="ldr-pulse-core">✦</span>
  </span>
);

const RingLoader = ({ px }: { px: number }) => (
  <RSRing color={ACCENT} size={px} speedMultiplier={1.1} />
);

const DotsLoader = ({ px }: { px: number }) => (
  <RSPulse color={ACCENT} size={px * 0.28} margin={2} speedMultiplier={0.9} />
);

const BarsLoader = ({ px }: { px: number }) => (
  <RSScale color={ACCENT} height={px} width={px * 0.13} radius={4} margin={2} speedMultiplier={0.9} />
);

const VARIANTS: Record<LoaderStyleId, (px: number) => JSX.Element> = {
  orbit: OrbitLoader,
  ring: (px) => <RingLoader px={px} />,
  dots: (px) => <DotsLoader px={px} />,
  bars: (px) => <BarsLoader px={px} />,
  pulse: GlowPulseLoader,
};

/** The single themed loader used everywhere a "loading…" state is shown.
 *  "orbit" and "pulse" are hand-built (brand-specific); "ring", "dots" and
 *  "bars" are powered by react-spinners so switching styles gets real,
 *  battle-tested animation curves instead of more from-scratch CSS. */
const AppLoader = ({ variant, label, size = "md" }: AppLoaderProps) => {
  const { loaderStyle } = usePreferences();
  const id = variant ?? loaderStyle;
  const Variant = VARIANTS[id] ?? VARIANTS.orbit;

  return (
    <div className={`ldr-wrap ldr-${size}`} role="status" aria-live="polite">
      <span className="ldr-slot">{Variant(PX[size])}</span>
      {label && <span className="ldr-label">{label}</span>}
    </div>
  );
};

export default AppLoader;
