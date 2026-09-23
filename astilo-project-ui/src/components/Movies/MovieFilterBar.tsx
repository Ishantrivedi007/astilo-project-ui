import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import {
  EXTRA_ADMIN_GENRE_ID,
  EXTRA_ADMIN_GENRE_LABEL,
  fetchCertifications,
  fetchGenres,
  fetchWatchProviders,
  MOVIE_CERTIFICATIONS,
  TV_CERTIFICATIONS,
} from "../../lib/tmdb";
import { useAuth } from "../../auth/AuthProvider";

export interface FilterState {
  kind: "movie" | "tv";
  genreId?: number;
  year?: number;
  language?: string;
  country?: string;
  watchProviderId?: number;
  certification?: string;
}

interface MovieFilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  showKindToggle?: boolean;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
];

const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "IN", label: "India" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "CN", label: "China" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 40 }, (_, i) => CURRENT_YEAR - i);

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
}

/** A fully custom, themed dropdown — native <select> popups render with OS
 * chrome that can't be restyled, so this renders its own listbox in a portal
 * instead, matching the app's glass/dark theme like every other menu. */
const CustomSelect = ({ value, onChange, options, className = "" }: CustomSelectProps) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  const reposition = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 168) });
  };

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-1.5 rounded-full border py-1.5 pl-3 pr-2.5 text-xs font-medium outline-none transition-colors ${
          open ? "border-accent bg-surface" : "border-hair/20 bg-surface/60 hover:border-accent/50"
        } text-ink`}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`shrink-0 text-ink/40 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: menuPos.width }}
            className="z-[999] max-h-64 overflow-y-auto rounded-2xl border border-hair/20 bg-surface p-1.5 shadow-2xl"
          >
            {options.map((o) => {
              const isSelected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    isSelected ? "bg-accent-2/15 text-accent-2" : "text-ink hover:bg-ink/8"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && <Check size={13} strokeWidth={3} className="shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

/** Filter row for the search-results and category ("view more") pages. */
const MovieFilterBar = ({ value, onChange, showKindToggle = true }: MovieFilterBarProps) => {
  const { isAdmin } = useAuth();

  const { data: genres } = useQuery({
    queryKey: ["tmdb-genres", value.kind],
    staleTime: 1000 * 60 * 60,
    queryFn: () => fetchGenres(value.kind),
  });

  const { data: providers } = useQuery({
    queryKey: ["tmdb-providers", value.kind],
    staleTime: 1000 * 60 * 60,
    queryFn: () => fetchWatchProviders(value.kind),
  });

  const { data: certifications } = useQuery({
    queryKey: ["tmdb-certifications", value.kind],
    staleTime: 1000 * 60 * 60,
    queryFn: () => fetchCertifications(value.kind),
    placeholderData: () => (value.kind === "tv" ? TV_CERTIFICATIONS : MOVIE_CERTIFICATIONS),
  });

  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {showKindToggle && (
        <div className="flex overflow-hidden rounded-full border border-hair/20">
          {(["movie", "tv"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() =>
                onChange({ ...value, kind: k, genreId: undefined, certification: undefined })
              }
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                value.kind === k ? "bg-accent-2 text-white" : "text-ink/60 hover:bg-ink/5"
              }`}
            >
              {k === "tv" ? "Series" : "Movies"}
            </button>
          ))}
        </div>
      )}

      <CustomSelect
        value={String(value.genreId ?? "")}
        onChange={(v) => set("genreId", v ? Number(v) : undefined)}
        className="w-32"
        options={[
          { value: "", label: "Any genre" },
          ...(genres ?? []).map((g) => ({ value: String(g.id), label: g.name })),
          ...(isAdmin ? [{ value: String(EXTRA_ADMIN_GENRE_ID), label: EXTRA_ADMIN_GENRE_LABEL }] : []),
        ]}
      />

      <CustomSelect
        value={String(value.year ?? "")}
        onChange={(v) => set("year", v ? Number(v) : undefined)}
        className="w-24"
        options={[
          { value: "", label: "Any year" },
          ...YEARS.map((y) => ({ value: String(y), label: String(y) })),
        ]}
      />

      <CustomSelect
        value={value.language ?? ""}
        onChange={(v) => set("language", v || undefined)}
        className="w-32"
        options={[{ value: "", label: "Any language" }, ...LANGUAGES.map((l) => ({ value: l.code, label: l.label }))]}
      />

      <CustomSelect
        value={value.country ?? ""}
        onChange={(v) => set("country", v || undefined)}
        className="w-32"
        options={[{ value: "", label: "Any country" }, ...COUNTRIES.map((c) => ({ value: c.code, label: c.label }))]}
      />

      {certifications && certifications.length > 0 && (
        <CustomSelect
          value={value.certification ?? ""}
          onChange={(v) => set("certification", v || undefined)}
          className="w-28"
          options={[
            { value: "", label: "Any rating" },
            ...certifications.map((c) => ({ value: c, label: c })),
          ]}
        />
      )}

      {providers && providers.length > 0 && (
        <CustomSelect
          value={String(value.watchProviderId ?? "")}
          onChange={(v) => set("watchProviderId", v ? Number(v) : undefined)}
          className="w-32"
          options={[
            { value: "", label: "Any platform" },
            ...providers.map((p) => ({ value: String(p.provider_id), label: p.provider_name })),
          ]}
        />
      )}

      {(value.genreId ||
        value.year ||
        value.language ||
        value.country ||
        value.watchProviderId ||
        value.certification) && (
        <button
          type="button"
          onClick={() => onChange({ kind: value.kind })}
          className="text-xs font-semibold text-ink/40 hover:text-danger"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

export default MovieFilterBar;
