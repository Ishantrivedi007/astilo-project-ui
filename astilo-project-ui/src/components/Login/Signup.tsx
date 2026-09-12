import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Link } from "@heroui/react";
import { AppInput, GradientButton } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { authErrorMessage } from "../../auth/authApi";

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="glass-card gradient-border w-full max-w-sm p-8">
        <Link href={AppRoute.landing} className="mb-6 block text-center text-xs font-bold uppercase tracking-widest text-ink/40 hover:text-ink/70">
          ← Astilo&apos;s
        </Link>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-2xl shadow-glow animate-float">
            ✨
          </div>
          <h1 className="font-display text-2xl font-extrabold gradient-text">
            join the party
          </h1>
          <p className="text-sm text-ink/50">movies, music, anime & more — one account</p>
        </div>

        <div className="flex flex-col gap-4">
          <AppInput
            label="Name"
            placeholder="Your name"
            value={name}
            onValueChange={setName}
            isRequired
          />
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
            isInvalid={passwordTooShort}
            errorMessage={passwordTooShort ? "At least 6 characters" : undefined}
          />
          <GradientButton type="submit" fullWidth className="mt-2" isDisabled={submitting}>
            {submitting ? "Creating account…" : "Create account 🎉"}
          </GradientButton>
          <p className="text-center text-sm text-ink/50">
            already have an account?{" "}
            <Link href={AppRoute.login} size="sm" className="text-accent-2">
              log in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Signup;
