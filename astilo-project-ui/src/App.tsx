import AppRoutes from "./app/AppRoutes";
import { usePreferences } from "./theme/PreferencesProvider";

export default function App() {
  const { backgroundStyle, customImage } = usePreferences();
  const showCustomImage = backgroundStyle === "custom" && customImage;

  return (
    <div className={`relative min-h-screen text-ink bg-style-${backgroundStyle}`}>
      {backgroundStyle === "aurora" && (
        <div className="aurora" aria-hidden>
          <span className="b1" />
          <span className="b2" />
          <span className="b3" />
        </div>
      )}
      {backgroundStyle === "texture" && <div className="bg-texture-layer" aria-hidden />}
      {showCustomImage && (
        <div className="bg-custom-layer" aria-hidden>
          <img src={customImage} alt="" />
          <div className="bg-custom-scrim" />
        </div>
      )}
      <div className="relative z-10">
        <AppRoutes />
      </div>
    </div>
  );
}
