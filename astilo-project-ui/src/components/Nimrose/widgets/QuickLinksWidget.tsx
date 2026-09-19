import { Link } from "react-router-dom";
import { Clapperboard, Music, Orbit, ShoppingBag, Sparkles } from "lucide-react";

import { AppRoute } from "../../../app/AppRoute";

const LINKS = [
  { label: "Movies", href: AppRoute.movies, icon: Clapperboard },
  { label: "Music", href: AppRoute.music, icon: Music },
  { label: "Anime", href: AppRoute.anime, icon: Sparkles },
  { label: "Store", href: AppRoute.store, icon: ShoppingBag },
  { label: "Cosmos", href: AppRoute.cosmos, icon: Orbit },
];

const QuickLinksWidget = () => (
  <div className="nimrose-quick-links">
    {LINKS.map((link) => {
      const Icon = link.icon;
      return (
        <Link key={link.href} to={link.href} className="nimrose-quick-link">
          <Icon size={16} strokeWidth={2} />
          <span>{link.label}</span>
        </Link>
      );
    })}
  </div>
);

export default QuickLinksWidget;
