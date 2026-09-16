import cherrypy


class HealthController:
    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return {"status": "ok"}
