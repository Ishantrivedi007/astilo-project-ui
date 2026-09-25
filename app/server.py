import cherrypy

from app.config import config
from app.controllers.auth_controller import AuthController
from app.controllers.cosmos_controller import (
    ApodController,
    AstronomyTopicsController,
    AsteroidController,
    CloseApproachController,
    CometController,
    CosmosLibraryController,
    DonkiController,
    ExoplanetController,
    GalaxyController,
    HighEnergyObservationController,
    HorizonsController,
    MissionBrowseController,
    MoonController,
    NasaImagesController,
    NebulaController,
    NeoWsController,
    ResearchSummaryController,
    SatelliteController,
    SatellitePassesController,
    SatelliteSearchController,
    SpacecraftController,
    SpaceWeatherPulseController,
    SpectrumController,
    StarController,
    SupernovaController,
    TelescopeObservationController,
)
from app.controllers.favorites_controller import FavoritesController
from app.controllers.anime_controller import AnimeController
from app.controllers.health_controller import HealthController
from app.controllers.docs_controller import DocsPageController, OpenApiSpecController
from app.controllers.images_controller import WebImageSearchController
from app.controllers.media_controller import LyricsController, LyricsSearchController, TmdbController
from app.controllers.nimrose_analytics_controller import (
    NimroseBreakdownController,
    NimroseBurndownController,
    NimroseVelocityController,
)
from app.controllers.nimrose_attachments_controller import (
    NimroseProjectAttachmentsController,
    NimroseTicketAttachmentFileController,
    NimroseTicketAttachmentsController,
)
from app.controllers.nimrose_browser_controller import (
    NimroseBookmarksController,
    NimroseBrowserProxyController,
    NimroseBrowserSpacesController,
    NimroseBrowserTabsController,
    NimroseHistoryController,
)
from app.controllers.nimrose_controller import (
    NimroseBoardColumnsController,
    NimroseCalendarController,
    NimroseNotesController,
    NimroseProjectActivityController,
    NimroseProjectsController,
    NimrosePhasesController,
    NimroseSprintsController,
    NimroseTasksController,
    NimroseTicketActivityController,
    NimroseTicketCommentsController,
    NimroseTicketGitLinksController,
    NimroseTicketLinksController,
    NimroseTicketsController,
)
from app.controllers.nimrose_context_bubbles_controller import NimroseContextBubblesController
from app.controllers.nimrose_members_controller import NimroseProjectMembersController
from app.controllers.nimrose_pulse_controller import NimrosePulseController
from app.controllers.notifications_controller import NotificationsController
from app.controllers.chat_controller import ChatChannelsController, ChatMessagesController
from app.controllers.library_controller import (
    LibraryBookContentController,
    LibraryBookController,
    LibraryCategoriesController,
    LibraryEntriesController,
    LibraryOpenSearchController,
    LibraryPdfProxyController,
    LibraryPdfSearchController,
    LibraryPdfUrlController,
    LibrarySearchController,
)
from app.controllers.messenger_controller import (
    MessengerAttachmentFileController,
    MessengerAttachmentsController,
    MessengerContactsController,
    MessengerConversationsController,
    MessengerMessagesController,
    MessengerPersonalContactsController,
)
from app.controllers.markets_controller import (
    MarketsAssetController,
    MarketsCountriesController,
    MarketsEconomicCalendarController,
    MarketsDividendsController,
    MarketsEarningsCalendarController,
    MarketsFundamentalsController,
    MarketsIpoCalendarController,
    MarketsMacroController,
    MarketsMacroIndicatorController,
    MarketsNewsClustersController,
    MarketsNewsController,
    MarketsRegionsController,
    MarketsSearchController,
    MarketsTopController,
)
from app.controllers.playlists_controller import PlaylistsController
from app.controllers.price_alerts_controller import PriceAlertsController
from app.controllers.research_controller import ResearchController, ResearchExternalSearchController, ResearchLinkedProjectsController
from app.controllers.sessions_controller import SessionsController
from app.controllers.songs_controller import (
    DownloadJobsController,
    SongPreviewController,
    SongSearchController,
    SongsController,
)
from app.controllers.store_controller import OrdersController, ProductsController
from app.controllers.trading_controller import (
    TradingAccountController,
    TradingDepositController,
    TradingInsightsController,
    TradingOrdersController,
    TradingPendingOrdersController,
    TradingWhatIfController,
)
from app.controllers.users_controller import UsersController
from app.controllers.watchlist_controller import WatchlistController
from app.db import init_db


