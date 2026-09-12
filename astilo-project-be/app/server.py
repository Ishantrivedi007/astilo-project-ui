import cherrypy

from app.config import config
from app.controllers.auth_controller import AuthController
from app.controllers.favorites_controller import FavoritesController
from app.controllers.health_controller import HealthController
from app.controllers.playlists_controller import PlaylistsController
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
    cherrypy.tree.mount(FavoritesController(), "/api/favorites", conf)
    cherrypy.tree.mount(PlaylistsController(), "/api/playlists", conf)
    cherrypy.tree.mount(ProductsController(), "/api/store/products", conf)
    cherrypy.tree.mount(OrdersController(), "/api/store/orders", conf)

    cherrypy.config.update({
        "server.socket_host": config.HOST,
        "server.socket_port": config.PORT,
        "engine.autoreload.on": True,
    })

    return root
