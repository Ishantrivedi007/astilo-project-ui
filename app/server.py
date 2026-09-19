import cherrypy

from app.config import config
from app.controllers.auth_controller import AuthController
from app.controllers.cosmos_controller import (
    ApodController,
    AsteroidController,
    CloseApproachController,
    CosmosLibraryController,
    DonkiController,
    ExoplanetController,
    GalaxyController,
    HighEnergyObservationController,
    HorizonsController,
    NasaImagesController,
    NeoWsController,
    StarController,
    SupernovaController,
    TelescopeObservationController,
)
from app.controllers.favorites_controller import FavoritesController
from app.controllers.anime_controller import AnimeController
from app.controllers.health_controller import HealthController
from app.controllers.media_controller import LyricsController, LyricsSearchController, TmdbController
from app.controllers.nimrose_browser_controller import (
    NimroseBookmarksController,
    NimroseBrowserProxyController,
    NimroseBrowserSpacesController,
    NimroseBrowserTabsController,
    NimroseHistoryController,
)
from app.controllers.nimrose_controller import (
    NimroseCalendarController,
    NimroseNotesController,
    NimroseProjectsController,
    NimroseSprintsController,
    NimroseTasksController,
    NimroseTicketActivityController,
    NimroseTicketCommentsController,
    NimroseTicketLinksController,
    NimroseTicketsController,
)
from app.controllers.playlists_controller import PlaylistsController
from app.controllers.research_controller import ResearchController
from app.controllers.sessions_controller import SessionsController
from app.controllers.songs_controller import (
    DownloadJobsController,
    SongPreviewController,
    SongSearchController,
    SongsController,
)
from app.controllers.store_controller import OrdersController, ProductsController
from app.controllers.users_controller import UsersController
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

    cherrypy.tree.mount(NimroseProjectsController(), "/api/nimrose/projects", conf)
    cherrypy.tree.mount(NimroseTasksController(), "/api/nimrose/tasks", conf)
    cherrypy.tree.mount(NimroseCalendarController(), "/api/nimrose/calendar-events", conf)
    cherrypy.tree.mount(NimroseSprintsController(), "/api/nimrose/sprints", conf)
    cherrypy.tree.mount(NimroseTicketsController(), "/api/nimrose/tickets", conf)
    cherrypy.tree.mount(NimroseTicketCommentsController(), "/api/nimrose/ticket-comments", conf)
    cherrypy.tree.mount(NimroseTicketLinksController(), "/api/nimrose/ticket-links", conf)
    cherrypy.tree.mount(NimroseTicketActivityController(), "/api/nimrose/ticket-activity", conf)
    cherrypy.tree.mount(NimroseNotesController(), "/api/nimrose/notes", conf)
    cherrypy.tree.mount(NimroseBrowserSpacesController(), "/api/nimrose/browser-spaces", conf)
    cherrypy.tree.mount(NimroseBrowserTabsController(), "/api/nimrose/browser-tabs", conf)
    cherrypy.tree.mount(NimroseBookmarksController(), "/api/nimrose/bookmarks", conf)
    cherrypy.tree.mount(NimroseHistoryController(), "/api/nimrose/history", conf)
    cherrypy.tree.mount(NimroseBrowserProxyController(), "/api/nimrose/browser-proxy", conf)
    cherrypy.tree.mount(ResearchController(), "/api/research", conf)

    cherrypy.config.update({
        "server.socket_host": config.HOST,
        "server.socket_port": config.PORT,
        "engine.autoreload.on": True,
        "response.timeout": 300,
    })

    return root
