import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import AppLoader from "../components/SharedComponents/Loader/AppLoader";

import AuthorizedRoute from "./AuthorizedRoute";
import RequireAdmin from "./RequireAdmin";
import { AppRoute } from "./AppRoute";
import { ANIME_ROWS, buildMockAnimeRow } from "../components/Anime/catalog";

// Route-level code splitting — heavy deps (tremor, swiper) load per page.
const CentralisedStore = lazy(() => import("../components/Store"));
const ProductDetail = lazy(() => import("../components/Store/ProductDetail"));
const MusicPlayerIndex = lazy(() => import("../components/MusicPlayer"));
const MovieHome = lazy(() => import("../components/Movies/MovieHome"));
const MovieDetail = lazy(() => import("../components/Movies/MovieDetail"));
const MovieWatch = lazy(() => import("../components/Movies/MovieWatch"));
const MovieSearch = lazy(() => import("../components/Movies/MovieSearch"));
const MovieCategory = lazy(() => import("../components/Movies/MovieCategory"));
const MovieWatchlistPage = lazy(() => import("../components/Movies/MovieWatchlistPage"));
const MoviePlaylists = lazy(() => import("../components/Movies/MoviePlaylists"));
const AnimeHome = lazy(() => import("../components/Anime/AnimeHome"));
const Customize = lazy(() => import("../components/Customize/Customize"));
const Home = lazy(() => import("../components/Home/Home"));
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
      <Route path={AppRoute.home} element={getAuthRoute(<Home />)} />
      <Route path={AppRoute.music} element={getAuthRoute(<MusicPlayerIndex />)} />
      <Route path={AppRoute.movies} element={getAuthRoute(<MovieHome />)} />
      <Route path={AppRoute.moviesSearch} element={getAuthRoute(<MovieSearch />)} />
      <Route
        path={AppRoute.moviesWatchlist}
        element={getAuthRoute(<MovieWatchlistPage />)}
      />
      <Route
        path={AppRoute.moviesPlaylists}
        element={getAuthRoute(<MoviePlaylists />)}
      />
      <Route
        path={`${AppRoute.moviesCategory}/:id`}
        element={getAuthRoute(<MovieCategory />)}
      />
      <Route
        path={`${AppRoute.moviesWatch}/:kind/:id/:season?/:episode?`}
        element={getAuthRoute(<MovieWatch />)}
      />
      <Route
        path={`${AppRoute.movies}/:kind/:id`}
        element={getAuthRoute(<MovieDetail />)}
      />
      <Route path={AppRoute.anime} element={getAuthRoute(<AnimeHome />)} />
      <Route
        path={AppRoute.animeSearch}
        element={getAuthRoute(<MovieSearch basePath={AppRoute.anime} />)}
      />
      <Route
        path={AppRoute.animeWatchlist}
        element={getAuthRoute(
          <MovieWatchlistPage basePath={AppRoute.anime} watchBasePath={AppRoute.animeWatch} />
        )}
      />
      <Route
        path={AppRoute.animePlaylists}
        element={getAuthRoute(<MoviePlaylists basePath={AppRoute.anime} backLabel="anime" />)}
      />
      <Route
        path={`${AppRoute.animeCategory}/:id`}
        element={getAuthRoute(
          <MovieCategory
            basePath={AppRoute.anime}
            rows={ANIME_ROWS}
            mockBuilder={buildMockAnimeRow}
            backLabel="anime"
          />
        )}
      />
      <Route
        path={`${AppRoute.animeWatch}/:kind/:id/:season?/:episode?`}
        element={getAuthRoute(
          <MovieWatch
            basePath={AppRoute.anime}
            watchBasePath={AppRoute.animeWatch}
            backLabel="anime"
          />
        )}
      />
      <Route
        path={`${AppRoute.anime}/:kind/:id`}
        element={getAuthRoute(
          <MovieDetail
            basePath={AppRoute.anime}
            watchBasePath={AppRoute.animeWatch}
            backLabel="All anime"
          />
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
