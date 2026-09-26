import {
  BellRing,
  Bookmark,
  BookMarked,
  BookOpen,
  Briefcase,
  Calendar,
  CalendarClock,
  CheckSquare,
  Clapperboard,
  Code2,
  Compass,
  CreditCard,
  Database,
  DollarSign,
  FileCode2,
  FileText,
  FlaskConical,
  Focus,
  FolderKanban,
  FolderSearch,
  GitCompare,
  Globe,
  Heart,
  Home,
  Image,
  KanbanSquare,
  Library,
  LineChart,
  ListVideo,
  Map,
  MessageCircle,
  Music,
  Newspaper,
  NotebookPen,
  NotebookText,
  Orbit,
  Package,
  Popcorn,
  Presentation,
  Rocket,
  Satellite,
  Search,
  Send,
  ShoppingBag,
  TerminalSquare,
  ShoppingCart,
  Sparkles,
  Table,
  Telescope,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { AppRoute } from "./AppRoute";
import { MOVIE_ROWS } from "../components/Movies/catalog";
import { ANIME_ROWS } from "../components/Anime/catalog";

/** Single source of truth for "which pages exist per module" — the sidebar's
 * grouped rail + hover flyouts and the Universal Search palette both read
 * from this so the two can't drift out of sync with each other. */

export type NavCategory = "work" | "explore" | "entertain" | "life";

export const CATEGORY_ORDER: NavCategory[] = ["work", "explore", "entertain", "life"];

export const CATEGORY_LABEL: Record<NavCategory, string> = {
  work: "Work",
  explore: "Explore",
  entertain: "Entertain",
  life: "Life",
};

export const CATEGORY_ICON: Record<NavCategory, LucideIcon> = {
  work: Briefcase,
  explore: Compass,
  entertain: Popcorn,
  life: ShoppingBag,
};

export interface NavChild {
  id: string;
  label: string;
  route: string;
  icon: LucideIcon;
}

export interface NavModule {
  id: string;
  label: string;
  route: string;
  icon: LucideIcon;
  category: NavCategory;
  children: NavChild[];
}

export const MODULE_NAV: NavModule[] = [
  {
    id: "store",
    label: "Store",
    route: AppRoute.store,
    icon: ShoppingBag,
    category: "life",
    children: [
      { id: "store-wishlist", label: "Wishlist", route: AppRoute.storeWishlist, icon: Heart },
      { id: "store-cart", label: "Cart", route: AppRoute.storeCart, icon: ShoppingCart },
      { id: "store-orders", label: "Orders", route: AppRoute.storeOrders, icon: Package },
      { id: "store-checkout", label: "Checkout", route: AppRoute.storeCheckout, icon: CreditCard },
      { id: "store-compare", label: "Compare products", route: AppRoute.storeCompare, icon: GitCompare },
    ],
  },
  {
    id: "messenger",
    label: "Messenger",
    route: AppRoute.messenger,
    icon: MessageCircle,
    category: "life",
    children: [],
  },
  {
    id: "library",
    label: "Library",
    route: AppRoute.library,
    icon: Library,
    category: "life",
    children: [],
  },

  {
    id: "movies",
    label: "Movies",
    route: AppRoute.movies,
    icon: Clapperboard,
    category: "entertain",
    children: [
      { id: "movies-search", label: "Search", route: AppRoute.moviesSearch, icon: Search },
      { id: "movies-watchlist", label: "Watchlist", route: AppRoute.moviesWatchlist, icon: Bookmark },
      { id: "movies-playlists", label: "Playlists", route: AppRoute.moviesPlaylists, icon: ListVideo },
      ...MOVIE_ROWS.map((row) => ({
        id: `movies-category-${row.id}`,
        label: row.label,
        route: `${AppRoute.moviesCategory}/${row.id}`,
        icon: Clapperboard,
      })),
    ],
  },
  {
    id: "music",
    label: "Music",
    route: AppRoute.music,
    icon: Music,
    category: "entertain",
    children: [],
  },
  {
    id: "anime",
    label: "Anime",
    route: AppRoute.anime,
    icon: Sparkles,
    category: "entertain",
    children: [
      { id: "anime-search", label: "Search", route: AppRoute.animeSearch, icon: Search },
      { id: "anime-watchlist", label: "Watchlist", route: AppRoute.animeWatchlist, icon: Bookmark },
      { id: "anime-playlists", label: "Playlists", route: AppRoute.animePlaylists, icon: ListVideo },
      ...ANIME_ROWS.map((row) => ({
        id: `anime-category-${row.id}`,
        label: row.label,
        route: `${AppRoute.animeCategory}/${row.id}`,
        icon: Sparkles,
      })),
    ],
  },
  {
    id: "cosmos",
    label: "Cosmos",
    route: AppRoute.cosmos,
    icon: Orbit,
    category: "explore",
    children: [
      { id: "cosmos-search", label: "Search", route: AppRoute.cosmosSearch, icon: Search },
      { id: "cosmos-library", label: "Library", route: AppRoute.cosmosLibrary, icon: BookOpen },
      { id: "cosmos-space-weather", label: "Space Weather", route: AppRoute.cosmosSpaceWeather, icon: Zap },
      { id: "cosmos-compare", label: "Compare", route: AppRoute.cosmosCompare, icon: GitCompare },
      { id: "cosmos-image-lab", label: "Image Lab", route: AppRoute.cosmosImageLab, icon: Image },
      { id: "cosmos-orbit-explorer", label: "Orbit Explorer", route: AppRoute.cosmosOrbitExplorer, icon: Orbit },
      { id: "cosmos-mission-browse", label: "Mission Browse", route: AppRoute.cosmosMissionBrowse, icon: Rocket },
      { id: "cosmos-hubble", label: "Hubble", route: AppRoute.cosmosHubble, icon: Telescope },
      { id: "cosmos-satellite-tracker", label: "Satellite Tracker", route: AppRoute.cosmosSatelliteTracker, icon: Satellite },
      { id: "cosmos-reference-library", label: "Reference Library", route: AppRoute.cosmosReferenceLibrary, icon: BookMarked },
    ],
  },
  {
    id: "markets",
    label: "Markets",
    route: AppRoute.markets,
    icon: LineChart,
    category: "explore",
    children: [
      { id: "markets-asset", label: "Asset lookup", route: AppRoute.marketsAsset, icon: LineChart },
      { id: "markets-map", label: "Map", route: AppRoute.marketsMap, icon: Map },
      { id: "markets-commodities", label: "Commodities", route: AppRoute.marketsCommodities, icon: Package },
      { id: "markets-forex", label: "Forex", route: AppRoute.marketsForex, icon: DollarSign },
      { id: "markets-compare", label: "Compare", route: AppRoute.marketsCompare, icon: GitCompare },
      { id: "markets-macro", label: "Macro", route: AppRoute.marketsMacro, icon: Globe },
      { id: "markets-news", label: "News", route: AppRoute.marketsNews, icon: Newspaper },
      { id: "markets-calendar", label: "Calendar", route: AppRoute.marketsCalendar, icon: Calendar },
      { id: "markets-watchlist", label: "Watchlist", route: AppRoute.marketsWatchlist, icon: Bookmark },
      { id: "markets-alerts", label: "Alerts", route: AppRoute.marketsAlerts, icon: BellRing },
      { id: "markets-trading", label: "Trading", route: AppRoute.trading, icon: TrendingUp },
      { id: "markets-portfolio", label: "Portfolio", route: AppRoute.tradingPortfolio, icon: Wallet },
    ],
  },

  {
    id: "nimrose",
    label: "Nimrose Desk",
    route: AppRoute.nimrose,
    icon: CalendarClock,
    category: "work",
    children: [
      { id: "nimrose-dashboard", label: "Dashboard", route: `${AppRoute.nimrose}?section=home`, icon: Home },
      { id: "nimrose-calendar", label: "Calendar", route: `${AppRoute.nimrose}?section=calendar`, icon: Calendar },
      { id: "nimrose-tasks", label: "Tasks", route: `${AppRoute.nimrose}?section=tasks`, icon: CheckSquare },
      { id: "nimrose-kanban", label: "Kanban", route: `${AppRoute.nimrose}?section=kanban`, icon: KanbanSquare },
      { id: "nimrose-projects", label: "Projects", route: `${AppRoute.nimrose}?section=projects`, icon: FolderKanban },
      { id: "nimrose-notes", label: "Notes", route: `${AppRoute.nimrose}?section=notes`, icon: NotebookText },
      { id: "nimrose-workspace", label: "Research Workspace", route: `${AppRoute.nimrose}?section=workspace`, icon: FolderSearch },
      { id: "nimrose-browser", label: "Browser", route: `${AppRoute.nimrose}?section=browser`, icon: Globe },
      { id: "nimrose-focus", label: "Focus", route: `${AppRoute.nimrose}?section=focus`, icon: Focus },
      { id: "nimrose-chat", label: "Chat", route: `${AppRoute.nimrose}?section=chat`, icon: MessageCircle },
    ],
  },
  {
    id: "research",
    label: "Research",
    route: AppRoute.research,
    icon: FlaskConical,
    category: "work",
    children: [],
  },
  {
    id: "office",
    label: "Studio",
    route: AppRoute.office,
    icon: NotebookPen,
    category: "work",
    children: [
      { id: "office-word", label: "Word", route: AppRoute.officeWord, icon: FileText },
      { id: "office-excel", label: "Excel", route: AppRoute.officeExcel, icon: Table },
      { id: "office-slides", label: "Slides", route: AppRoute.officeSlides, icon: Presentation },
      { id: "office-code", label: "Code", route: AppRoute.officeCode, icon: FileCode2 },
    ],
  },
  {
    id: "code",
    label: "Code",
    route: AppRoute.code,
    icon: Code2,
    category: "work",
    children: [
      { id: "code-editor", label: "Editor", route: AppRoute.officeCode, icon: FileCode2 },
      { id: "code-terminal", label: "Terminal", route: AppRoute.codeTerminal, icon: TerminalSquare },
      { id: "code-api-studio", label: "API Studio", route: AppRoute.codeApiStudio, icon: Send },
      { id: "code-database", label: "Database", route: AppRoute.codeDatabase, icon: Database },
    ],
  },
];
