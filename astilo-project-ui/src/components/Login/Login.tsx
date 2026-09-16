import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Link } from "@heroui/react";
import { AppInput, GradientButton } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { authErrorMessage } from "../../auth/authApi";

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="glass-card gradient-border w-full max-w-sm p-8">
        <Link href={AppRoute.landing} className="mb-6 block text-center text-xs font-bold uppercase tracking-widest text-ink/40 hover:text-ink/70">
          ← Astilo&apos;s
        </Link>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-2xl shadow-glow animate-float">
            👋
          </div>
          <h1 className="font-display text-2xl font-extrabold gradient-text">
            wb, superstar
          </h1>
          <p className="text-sm text-ink/50">log in and let&apos;s vibe</p>
        </div>

        <div className="flex flex-col gap-4">
          <AppInput
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onValueChange={setEmail}
            isRequired
          />
          <AppInput
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onValueChange={setPassword}
            isRequired
          />
          <GradientButton type="submit" fullWidth className="mt-2" isDisabled={submitting}>
            {submitting ? "Signing in…" : "Let me in ✨"}
          </GradientButton>
          <p className="text-center text-sm text-ink/50">
            new here?{" "}
            <Link href={AppRoute.signup} size="sm" className="text-accent-2">
              make an account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
