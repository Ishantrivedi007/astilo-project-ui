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
const Cart = lazy(() => import("../components/Store/Cart"));
const Checkout = lazy(() => import("../components/Store/Checkout"));
const Payment = lazy(() => import("../components/Store/Payment"));
const OrderConfirmation = lazy(() => import("../components/Store/OrderConfirmation"));
const OrderHistory = lazy(() => import("../components/Store/OrderHistory"));
const OrderTracking = lazy(() => import("../components/Store/OrderTracking"));
const MusicPlayerIndex = lazy(() => import("../components/MusicPlayer"));
const MovieHome = lazy(() => import("../components/Movies/MovieHome"));
const MovieDetail = lazy(() => import("../components/Movies/MovieDetail"));
const MovieWatch = lazy(() => import("../components/Movies/MovieWatch"));
const MovieSearch = lazy(() => import("../components/Movies/MovieSearch"));
const MovieCategory = lazy(() => import("../components/Movies/MovieCategory"));
const MovieWatchlistPage = lazy(() => import("../components/Movies/MovieWatchlistPage"));
const MoviePlaylists = lazy(() => import("../components/Movies/MoviePlaylists"));
const AnimeHome = lazy(() => import("../components/Anime/AnimeHome"));
const NimroseShell = lazy(() => import("../components/Nimrose/NimroseShell"));
const CosmosHome = lazy(() => import("../components/Cosmos/CosmosHome"));
const CosmosSearch = lazy(() => import("../components/Cosmos/CosmosSearch"));
const CosmosLibrary = lazy(() => import("../components/Cosmos/CosmosLibrary"));
const CosmosSpaceWeather = lazy(() => import("../components/Cosmos/CosmosSpaceWeather"));
const CosmosCompare = lazy(() => import("../components/Cosmos/CosmosCompare"));
const CosmosImageLab = lazy(() => import("../components/Cosmos/CosmosImageLab"));
const CosmosOrbitExplorer = lazy(() => import("../components/Cosmos/CosmosOrbitExplorer"));
const MarketsHome = lazy(() => import("../components/Markets/MarketsHome"));
const MarketsAssetView = lazy(() => import("../components/Markets/MarketsAssetView"));
const MarketsWorldMap = lazy(() => import("../components/Markets/MarketsWorldMap"));
const TradingHome = lazy(() => import("../components/Markets/TradingHome"));
const TradingPortfolio = lazy(() => import("../components/Markets/TradingPortfolio"));
const ChartDebug = lazy(() => import("../components/Markets/ChartDebug"));
const ResearchHome = lazy(() => import("../components/Research/ResearchHome"));
const ResearchDetail = lazy(() => import("../components/Research/ResearchDetail"));
const OfficeHome = lazy(() => import("../components/Office/OfficeHome"));
const OfficeWord = lazy(() => import("../components/Office/OfficeWord"));
const OfficeExcel = lazy(() => import("../components/Office/OfficeExcel"));
const OfficePowerPoint = lazy(() => import("../components/Office/OfficePowerPoint"));
const NotificationsView = lazy(() => import("../components/Notifications/NotificationsView"));
const MessengerHome = lazy(() => import("../components/Messenger/MessengerHome"));
const LibraryHome = lazy(() => import("../components/Library/LibraryHome"));
const LibraryReader = lazy(() => import("../components/Library/LibraryReader"));
const Customize = lazy(() => import("../components/Customize/Customize"));
const Home = lazy(() => import("../components/Home/Home"));
const Login = lazy(() => import("../components/Login/Login"));
const Signup = lazy(() => import("../components/Login/Signup"));
const Landing = lazy(() => import("../components/Landing/Landing"));
const AdminPanel = lazy(() => import("../components/Admin/AdminPanel"));
const Profile = lazy(() => import("../components/Profile/Profile"));

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
      <Route path={AppRoute.storeCart} element={getAuthRoute(<Cart />)} />
      <Route path={AppRoute.storeCheckout} element={getAuthRoute(<Checkout />)} />
      <Route path={`${AppRoute.storePayment}/:orderId`} element={getAuthRoute(<Payment />)} />
      <Route path={AppRoute.storeOrders} element={getAuthRoute(<OrderHistory />)} />
      <Route
        path={`${AppRoute.storeOrders}/:orderId/confirmed`}
        element={getAuthRoute(<OrderConfirmation />)}
      />
      <Route
        path={`${AppRoute.storeOrders}/:orderId/track`}
        element={getAuthRoute(<OrderTracking />)}
      />
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
      <Route path={AppRoute.nimrose} element={getAuthRoute(<NimroseShell />)} />
      <Route path={AppRoute.cosmos} element={getAuthRoute(<CosmosHome />)} />
      <Route path={AppRoute.cosmosSearch} element={getAuthRoute(<CosmosSearch />)} />
      <Route path={AppRoute.cosmosLibrary} element={getAuthRoute(<CosmosLibrary />)} />
      <Route path={AppRoute.cosmosSpaceWeather} element={getAuthRoute(<CosmosSpaceWeather />)} />
      <Route path={AppRoute.cosmosCompare} element={getAuthRoute(<CosmosCompare />)} />
      <Route path={AppRoute.cosmosImageLab} element={getAuthRoute(<CosmosImageLab />)} />
      <Route path={AppRoute.cosmosOrbitExplorer} element={getAuthRoute(<CosmosOrbitExplorer />)} />
      <Route path={AppRoute.markets} element={getAuthRoute(<MarketsHome />)} />
      <Route path={AppRoute.marketsAsset} element={getAuthRoute(<MarketsAssetView />)} />
      <Route path={AppRoute.marketsMap} element={getAuthRoute(<MarketsWorldMap />)} />
      <Route path={AppRoute.trading} element={getAuthRoute(<TradingHome />)} />
      <Route path={AppRoute.tradingPortfolio} element={getAuthRoute(<TradingPortfolio />)} />
      <Route path={AppRoute.chartDebug} element={getAuthRoute(<ChartDebug />)} />
      <Route path={AppRoute.research} element={getAuthRoute(<ResearchHome />)} />
      <Route path={`${AppRoute.researchDetail}/:id`} element={getAuthRoute(<ResearchDetail />)} />
      <Route path={AppRoute.office} element={getAuthRoute(<OfficeHome />)} />
      <Route path={AppRoute.officeWord} element={getAuthRoute(<OfficeWord />)} />
      <Route path={AppRoute.officeExcel} element={getAuthRoute(<OfficeExcel />)} />
      <Route path={AppRoute.officeSlides} element={getAuthRoute(<OfficePowerPoint />)} />
      <Route path={AppRoute.notifications} element={getAuthRoute(<NotificationsView />)} />
      <Route path={AppRoute.messenger} element={getAuthRoute(<MessengerHome />)} />
      <Route path={AppRoute.library} element={getAuthRoute(<LibraryHome />)} />
      <Route path={AppRoute.libraryReader} element={getAuthRoute(<LibraryReader />)} />
      <Route path={AppRoute.customize} element={getAuthRoute(<Customize />)} />
      <Route path={AppRoute.profile} element={getAuthRoute(<Profile />)} />
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
