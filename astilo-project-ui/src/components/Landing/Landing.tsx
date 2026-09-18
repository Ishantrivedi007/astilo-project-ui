import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Link } from "@heroui/react";
import { motion } from "framer-motion";
import { GradientButton, Reveal } from "../shared";
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

const CAPABILITIES = [
  { icon: "🎬", label: "Movies & Shows" },
  { icon: "🎧", label: "Music" },
  { icon: "🛍️", label: "Store" },
  { icon: "🌸", label: "Anime" },
  { icon: "🎨", label: "Themes" },
];

const PREVIEW_CONTINUE = [
  { emoji: "🎬", title: "Dune: Part Two" },
  { emoji: "📺", title: "The Last of Us" },
  { emoji: "🎮", title: "Fallout" },
];

interface EcosystemNode {
  icon: string;
  label: string;
  angle: number;
}

const ECOSYSTEM_NODES: EcosystemNode[] = [
  { icon: "🎬", label: "Movies & TV", angle: -90 },
  { icon: "🌸", label: "Anime", angle: -18 },
  { icon: "🎧", label: "Music", angle: 54 },
  { icon: "🛍️", label: "Store", angle: 126 },
  { icon: "🎨", label: "Customize", angle: 198 },
];

// Distance (in the orbit SVG's own units) from the hub to each node card's
// centre, and the card's own half-width/half-height in those same units —
// used to work out exactly where a spoke line should stop at the card's
// edge instead of its centre.
const NODE_RADIUS = 130;
const CARD_HALF_W = 36;
const CARD_HALF_H = 26;

const COMING_SOON = [
  { icon: "🗓️", title: "Nimrose Desk", description: "Calendar, tasks, notes and focus tools." },
  { icon: "🌐", title: "Browser", description: "Browse the web without leaving Astilo's." },
  { icon: "🗄️", title: "Vault", description: "Save and organize everything worth keeping." },
  { icon: "📡", title: "Pulse", description: "One feed for everything happening around you." },
  { icon: "🧩", title: "Spaces", description: "Arrange Astilo's around whatever you're doing." },
  { icon: "✦", title: "Astilo AI", description: "One assistant for your whole ecosystem." },
];

const useScrolled = (threshold = 12) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
};

