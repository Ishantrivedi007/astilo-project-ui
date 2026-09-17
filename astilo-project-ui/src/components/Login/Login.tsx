import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Link } from "@heroui/react";
import { Clapperboard, Music, Sparkles, Palette } from "lucide-react";
import { AppInput, GradientButton } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { authErrorMessage } from "../../auth/authApi";
import "./Auth.scss";

const FEATURES = [
  { icon: Clapperboard, title: "Pick up where you left off", desc: "Continue watching, right on your home screen." },
  { icon: Music, title: "Your queue, everywhere", desc: "Playlists and lyrics follow you across the app." },
  { icon: Sparkles, title: "Anime, movies & more", desc: "One account for your whole entertainment world." },
  { icon: Palette, title: "Make it feel like yours", desc: "30 themes and backgrounds, applied instantly." },
];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || AppRoute.home;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Signed in — welcome back! 👋");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(authErrorMessage(err, "Couldn't sign you in."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell glass-card gradient-border">
        <div className="auth-brand">
          <img src="/astilo-mark.png" alt="" className="auth-brand-mark" aria-hidden />
          <div className="auth-brand-top">
            <Link href={AppRoute.landing} className="auth-brand-link">
              ← Astilo&apos;s
            </Link>
            <h2 className="auth-brand-title">
              Everything you watch, listen to, and shop for.
            </h2>
            <p className="auth-brand-sub">
              Log back in to pick up your queue, your watchlist, and your vibe — right
              where you left it.
            </p>
          </div>

          <div className="auth-brand-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="auth-brand-feature">
                <span className="auth-brand-feature-icon">
                  <f.icon size={18} strokeWidth={2.25} />
                </span>
                <div>
                  <p className="auth-brand-feature-title">{f.title}</p>
                  <p className="auth-brand-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="auth-brand-foot">✦ your digital world, one place</p>
        </div>

        <div className="auth-form-panel">
          <Link href={AppRoute.landing} className="auth-form-back">
            ← Astilo&apos;s
          </Link>
          <div className="auth-form-head">
            <div className="auth-form-badge">👋</div>
            <h1 className="auth-form-title gradient-text">wb, superstar</h1>
            <p className="auth-form-sub">log in and let&apos;s vibe</p>
          </div>

          <form onSubmit={submit} className="auth-form-fields">
            <AppInput
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onValueChange={setEmail}
              isRequired
              autoComplete="email"
            />
            <AppInput
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onValueChange={setPassword}
              isRequired
              autoComplete="current-password"
            />
            <GradientButton type="submit" fullWidth className="mt-1" isDisabled={submitting}>
              {submitting ? "Signing in…" : "Let me in ✨"}
            </GradientButton>
            <p className="auth-form-footline">
              new here?{" "}
              <Link href={AppRoute.signup} size="sm" className="text-accent-2">
                make an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
