import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import AppLoader from "../components/SharedComponents/Loader/AppLoader";

import AuthorizedRoute from "./AuthorizedRoute";
import RequireAdmin from "./RequireAdmin";
import { AppRoute } from "./AppRoute";

// Route-level code splitting — heavy deps (tremor, swiper) load per page.
const CentralisedStore = lazy(() => import("../components/Store"));
const ProductDetail = lazy(() => import("../components/Store/ProductDetail"));
const MusicPlayerIndex = lazy(() => import("../components/MusicPlayer"));
const MovieHome = lazy(() => import("../components/Movies/MovieHome"));
const MovieDetail = lazy(() => import("../components/Movies/MovieDetail"));
const AnimeHome = lazy(() => import("../components/Anime/AnimeHome"));
const AnimeDetail = lazy(() => import("../components/Anime/AnimeDetail"));
const AnimeWatch = lazy(() => import("../components/Anime/AnimeWatch"));
const Customize = lazy(() => import("../components/Customize/Customize"));
const Login = lazy(() => import("../components/Login/Login"));
const Signup = lazy(() => import("../components/Login/Signup"));
const Landing = lazy(() => import("../components/Landing/Landing"));
const AdminPanel = lazy(() => import("../components/Admin/AdminPanel"));

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
      <Route path={AppRoute.landing} element={<Landing />} />
      <Route path={AppRoute.login} element={<Login />} />
      <Route path={AppRoute.signup} element={<Signup />} />

      <Route path={AppRoute.store} element={getAuthRoute(<CentralisedStore />)} />
      <Route path={`${AppRoute.store}/:id`} element={getAuthRoute(<ProductDetail />)} />
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
      <Route path={AppRoute.customize} element={getAuthRoute(<Customize />)} />
      <Route
        path={AppRoute.admin}
        element={getAuthRoute(
          <RequireAdmin>
            <AdminPanel />
          </RequireAdmin>
        )}
      />
    </Routes>
  </Suspense>
);

export default AppRoutes;