const Landing = () => {
  const navigate = useNavigate();
  const scrolled = useScrolled();

  return (
  <div className="landing">
    <div className={`landing-nav-wrap ${scrolled ? "landing-nav-wrap--scrolled" : ""}`}>
      <nav className={`landing-nav nav-glass ${scrolled ? "nav-glass-scrolled" : ""}`}>
        <RouterLink to={AppRoute.landing} className="landing-brand">
          <span className="font-display text-base font-bold uppercase tracking-[0.16em] text-ink">
            Astilo&apos;s
          </span>
          <span className="text-accent">.</span>
        </RouterLink>

        <div className="landing-nav-links">
          <a href="#ecosystem">Explore</a>
          <a href="#worlds">Features</a>
        </div>

        <div className="landing-nav-actions">
          <Link href={AppRoute.login} className="px-2 text-sm font-semibold text-ink/70 hover:text-ink">
            Log in
          </Link>
          <GradientButton onPress={() => navigate(AppRoute.signup)} size="sm">
            Get started
          </GradientButton>
        </div>
      </nav>
    </div>

    {/* Hero */}
    <section className="landing-hero">
      <div className="landing-hero-grid">
        <div className="landing-hero-copy">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="landing-eyebrow"
          >
            ✦ your digital world, one place
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="landing-title"
          >
            Everything you watch,
            <br />
            <span className="gradient-text">listen to, and shop for.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="landing-sub"
          >
            Astilo&apos;s is a personal digital ecosystem — track what you&apos;re watching, keep a
            queue of what you&apos;re listening to, browse a store, and make the whole
            thing look exactly the way you want it to.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="landing-cta"
          >
            <GradientButton
              onPress={() => navigate(AppRoute.signup)}
              size="lg"
              className="!h-auto !px-9 !py-4 !text-lg"
            >
              Get started — it&apos;s free ✨
            </GradientButton>
            <Link href={AppRoute.login} className="landing-cta-secondary">
              I already have an account →
            </Link>
          </motion.div>
        </div>

        {/* Floating ecosystem preview */}
        <motion.div
          className="landing-preview"
          initial={{ opacity: 0, y: 24, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <div className="landing-preview-glow" />
          <div className="landing-preview-card">
            <div className="landing-preview-header">
              <span className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ink">
                Astilo&apos;s
              </span>
              <span className="landing-preview-dot" />
            </div>
            <p className="landing-preview-label">Continue watching</p>
            <div className="landing-preview-rows">
              {PREVIEW_CONTINUE.map((item) => (
                <div key={item.title} className="landing-preview-row">
                  <span className="landing-preview-row-icon">{item.emoji}</span>
                  <span className="landing-preview-row-title">{item.title}</span>
                </div>
              ))}
            </div>
            <p className="landing-preview-label">Quick access</p>
            <div className="landing-preview-tiles">
              {CAPABILITIES.slice(0, 4).map((c) => (
                <span key={c.label} className="landing-preview-tile">
                  {c.icon}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Capability strip */}
    <section className="landing-capabilities">
      {CAPABILITIES.map((c, i) => (
        <Reveal key={c.label} index={i} className="landing-capability">
          <span className="landing-capability-icon">{c.icon}</span>
          <span className="landing-capability-label">{c.label}</span>
        </Reveal>
      ))}
    </section>

    {/* One account, multiple worlds — ecosystem diagram */}
    <section id="ecosystem" className="landing-ecosystem">
      <Reveal className="landing-section-head">
        <p className="landing-eyebrow">✦ one account</p>
        <h2 className="section-heading text-ink">
          One account. <span className="gradient-text">Multiple worlds.</span>
        </h2>
        <p className="landing-section-sub">
          Your entertainment, your queue, and your store don&apos;t have to live in
          separate places — or look like anyone else&apos;s.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="landing-orbit">
        <div className="landing-orbit-center">
          <span className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
            Astilo&apos;s
          </span>
        </div>
        <svg className="landing-orbit-lines" viewBox="-160 -160 320 320" aria-hidden="true">
          {ECOSYSTEM_NODES.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            // Node cards sit on this same ray at radius NODE_RADIUS. Rather
            // than drawing to the card's centre (pokes into whatever corner
            // the ray crosses) or stopping arbitrarily short (leaves a gap,
            // as before), find exactly where the ray exits the card's
            // rectangle and end the line — and its connector dot — there.
            const dx = cos !== 0 ? CARD_HALF_W / Math.abs(cos) : Infinity;
            const dy = sin !== 0 ? CARD_HALF_H / Math.abs(sin) : Infinity;
            const edgeRadius = NODE_RADIUS - Math.min(dx, dy);
            const x = cos * edgeRadius;
            const y = sin * edgeRadius;
            return (
              <g key={node.label}>
                <motion.line
                  x1={0}
                  y1={0}
                  x2={x}
                  y2={y}
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.5 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  stroke="rgb(var(--accent-rgb))"
                  strokeWidth={1}
                />
                <motion.circle
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill="rgb(var(--accent-rgb))"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 0.9 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.9 }}
                />
              </g>
            );
          })}
        </svg>
        {ECOSYSTEM_NODES.map((node, i) => {
          const rad = (node.angle * Math.PI) / 180;
          const x = 50 + (Math.cos(rad) * NODE_RADIUS) / 3.2;
          const y = 50 + (Math.sin(rad) * NODE_RADIUS) / 3.2;
          return (
            <motion.div
              key={node.label}
              className="landing-orbit-node"
              style={{ left: `${x}%`, top: `${y}%` }}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
              whileHover={{ scale: 1.08 }}
            >
              <div className="landing-orbit-node-float">
                <span className="landing-orbit-node-icon">{node.icon}</span>
                <span className="landing-orbit-node-label">{node.label}</span>
              </div>
            </motion.div>
          );
        })}
      </Reveal>
    </section>

    {/* Feature grid */}
    <section id="worlds" className="landing-features">
      <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
        Built around <span className="gradient-text">you.</span>
      </h2>
      <div className="landing-grid">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} index={i} className={`landing-card landing-card--${f.accent}`}>
            <span className="landing-card-emoji">{f.emoji}</span>
            <h3 className="landing-card-title">{f.title}</h3>
            <p className="landing-card-desc">{f.description}</p>
          </Reveal>
        ))}
      </div>
    </section>

    {/* Coming soon */}
    <section className="landing-coming-soon">
      <Reveal className="landing-section-head">
        <p className="landing-eyebrow">✦ always evolving</p>
        <h2 className="section-heading text-ink">And we&apos;re just getting started.</h2>
        <p className="landing-section-sub">
          The Astilo&apos;s ecosystem keeps growing — here&apos;s what&apos;s next.
        </p>
      </Reveal>
      <div className="landing-coming-soon-grid">
        {COMING_SOON.map((item, i) => (
          <Reveal key={item.title} index={i} className="landing-coming-soon-card">
            <span className="landing-coming-soon-icon">{item.icon}</span>
            <div>
              <h3 className="landing-coming-soon-title">
                {item.title}
                <span className="landing-coming-soon-badge">Coming soon</span>
              </h3>
              <p className="landing-coming-soon-desc">{item.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>

    {/* Bottom CTA */}
    <section className="landing-footer-cta">
      <div className="landing-footer-cta-inner">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Ready to make it <span className="gradient-text">yours</span>?
        </h2>
        <p className="mt-2 text-sm text-ink/60">
          Create an account in a few seconds — no credit card, no spam, just your stuff.
        </p>
        <GradientButton
          onPress={() => navigate(AppRoute.signup)}
          size="lg"
          className="!h-auto !px-9 !py-4 !text-lg mt-6"
        >
          Create my account
        </GradientButton>
      </div>
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
