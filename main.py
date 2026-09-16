import cherrypy

from app.server import build_app

if __name__ == "__main__":
    build_app()
    cherrypy.engine.start()
    cherrypy.engine.block()
