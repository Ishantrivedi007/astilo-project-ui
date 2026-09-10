import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input, Link } from "@heroui/react";
import { GradientButton } from "../shared";
import { AppRoute } from "../../app/AppRoute";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Signed in — welcome back! 👋");
    navigate(AppRoute.home);
  };

  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <form onSubmit={submit} className="glass-card gradient-border w-full max-w-sm p-8">
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
          <Input
            type="email"
            label="Email"
            variant="bordered"
            value={email}
            onValueChange={setEmail}
            classNames={{ inputWrapper: "border-hair/40" }}
          />
          <Input
            type="password"
            label="Password"
            variant="bordered"
            value={password}
            onValueChange={setPassword}
            classNames={{ inputWrapper: "border-hair/40" }}
          />
          <GradientButton type="submit" fullWidth className="mt-2">
            Let me in ✨
          </GradientButton>
          <p className="text-center text-sm text-ink/50">
            new here?{" "}
            <Link href="#" size="sm" className="text-accent-2">
              make an account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
