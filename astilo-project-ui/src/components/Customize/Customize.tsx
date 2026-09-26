import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "../../theme/ThemeProvider";
import { usePreferences } from "../../theme/PreferencesProvider";
import { BACKGROUND_STYLES, LOADER_STYLES } from "../../theme/preferences";
import type { ThemeMeta } from "../../theme/themes";
import { PageHeading, GlassPanel } from "../shared";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { CATEGORY_LABEL, CATEGORY_ORDER, MODULE_NAV } from "../../app/moduleNav";
import { useAuth } from "../../auth/AuthProvider";
import { updateProfile } from "../../lib/profileApi";
import "./Customize.scss";

const ThemeCard = ({
  theme,
  active,
  onPick,
}: {
  theme: ThemeMeta;
  active: boolean;
  onPick: () => void;
}) => (
  <button
    type="button"
    onClick={onPick}
    className={`theme-card ${active ? "is-active" : ""}`}
    style={{
      backgroundImage: `linear-gradient(135deg, ${theme.swatch[0]}, ${theme.swatch[1]}, ${theme.swatch[2]})`,
    }}
  >
    <span className="theme-card-name" style={{ color: theme.mode === "dark" ? "#fff" : "#000" }}>
      {theme.name}
    </span>
    {active && <span className="theme-card-check">✓</span>}
  </button>
);

const MAX_IMAGE_MB = 6;

const Customize = () => {
  const { theme, themeId, setThemeId, themes } = useTheme();
  const {
    backgroundStyle,
    setBackgroundStyle,
    loaderStyle,
    setLoaderStyle,
    customImage,
    setCustomImage,
  } = usePreferences();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();

  const light = themes.filter((t) => t.mode === "light");
  const dark = themes.filter((t) => t.mode === "dark");

  // null = never customized → every module shows, same as before this
  // feature existed. An empty array is a deliberate "hide everything" —
  // distinct from null, so "Show all" has something to reset back to.
  const pinned = user?.pinnedModules ?? null;
  const isPinned = (id: string) => pinned === null || pinned.includes(id);

  const savePinned = useMutation({
    mutationFn: (next: string[] | null) => updateProfile({ pinnedModules: next }),
    onSuccess: (updated) => {
      updateUser(updated);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toast.error("Couldn't save your sidebar choices."),
  });

  const toggleModule = (id: string) => {
    const base = pinned ?? MODULE_NAV.map((m) => m.id);
    const next = base.includes(id) ? base.filter((m) => m !== id) : [...base, id];
    savePinned.mutate(next);
  };

  const handleImagePick = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      alert(`Please pick an image under ${MAX_IMAGE_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomImage(reader.result as string);
      setBackgroundStyle("custom");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="pb-16">
      <PageHeading eyebrow="✦ make it yours">
        <span className="gradient-text">Customize</span> Astilo&apos;s
      </PageHeading>

      {/* Theme */}
      <GlassPanel
        title="Theme"
        subtitle={`Currently: ${theme.name} · ${theme.mode === "dark" ? "Dark" : "Light"}`}
        className="mb-8"
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink/40">
          Light
        </p>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {light.map((t) => (
            <ThemeCard key={t.id} theme={t} active={themeId === t.id} onPick={() => setThemeId(t.id)} />
          ))}
        </div>

        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink/40">
          Dark
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {dark.map((t) => (
            <ThemeCard key={t.id} theme={t} active={themeId === t.id} onPick={() => setThemeId(t.id)} />
          ))}
        </div>
      </GlassPanel>

      {/* Sidebar personalization */}
      <GlassPanel
        title="Sidebar"
        subtitle="Pick which modules show in your sidebar — everything else stays one Ctrl/Cmd+K search away"
        className="mb-8"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-ink/50">
            {pinned === null
              ? "Showing every module (default)."
              : `Showing ${pinned.length} of ${MODULE_NAV.length} modules.`}
          </p>
          {pinned !== null && (
            <button
              type="button"
              onClick={() => savePinned.mutate(null)}
              className="text-xs font-semibold text-accent-2 underline"
            >
              Show all modules
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_ORDER.map((category) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
                {CATEGORY_LABEL[category]}
              </p>
              <div className="flex flex-col gap-1.5">
                {MODULE_NAV.filter((m) => m.category === category).map((mod) => {
                  const Icon = mod.icon;
                  const active = isPinned(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                        active
                          ? "border-accent/40 bg-accent/10 text-ink"
                          : "border-hair/15 text-ink/40 hover:text-ink/70"
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{mod.label}</span>
                      {active && <span className="text-accent-2">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Background */}
      <GlassPanel
        title="Background"
        subtitle="How the atmosphere behind every page behaves"
        className="mb-8"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BACKGROUND_STYLES.filter((bg) => bg.id !== "custom").map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => setBackgroundStyle(bg.id)}
              className={`bg-option ${backgroundStyle === bg.id ? "is-active" : ""}`}
            >
              <span className={`bg-option-preview bg-option-preview--${bg.id}`}>
                {bg.id === "aurora" && (
                  <>
                    <i className="bg-preview-blob b1" />
                    <i className="bg-preview-blob b2" />
                  </>
                )}
              </span>
              <span className="bg-option-name">
                {bg.name} {backgroundStyle === bg.id && <span className="text-accent">✓</span>}
              </span>
              <span className="bg-option-desc">{bg.description}</span>
            </button>
          ))}

          {/* "Your image" — a real upload, not another swatch */}
          <label
            className={`bg-option bg-option--upload ${backgroundStyle === "custom" ? "is-active" : ""}`}
          >
            <span className="bg-option-preview bg-option-preview--custom">
              {customImage ? (
                <img src={customImage} alt="" className="bg-option-thumb" />
              ) : (
                <span className="bg-option-upload-hint">＋ pick a photo</span>
              )}
            </span>
            <span className="bg-option-name">
              Your image {backgroundStyle === "custom" && <span className="text-accent">✓</span>}
            </span>
            <span className="bg-option-desc">
              {customImage
                ? "Tap to replace it, or use the button below to remove it."
                : "Upload a photo — it becomes the backdrop everywhere."}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleImagePick(e.target.files?.[0])}
            />
          </label>
        </div>

        {customImage && (
          <button
            type="button"
            onClick={() => {
              setCustomImage(null);
              if (backgroundStyle === "custom") setBackgroundStyle("aurora");
            }}
            className="mt-3 text-xs font-semibold text-ink/50 underline hover:text-ink"
          >
            Remove uploaded image
          </button>
        )}
      </GlassPanel>

      {/* Loader */}
      <GlassPanel
        title="Loading animation"
        subtitle="Used every time the app fetches something, everywhere"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {LOADER_STYLES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLoaderStyle(l.id)}
              className={`loader-option ${loaderStyle === l.id ? "is-active" : ""}`}
            >
              <span className="loader-option-preview">
                <AppLoader variant={l.id} size="sm" />
              </span>
              <span className="loader-option-name">
                {l.name} {loaderStyle === l.id && <span className="text-accent">✓</span>}
              </span>
              <span className="loader-option-desc">{l.description}</span>
            </button>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};

export default Customize;
