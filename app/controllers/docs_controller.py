import cherrypy

from app.auth import require_admin_from_request
from app.openapi_spec import build_spec

# Swagger UI's static bundle, loaded from a CDN so nothing needs to be
# vendored into the repo. cdnjs is pinned to an exact version (not
# "latest") so this page's behavior can't change out from under us.
_SWAGGER_UI_VERSION = "5.17.14"
_SWAGGER_CSS = f"https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/{_SWAGGER_UI_VERSION}/swagger-ui.min.css"
_SWAGGER_BUNDLE_JS = f"https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/{_SWAGGER_UI_VERSION}/swagger-ui-bundle.min.js"


def _docs_html(spec_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Astilo API — Admin Docs</title>
  <link rel="stylesheet" href="{_SWAGGER_CSS}">
  <style>
    body {{ margin: 0; background: #0c0c10; }}
    .topbar {{ display: none !important; }}
    .swagger-ui .info .title small.version-stamp {{ background: #d9b45c; }}
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="{_SWAGGER_BUNDLE_JS}"></script>
  <script>
    window.ui = SwaggerUIBundle({{
      url: "{spec_url}",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout",
      docExpansion: "list",
      persistAuthorization: true,
    }});
  </script>
</body>
</html>"""


class DocsPageController:
    """Serves the Swagger UI shell at GET /api/docs. Admin-only, and only
    mounted at all when config.API_DOCS_ENABLED is true (see server.py) —
    two independent gates, not just one, since this page describes the
    entire API surface and is exactly the kind of thing that shouldn't be
    reachable by accident in a deployment that didn't ask for it.

    Since this is a plain browser navigation (no Authorization header
    possible), the admin JWT is passed as `?token=`, same pattern as the
    existing attachment-file controllers. Any failure returns 404, not
    401/403, so a non-admin probing the URL can't even confirm it exists."""

    exposed = True

    def GET(self, token=None):
        require_admin_from_request(token)
        spec_url = f"/api/openapi.json?token={token}" if token else "/api/openapi.json"
        cherrypy.response.headers["Content-Type"] = "text/html; charset=utf-8"
        # Docs describe every endpoint's shape; keep them out of any cache
        # (browser or intermediary) so a stale/shared copy can't linger.
        cherrypy.response.headers["Cache-Control"] = "no-store"
        return _docs_html(spec_url)


class OpenApiSpecController:
    """Serves the raw OpenAPI 3.0 JSON at GET /api/openapi.json. Gated
    identically to DocsPageController (see there for the reasoning) —
    fetched by Swagger UI's own JS, so it needs the same `?token=` fallback
    the page itself uses."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, token=None):
        require_admin_from_request(token)
        cherrypy.response.headers["Cache-Control"] = "no-store"
        base = f"{cherrypy.request.base}/api"
        return build_spec(base)
