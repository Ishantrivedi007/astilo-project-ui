import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import AppLoader from "../components/SharedComponents/Loader/AppLoader";

import AuthorizedRoute from "./AuthorizedRoute";
import { AppRoute } from "./AppRoute";

// Route-level code splitting — heavy deps (tremor, swiper) load per page.
const CentralisedStore = lazy(() => import("../components/Store"));
const MusicPlayerIndex = lazy(() => import("../components/MusicPlayer"));
const MovieHome = lazy(() => import("../components/Movies/MovieHome"));
const MovieDetail = lazy(() => import("../components/Movies/MovieDetail"));
const AnimeHome = lazy(() => import("../components/Anime/AnimeHome"));
const AnimeDetail = lazy(() => import("../components/Anime/AnimeDetail"));
const AnimeWatch = lazy(() => import("../components/Anime/AnimeWatch"));
const DashboardPage = lazy(() => import("../components/DashBoard/Dashboard"));
const Customize = lazy(() => import("../components/Customize/Customize"));
const Login = lazy(() => import("../components/Login/Login"));

const getAuthRoute = (content: ReactNode) => (
  <AuthorizedRoute>{content}</AuthorizedRoute>
);

const PageFallback = () => (
  <div className="flex justify-center py-32">
    <AppLoader label="loading…" />
  </div>
);

const AppRoutes = () => (
  <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path={AppRoute.store} element={getAuthRoute(<CentralisedStore />)} />
      <Route path={AppRoute.home} element={getAuthRoute(<CentralisedStore />)} />
      <Route path={AppRoute.music} element={getAuthRoute(<MusicPlayerIndex />)} />
      <Route path={AppRoute.movies} element={getAuthRoute(<MovieHome />)} />
      <Route
        path={`${AppRoute.movies}/:kind/:id`}
        element={getAuthRoute(<MovieDetail />)}
      />
      <Route path={AppRoute.anime} element={getAuthRoute(<AnimeHome />)} />
      <Route
        path={`${AppRoute.animeWatch}/:id/:ep?`}
        element={getAuthRoute(<AnimeWatch />)}
      />
      <Route
        path={`${AppRoute.anime}/:kind/:id`}
        element={getAuthRoute(
          <AnimeDetail basePath={AppRoute.anime} backLabel="All anime" />
        )}
      />
      <Route
        path={AppRoute.dashboard}
        element={getAuthRoute(<DashboardPage />)}
      />
      <Route path={AppRoute.customize} element={getAuthRoute(<Customize />)} />
      <Route path={AppRoute.login} element={getAuthRoute(<Login />)} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
