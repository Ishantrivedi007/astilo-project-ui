import { motion } from "framer-motion";

export type MusicTabId = "player" | "search" | "lyrics";

const TABS: { id: MusicTabId; label: string }[] = [
  { id: "player", label: "Music Player" },
  { id: "search", label: "Search Song" },
  { id: "lyrics", label: "Lyrics Search" },
];

interface MusicTabsProps {
  active: MusicTabId;
  onChange: (tab: MusicTabId) => void;
}

const MusicTabs = ({ active, onChange }: MusicTabsProps) => {
  return (
    <div className="nav-glass mb-6 flex w-full max-w-full flex-wrap gap-1 rounded-full p-1.5 sm:w-fit">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 sm:flex-none ${
              isActive ? "text-ink" : "text-ink/50 hover:text-ink/90"
            }`}
          >
            <span className="relative z-10">{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="music-active-pill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-accent/25 to-accent-2/10 ring-1 ring-inset ring-accent/40"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MusicTabs;
