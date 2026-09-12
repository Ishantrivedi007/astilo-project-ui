import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AppRoute } from "./AppRoute";

const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="py-32 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink">Admins only</h1>
        <p className="mt-1 text-sm text-ink/50">You don&apos;t have access to this page.</p>
        <Link to={AppRoute.home} className="mt-4 inline-block text-sm font-semibold text-accent-2 underline">
          ← Back home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAdmin;