def cors_tool():
    origin = cherrypy.request.headers.get("Origin")
    if origin in config.CORS_ORIGINS:
        cherrypy.response.headers["Access-Control-Allow-Origin"] = origin
        cherrypy.response.headers["Access-Control-Allow-Credentials"] = "true"
        cherrypy.response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        cherrypy.response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

    if cherrypy.request.method == "OPTIONS":
        cherrypy.response.status = 204
        cherrypy.request.handler = None


cherrypy.tools.cors = cherrypy.Tool("before_handler", cors_tool, priority=10)


def build_app():
    init_db()

    conf = {
        "/": {
            "request.dispatch": cherrypy.dispatch.MethodDispatcher(),
            "tools.sessions.on": False,
            "tools.cors.on": True,
        }
    }

    root = cherrypy.tree.mount(HealthController(), "/api/health", conf)
    if config.API_DOCS_ENABLED:
        # Not mounted at all unless explicitly opted into — see the
        # API_DOCS_ENABLED comment in app/config.py. Admin-only on top of
        # that, enforced inside the controllers themselves.
        cherrypy.tree.mount(DocsPageController(), "/api/docs", conf)
        cherrypy.tree.mount(OpenApiSpecController(), "/api/openapi.json", conf)
    cherrypy.tree.mount(AuthController(), "/api/auth", conf)
    cherrypy.tree.mount(UsersController(), "/api/users", conf)
    cherrypy.tree.mount(SessionsController(), "/api/sessions", conf)
    cherrypy.tree.mount(FavoritesController(), "/api/favorites", conf)
    cherrypy.tree.mount(PlaylistsController(), "/api/playlists", conf)
    cherrypy.tree.mount(ProductsController(), "/api/store/products", conf)
    cherrypy.tree.mount(OrdersController(), "/api/store/orders", conf)
    cherrypy.tree.mount(TmdbController(), "/api/media/tmdb", conf)
    cherrypy.tree.mount(LyricsController(), "/api/media/lyrics", conf)
    cherrypy.tree.mount(AnimeController(), "/api/media/anime", conf)
    cherrypy.tree.mount(LyricsSearchController(), "/api/media/genius-search", conf)
    cherrypy.tree.mount(SongsController(), "/api/music/songs", conf)
    cherrypy.tree.mount(SongSearchController(), "/api/music/search", conf)
    cherrypy.tree.mount(SongPreviewController(), "/api/music/preview", conf)
    cherrypy.tree.mount(DownloadJobsController(), "/api/music/downloads", conf)

    # Astilo Cosmos — server-side astronomy data adapters. Keyless sources
    # (JPL, NASA Exoplanet Archive, MAST, NASA image library) work out of
    # the box; APOD/NeoWs/DONKI use NASA_API_KEY (see app/config.py).
    cherrypy.tree.mount(AsteroidController(), "/api/cosmos/asteroids", conf)
    cherrypy.tree.mount(CloseApproachController(), "/api/cosmos/close-approaches", conf)
    cherrypy.tree.mount(HorizonsController(), "/api/cosmos/horizons", conf)
    cherrypy.tree.mount(ExoplanetController(), "/api/cosmos/exoplanets", conf)
    cherrypy.tree.mount(TelescopeObservationController(), "/api/cosmos/observations", conf)
    cherrypy.tree.mount(NasaImagesController(), "/api/cosmos/images", conf)
    cherrypy.tree.mount(ApodController(), "/api/cosmos/apod", conf)
    cherrypy.tree.mount(NeoWsController(), "/api/cosmos/neo", conf)
    cherrypy.tree.mount(DonkiController(), "/api/cosmos/space-weather", conf)
    cherrypy.tree.mount(StarController(), "/api/cosmos/stars", conf)
    cherrypy.tree.mount(HighEnergyObservationController(), "/api/cosmos/high-energy", conf)
    cherrypy.tree.mount(GalaxyController(), "/api/cosmos/galaxies", conf)
    cherrypy.tree.mount(SupernovaController(), "/api/cosmos/supernovae", conf)
    cherrypy.tree.mount(CosmosLibraryController(), "/api/cosmos/library", conf)
    cherrypy.tree.mount(ResearchSummaryController(), "/api/cosmos/research-summary", conf)
    cherrypy.tree.mount(MoonController(), "/api/cosmos/moons", conf)
    cherrypy.tree.mount(NebulaController(), "/api/cosmos/nebulae", conf)
    cherrypy.tree.mount(CometController(), "/api/cosmos/comets", conf)
    cherrypy.tree.mount(SpacecraftController(), "/api/cosmos/spacecraft", conf)
    cherrypy.tree.mount(MissionBrowseController(), "/api/cosmos/mission-browse", conf)
    cherrypy.tree.mount(SatelliteController(), "/api/cosmos/satellites", conf)
    cherrypy.tree.mount(SatelliteSearchController(), "/api/cosmos/satellites/search", conf)
    cherrypy.tree.mount(SatellitePassesController(), "/api/cosmos/satellites/passes", conf)
    cherrypy.tree.mount(SpectrumController(), "/api/cosmos/spectrum", conf)
    cherrypy.tree.mount(SpaceWeatherPulseController(), "/api/cosmos/space-weather/pulse", conf)
    cherrypy.tree.mount(AstronomyTopicsController(), "/api/cosmos/astronomy-topics", conf)
    cherrypy.tree.mount(WebImageSearchController(), "/api/images/search", conf)
    cherrypy.tree.mount(MarketsAssetController(), "/api/markets/asset", conf)
    cherrypy.tree.mount(MarketsSearchController(), "/api/markets/search", conf)
    cherrypy.tree.mount(MarketsTopController(), "/api/markets/top", conf)
    cherrypy.tree.mount(MarketsNewsController(), "/api/markets/news", conf)
    cherrypy.tree.mount(MarketsRegionsController(), "/api/markets/regions", conf)
    cherrypy.tree.mount(MarketsFundamentalsController(), "/api/markets/fundamentals", conf)
    cherrypy.tree.mount(MarketsMacroController(), "/api/markets/macro", conf)
    cherrypy.tree.mount(MarketsEconomicCalendarController(), "/api/markets/economic-calendar", conf)
    cherrypy.tree.mount(MarketsMacroIndicatorController(), "/api/markets/macro/indicator", conf)
    cherrypy.tree.mount(MarketsCountriesController(), "/api/markets/countries", conf)
    cherrypy.tree.mount(MarketsNewsClustersController(), "/api/markets/news-clusters", conf)
    cherrypy.tree.mount(MarketsEarningsCalendarController(), "/api/markets/earnings-calendar", conf)
    cherrypy.tree.mount(MarketsIpoCalendarController(), "/api/markets/ipo-calendar", conf)
    cherrypy.tree.mount(MarketsDividendsController(), "/api/markets/dividends", conf)
    cherrypy.tree.mount(WatchlistController(), "/api/markets/watchlist", conf)
    cherrypy.tree.mount(PriceAlertsController(), "/api/markets/price-alerts", conf)
    cherrypy.tree.mount(TradingAccountController(), "/api/trading/account", conf)
    cherrypy.tree.mount(TradingDepositController(), "/api/trading/deposit", conf)
    cherrypy.tree.mount(TradingOrdersController(), "/api/trading/orders", conf)
    cherrypy.tree.mount(TradingPendingOrdersController(), "/api/trading/pending-orders", conf)
    cherrypy.tree.mount(TradingInsightsController(), "/api/trading/insights", conf)
    cherrypy.tree.mount(TradingWhatIfController(), "/api/trading/what-if", conf)

    cherrypy.tree.mount(NimroseProjectsController(), "/api/nimrose/projects", conf)
    cherrypy.tree.mount(NimroseTasksController(), "/api/nimrose/tasks", conf)
    cherrypy.tree.mount(NimroseCalendarController(), "/api/nimrose/calendar-events", conf)
    cherrypy.tree.mount(NimroseSprintsController(), "/api/nimrose/sprints", conf)
    cherrypy.tree.mount(NimrosePhasesController(), "/api/nimrose/phases", conf)
    cherrypy.tree.mount(NimroseTicketsController(), "/api/nimrose/tickets", conf)
    cherrypy.tree.mount(NimroseTicketCommentsController(), "/api/nimrose/ticket-comments", conf)
    cherrypy.tree.mount(NimroseTicketLinksController(), "/api/nimrose/ticket-links", conf)
    cherrypy.tree.mount(NimroseTicketGitLinksController(), "/api/nimrose/ticket-git-links", conf)
    cherrypy.tree.mount(NimroseTicketActivityController(), "/api/nimrose/ticket-activity", conf)
    cherrypy.tree.mount(NimroseBoardColumnsController(), "/api/nimrose/board-columns", conf)
    cherrypy.tree.mount(NimroseProjectMembersController(), "/api/nimrose/project-members", conf)
    cherrypy.tree.mount(NimroseProjectActivityController(), "/api/nimrose/project-activity", conf)
    cherrypy.tree.mount(NimroseContextBubblesController(), "/api/nimrose/context-bubbles", conf)
    cherrypy.tree.mount(NimroseTicketAttachmentsController(), "/api/nimrose/ticket-attachments", conf)
    cherrypy.tree.mount(NimroseProjectAttachmentsController(), "/api/nimrose/project-attachments", conf)
    cherrypy.tree.mount(NimroseTicketAttachmentFileController(), "/api/nimrose/ticket-attachment-file", conf)
    cherrypy.tree.mount(NimroseBurndownController(), "/api/nimrose/analytics/burndown", conf)
    cherrypy.tree.mount(NimroseVelocityController(), "/api/nimrose/analytics/velocity", conf)
    cherrypy.tree.mount(NimroseBreakdownController(), "/api/nimrose/analytics/breakdown", conf)
    cherrypy.tree.mount(NimrosePulseController(), "/api/nimrose/pulse", conf)
    cherrypy.tree.mount(NotificationsController(), "/api/notifications", conf)
    cherrypy.tree.mount(ChatChannelsController(), "/api/chat/channels", conf)
    cherrypy.tree.mount(ChatMessagesController(), "/api/chat/messages", conf)
    cherrypy.tree.mount(MessengerContactsController(), "/api/messenger/contacts", conf)
    cherrypy.tree.mount(MessengerPersonalContactsController(), "/api/messenger/my-contacts", conf)
    cherrypy.tree.mount(LibrarySearchController(), "/api/library/search", conf)
    cherrypy.tree.mount(LibraryCategoriesController(), "/api/library/categories", conf)
    cherrypy.tree.mount(LibraryBookController(), "/api/library/book", conf)
    cherrypy.tree.mount(LibraryBookContentController(), "/api/library/book-content", conf)
    cherrypy.tree.mount(LibraryEntriesController(), "/api/library/entries", conf)
    cherrypy.tree.mount(LibraryPdfSearchController(), "/api/library/pdf-search", conf)
    cherrypy.tree.mount(LibraryPdfUrlController(), "/api/library/pdf-url", conf)
    cherrypy.tree.mount(LibraryPdfProxyController(), "/api/library/pdf-proxy", conf)
    cherrypy.tree.mount(LibraryOpenSearchController(), "/api/library/openlibrary-search", conf)
    cherrypy.tree.mount(MessengerConversationsController(), "/api/messenger/conversations", conf)
    cherrypy.tree.mount(MessengerMessagesController(), "/api/messenger/messages", conf)
    cherrypy.tree.mount(MessengerAttachmentsController(), "/api/messenger/attachments", conf)
    cherrypy.tree.mount(MessengerAttachmentFileController(), "/api/messenger/attachment-file", conf)
    cherrypy.tree.mount(NimroseNotesController(), "/api/nimrose/notes", conf)
    cherrypy.tree.mount(NimroseBrowserSpacesController(), "/api/nimrose/browser-spaces", conf)
    cherrypy.tree.mount(NimroseBrowserTabsController(), "/api/nimrose/browser-tabs", conf)
    cherrypy.tree.mount(NimroseBookmarksController(), "/api/nimrose/bookmarks", conf)
    cherrypy.tree.mount(NimroseHistoryController(), "/api/nimrose/history", conf)
    cherrypy.tree.mount(NimroseBrowserProxyController(), "/api/nimrose/browser-proxy", conf)
    cherrypy.tree.mount(ResearchController(), "/api/research", conf)
    cherrypy.tree.mount(ResearchLinkedProjectsController(), "/api/nimrose/research-projects", conf)
    cherrypy.tree.mount(ResearchExternalSearchController(), "/api/research/external-search", conf)

    cherrypy.config.update({
        "server.socket_host": config.HOST,
        "server.socket_port": config.PORT,
        "engine.autoreload.on": True,
        "response.timeout": 300,
    })

    return root
