import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import Sidebar from "../components/SharedComponents/Sidebar";
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
      <Sidebar />
      <main className="app-content w-full px-4 pb-16 pt-6 sm:px-6 xl:px-10">
        {children}
      </main>
    </>
  );
};

export default AuthorizedRoute;
