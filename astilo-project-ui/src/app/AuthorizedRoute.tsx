import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import NavBar from "../components/SharedComponents/NavBar";
import { useAuth } from "../auth/AuthProvider";
import { AppRoute } from "./AppRoute";

interface AuthorizedRouteProps {
  children: ReactNode;
}

const AuthorizedRoute = ({ children }: AuthorizedRouteProps) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={AppRoute.login} state={{ from: location.pathname }} replace />;
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        {children}
      </main>
    </>
  );
};

export default AuthorizedRoute;
