import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import NavBar from "../components/SharedComponents/NavBar";
import { AppRoute } from "./AppRoute";

interface AuthorizedRouteProps {
  children: ReactNode;
}

const AuthorizedRoute = ({ children }: AuthorizedRouteProps) => {
  // const token = localStorage.getItem("token");
  const token = "testToken";

  if (!token) {
    return <Navigate to={AppRoute.home} />;
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
