/*React Libraries */
import { Navigate } from "react-router-dom";
import React, { useEffect } from "react";

// **** Custom Components, Styles and Icons ****

import NavBar from "../components/SharedComponents/NavBar";

const AuthorizedRoute = ({ children }) => {
  //const token = localStorage.getItem("token");
  const token = "testToken";
  useEffect(() => {}, [token]);
  if (token)
    return (
      <>
        <NavBar />
        {children}
      </>
    );

  return <Navigate to={"/"} />;
  // return <Navigate to={AppRoute.home} />;
};

export default AuthorizedRoute;
