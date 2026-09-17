import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Link } from "@heroui/react";
import { Clapperboard, Music, Sparkles, ShoppingBag, Palette } from "lucide-react";
import { AppInput, GradientButton } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { authErrorMessage } from "../../auth/authApi";
import "./Auth.scss";

const FEATURES = [
  { icon: Clapperboard, title: "Movies & TV", desc: "Watchlists, star ratings, and TMDB-backed detail pages with trailers." },
  { icon: Sparkles, title: "Anime corner", desc: "A dedicated hub with sub/dub switching on every watch page." },
  { icon: Music, title: "Music player", desc: "Playlists, synced lyrics, and a queue that follows you around." },
  { icon: ShoppingBag, title: "Store", desc: "Browse a real catalogue and check out — backed by your account." },
  { icon: Palette, title: "Make it yours", desc: "30 themes and backgrounds, applied everywhere, instantly." },
];

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordTooShort = password.length > 0 && password.length < 6;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password needs to be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password);
      toast.success("Account created — welcome to Astilo's! 🎉");
      navigate(AppRoute.home, { replace: true });
    } catch (err) {
      toast.error(authErrorMessage(err, "Couldn't create your account."));
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
            <h2 className="auth-brand-title">One account. Five worlds worth exploring.</h2>
            <p className="auth-brand-sub">
              Here&apos;s exactly what you get the moment you sign up — no surprises,
              no credit card, no spam.
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

          <p className="auth-brand-foot">✦ takes less than a minute to set up</p>
        </div>

        <div className="auth-form-panel">
          <Link href={AppRoute.landing} className="auth-form-back">
            ← Astilo&apos;s
          </Link>
          <div className="auth-form-head">
            <div className="auth-form-badge">✨</div>
            <h1 className="auth-form-title gradient-text">join the party</h1>
            <p className="auth-form-sub">movies, music, anime & more — one account</p>
          </div>

          <form onSubmit={submit} className="auth-form-fields">
            <AppInput
              label="Name"
              placeholder="Your name"
              value={name}
              onValueChange={setName}
              isRequired
              autoComplete="name"
            />
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
              isInvalid={passwordTooShort}
              errorMessage={passwordTooShort ? "At least 6 characters" : undefined}
              autoComplete="new-password"
            />
            <GradientButton type="submit" fullWidth className="mt-1" isDisabled={submitting}>
              {submitting ? "Creating account…" : "Create account 🎉"}
            </GradientButton>
            <p className="auth-form-terms">
              By creating an account you agree this is your personal space — your
              queue, your themes, your data.
            </p>
            <p className="auth-form-footline">
              already have an account?{" "}
              <Link href={AppRoute.login} size="sm" className="text-accent-2">
                log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
