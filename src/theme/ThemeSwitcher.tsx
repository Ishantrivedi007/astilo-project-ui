import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Tooltip,
} from "@heroui/react";
import { useTheme } from "./ThemeProvider";
import type { ThemeMeta } from "./themes";

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const Swatch = ({
  theme,
  active,
  onPick,
}: {
  theme: ThemeMeta;
  active: boolean;
  onPick: () => void;
}) => (
  <Tooltip content={theme.name} placement="top" delay={200} closeDelay={0}>
    <button
      type="button"
      aria-label={theme.name}
      onClick={onPick}
      className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
        active ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "ring-1 ring-black/10"
      }`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.swatch[0]}, ${theme.swatch[1]}, ${theme.swatch[2]})`,
      }}
    />
  </Tooltip>
);

const ThemeSwitcher = () => {
  const { theme, themeId, setThemeId, themes } = useTheme();
  const light = themes.filter((t) => t.mode === "light");
  const dark = themes.filter((t) => t.mode === "dark");

  return (
    <Popover placement="bottom-end" offset={12}>
      <PopoverTrigger>
        <Button
          isIconOnly
          radius="full"
          size="sm"
          variant="light"
          aria-label="Change theme"
          className="text-ink/70 hover:bg-ink/5"
        >
          {theme.mode === "dark" ? <MoonIcon /> : <SunIcon />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[248px] gap-4 rounded-2xl border border-hair/15 bg-surface/95 p-4 backdrop-blur-xl">
        <div>
          <p className="text-sm font-semibold text-ink">Theme</p>
          <p className="text-xs text-ink/50">{theme.name}</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">
            Light
          </p>
          <div className="flex gap-2.5">
            {light.map((t) => (
              <Swatch
                key={t.id}
                theme={t}
                active={themeId === t.id}
                onPick={() => setThemeId(t.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">
            Dark
          </p>
          <div className="flex gap-2.5">
            {dark.map((t) => (
              <Swatch
                key={t.id}
                theme={t}
                active={themeId === t.id}
                onPick={() => setThemeId(t.id)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemeSwitcher;
