import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Link } from "@heroui/react";
import { GradientButton } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import "./Landing.scss";

interface Feature {
  emoji: string;
  title: string;
  description: string;
  accent: "a" | "b" | "c" | "d" | "e";
}

const FEATURES: Feature[] = [
  {
    emoji: "🎬",
    title: "Movies & TV",
    description: "A coverflow hero, watchlists, reviews with star ratings, and TMDB-backed detail pages with trailers and cast.",
    accent: "a",
  },
  {
    emoji: "🌸",
    title: "Anime corner",
    description: "A dedicated anime hub with a top-10 rail, sub/dub server switching on the watch page, and AniList-backed metadata.",
    accent: "b",
  },
  {
    emoji: "🎧",
    title: "Music player",
    description: "A full player with playlists, synced lyrics, and a queue that follows you around the app.",
    accent: "c",
  },
  {
    emoji: "🛍️",
    title: "Store",
    description: "Browse a real product catalogue, dig into detail pages with reviews, and check out — backed by your own account.",
    accent: "d",
  },
  {
    emoji: "🎨",
    title: "Make it yours",
    description: "30 themes, background styles — including your own uploaded photo — and five loading animations, applied everywhere.",
    accent: "e",
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
  <div className="landing">
    <header className="landing-header">
      <RouterLink to={AppRoute.landing} className="landing-brand">
        <span className="font-display text-lg font-bold uppercase tracking-[0.16em] text-ink">
          Astilo&apos;s
        </span>
        <span className="text-accent">.</span>
      </RouterLink>
      <div className="flex items-center gap-2">
        <Link href={AppRoute.login} className="px-3 py-1.5 text-sm font-semibold text-ink/70 hover:text-ink">
          Log in
        </Link>
        <GradientButton onPress={() => navigate(AppRoute.signup)} size="sm">
          Sign up
        </GradientButton>
      </div>
    </header>

    {/* Hero */}
    <section className="landing-hero">
      <p className="landing-eyebrow">✦ movies · anime · music · store, one place</p>
      <h1 className="landing-title">
        Everything you watch,
        <br />
        <span className="gradient-text">listen to, and shop for.</span>
      </h1>
      <p className="landing-sub">
        Astilo&apos;s is a personal media hub — track what you&apos;re watching, keep a
        queue of what you&apos;re listening to, browse a store, and make the whole
        thing look exactly the way you want it to.
      </p>
      <div className="landing-cta">
        <GradientButton onPress={() => navigate(AppRoute.signup)} size="lg">
          Get started — it&apos;s free ✨
        </GradientButton>
        <Link href={AppRoute.login} className="landing-cta-secondary">
          I already have an account →
        </Link>
      </div>
    </section>

    {/* Feature grid */}
    <section className="landing-features">
      <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
        One account. <span className="gradient-text">Five worlds.</span>
      </h2>
      <div className="landing-grid">
        {FEATURES.map((f) => (
          <div key={f.title} className={`landing-card landing-card--${f.accent}`}>
            <span className="landing-card-emoji">{f.emoji}</span>
            <h3 className="landing-card-title">{f.title}</h3>
            <p className="landing-card-desc">{f.description}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Bottom CTA */}
    <section className="landing-footer-cta">
      <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
        Ready to make it <span className="gradient-text">yours</span>?
      </h2>
      <p className="mt-2 max-w-md text-sm text-ink/60">
        Create an account in a few seconds — no credit card, no spam, just your stuff.
      </p>
      <GradientButton onPress={() => navigate(AppRoute.signup)} size="lg" className="mt-6">
        Create my account
      </GradientButton>
    </section>

    <footer className="landing-foot">
      <span>© {new Date().getFullYear()} Astilo&apos;s</span>
      <div className="flex gap-4">
        <Link href={AppRoute.login} size="sm" className="text-ink/50">
          Log in
        </Link>
        <Link href={AppRoute.signup} size="sm" className="text-ink/50">
          Sign up
        </Link>
      </div>
    </footer>
  </div>
  );
};

export default Landing;
