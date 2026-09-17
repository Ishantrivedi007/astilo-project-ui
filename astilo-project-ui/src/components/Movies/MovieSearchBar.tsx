import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { searchMedia, hasTmdb, type MediaItem } from "../../lib/tmdb";

interface MovieSearchBarProps {
  basePath?: string;
  searchPath?: string;
  className?: string;
}

/** Debounced title search with a live dropdown; Enter / icon click opens the full results page. */
const MovieSearchBar = ({
  basePath = "/movies",
  searchPath = "/movies/search",
  className = "",
}: MovieSearchBarProps) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const term = q.trim();
    if (!hasTmdb || term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchMedia(term));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goToResults = () => {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    navigate(`${searchPath}?q=${encodeURIComponent(term)}`);
  };

  return (
    <div ref={boxRef} className={`relative w-full max-w-md ${className}`}>
      <div className="flex items-center gap-2 rounded-full border border-hair/20 bg-surface/60 px-4 py-2 focus-within:border-accent">
        <Search size={16} className="shrink-0 text-ink/40" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              goToResults();
            }
          }}
          placeholder="Search movies & shows…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
        />
        <button
          type="button"
          aria-label="Search"
          onClick={goToResults}
          className="shrink-0 text-ink/50 hover:text-accent-2"
        >
          <Search size={16} />
        </button>
      </div>

      {open && q.trim().length >= 2 && (loading || results.length > 0) && (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-hair/20 bg-surface p-1 shadow-xl">
          {loading && (
            <div className="flex justify-center p-3">
              <AppLoader size="sm" />
            </div>
          )}
          {!loading &&
            results.map((m) => (
              <Link
                key={`${m.kind}-${m.id}`}
                to={`${basePath}/${m.kind}/${m.id}`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-ink/5"
              >
                <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-ink/10">
                  {m.poster && (
                    <img src={m.poster} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{m.title}</span>
                  <span className="text-[11px] text-ink/40">
                    {m.year || "—"} · {m.kind === "tv" ? "Series" : "Film"}
                  </span>
                </span>
              </Link>
            ))}
          {!loading && results.length > 0 && (
            <button
              type="button"
              onClick={goToResults}
              className="mt-1 block w-full rounded-lg p-2 text-center text-xs font-semibold text-accent-2 hover:bg-ink/5"
            >
              See all results for “{q.trim()}” →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MovieSearchBar;
