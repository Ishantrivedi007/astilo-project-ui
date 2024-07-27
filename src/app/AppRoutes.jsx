/*React Libraries */
import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";

/*Custom Components, Styles and Icons */
// import { AppRoute } from "./AppRoute";
import AuthorizedRoute from "./AuthorizedRoute";

import CentralisedStore from "../components/Store";
import MusicPlayerIndex from "../components/MusicPlayer";
import MovieHome from "../components/Movies/MovieHome";
import DashboardPage from "../components/DashBoard/Dashboard";
import { AppRoute } from "./AppRoute";
import Login from "../components/Login/Login";

const getAuthRoute = (content) => <AuthorizedRoute>{content}</AuthorizedRoute>;

const AppRoutes = () => (
  <Suspense fallback={<>Loading...</>}>
    <Routes>
      {/* <Route
        path={AppRoute.importHistory}
        element={getAuthRoute(<ImportHistory />)}
      />
      <Route
        path={AppRoute.importPreview}
        element={getAuthRoute(<UploadPreview />)}
      />
      <Route
        path={AppRoute.importSettings}
        element={getAuthRoute(<ImportSettings />)}
      />
      <Route
        path={AppRoute.currencyRate}
        element={getAuthRoute(<CurrencyRate />)}
      />
      <Route path={AppRoute.home} element={<LoginPage />} /> */}
      {/* <Route path="/" element={<Shop />} />*/}
      <Route
        path={AppRoute.store}
        element={getAuthRoute(<CentralisedStore />)}
      />
      <Route
        path={AppRoute.home}
        element={getAuthRoute(<CentralisedStore />)}
      />
      <Route
        path={AppRoute.music}
        element={getAuthRoute(<MusicPlayerIndex />)}
      />
      <Route path={AppRoute.movies} element={getAuthRoute(<MovieHome />)} />
      {/* <Route path="/users" element={<TableContainer />} />
              <Route path="*" element={<PageNotFound />} />
              <Route path="/signup" element={<Signup />} /> */}
      <Route
        path={AppRoute.dashboard}
        element={getAuthRoute(<DashboardPage />)}
      />
      <Route path={AppRoute.login} element={getAuthRoute(<Login />)} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
