"""Builds the OpenAPI 3.0 spec served at /api/openapi.json (admin-only,
see app/controllers/docs_controller.py). Route coverage is generated from
the real cherrypy.tree.mount() table in app/server.py, so every mounted
endpoint shows up in Swagger UI, even ones only given a generic schema
below. The handful of modules with a full request/response shape
(Auth, Messenger, Trading, Nimrose tickets/projects, Research, Songs,
Store) are hand-described from their actual controller code.
"""

BEARER_NOTE = (
    "Every endpoint below (except /health) requires `Authorization: Bearer <token>`, "
    "obtained from POST /auth/login. Click **Authorize** above and paste your token "
    "once — Swagger UI will attach it to every \"Try it out\" call for you."
)

# (path, tag, methods, summary) — one row per cherrypy.tree.mount() in server.py.
# `path` is relative to the API root (server.py already strips /api).
ROUTES: list[tuple[str, str, list[str], str]] = [
    ("/health", "System", ["GET"], "Liveness check (no auth required)"),
    ("/auth", "Auth", ["POST"], "Log in or sign up, returns a JWT"),
    ("/users", "Users", ["GET", "PUT", "DELETE"], "The current user's profile"),
    ("/sessions", "Users", ["GET"], "Recent login events for the current user"),
    ("/favorites", "Favorites", ["GET", "POST", "DELETE"], "Cross-media favorites (movie/anime/track)"),
    ("/playlists", "Music", ["GET", "POST", "PUT", "DELETE"], "Music/movie playlists"),
    ("/store/products", "Store", ["GET", "POST", "PUT", "DELETE"], "Store catalog (write ops are admin-only)"),
    ("/store/orders", "Store", ["GET", "POST", "PUT"], "Cart checkout and order status"),
    ("/media/tmdb", "Media", ["GET"], "TheMovieDB proxy (movies/TV metadata)"),
    ("/media/lyrics", "Media", ["GET"], "Plain lyrics lookup"),
    ("/media/anime", "Media", ["POST"], "Anime catalog/search proxy"),
    ("/media/genius-search", "Media", ["GET"], "Genius lyrics search"),
    ("/music/songs", "Music", ["GET", "POST", "PUT", "DELETE"], "Song library CRUD"),
    ("/music/search", "Music", ["GET"], "Search YouTube for a track to download"),
    ("/music/preview", "Music", ["GET"], "Resolve a direct playable URL without downloading"),
    ("/music/downloads", "Music", ["GET"], "yt-dlp download job status"),
    ("/cosmos/asteroids", "Cosmos", ["GET"], "JPL small-body asteroid data"),
    ("/cosmos/close-approaches", "Cosmos", ["GET"], "JPL close-approach data (CAD)"),
    ("/cosmos/horizons", "Cosmos", ["GET"], "JPL Horizons ephemerides"),
    ("/cosmos/exoplanets", "Cosmos", ["GET"], "NASA Exoplanet Archive"),
    ("/cosmos/observations", "Cosmos", ["GET"], "MAST telescope observations"),
    ("/cosmos/images", "Cosmos", ["GET"], "NASA Image and Video Library search"),
    ("/cosmos/apod", "Cosmos", ["GET"], "NASA Astronomy Picture of the Day"),
    ("/cosmos/neo", "Cosmos", ["GET"], "NASA NeoWs near-earth objects"),
    ("/cosmos/space-weather", "Cosmos", ["GET"], "NASA DONKI space weather"),
    ("/cosmos/stars", "Cosmos", ["GET"], "Gaia/SIMBAD star catalog"),
    ("/cosmos/high-energy", "Cosmos", ["GET"], "HEASARC high-energy observations"),
    ("/cosmos/galaxies", "Cosmos", ["GET"], "SIMBAD galaxy catalog"),
    ("/cosmos/supernovae", "Cosmos", ["GET"], "HEASARC supernova records"),
    ("/cosmos/library", "Cosmos", ["GET", "POST", "DELETE"], "Saved Cosmos items (favorites/collections)"),
    ("/cosmos/research-summary", "Cosmos", ["GET"], "Wikipedia-sourced object summary"),
    ("/images/search", "Media", ["GET"], "Openverse openly-licensed image search"),
    ("/markets/asset", "Markets", ["GET"], "Quote + chart for one symbol"),
    ("/markets/search", "Markets", ["GET"], "Live-as-you-type symbol search"),
    ("/markets/top", "Markets", ["GET"], "Top movers / most active"),
    ("/markets/news", "Markets", ["GET"], "Market news headlines"),
    ("/markets/regions", "Markets", ["GET"], "Regional market indices"),
    ("/trading/account", "Trading", ["GET"], "Simulated cash + holdings summary"),
    ("/trading/deposit", "Trading", ["POST"], "Add simulated cash (fake card, ~10% random decline)"),
    ("/trading/orders", "Trading", ["GET", "POST"], "Order history / place a buy or sell"),
    ("/trading/insights", "Trading", ["GET"], "Per-holding live P&L insights"),
    ("/nimrose/projects", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Projects (own key_prefix/ticket numbering)"),
    ("/nimrose/tasks", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Personal to-dos"),
    ("/nimrose/calendar-events", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Calendar events"),
    ("/nimrose/sprints", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Sprints"),
    ("/nimrose/phases", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Phases"),
    ("/nimrose/tickets", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Kanban tickets (Jira-style auto key)"),
    ("/nimrose/ticket-comments", "Nimrose", ["GET", "POST"], "Ticket comments"),
    ("/nimrose/ticket-links", "Nimrose", ["POST", "DELETE"], "Ticket-to-ticket links (blocks/depends-on/etc)"),
    ("/nimrose/ticket-activity", "Nimrose", ["GET"], "Ticket audit log"),
    ("/nimrose/board-columns", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Kanban board columns + WIP limits"),
    ("/nimrose/ticket-attachments", "Nimrose", ["GET", "POST", "DELETE"], "Ticket file attachments"),
    ("/nimrose/ticket-attachment-file", "Nimrose", ["GET"], "Raw attachment bytes (?token= supported)"),
    ("/nimrose/analytics/burndown", "Nimrose", ["GET"], "Sprint burndown, computed live"),
    ("/nimrose/analytics/velocity", "Nimrose", ["GET"], "Sprint velocity, computed live"),
    ("/nimrose/analytics/breakdown", "Nimrose", ["GET"], "Ticket breakdown by type/status/priority"),
    ("/nimrose/pulse", "Nimrose", ["GET"], "Derived overdue/due-soon notification feed"),
    ("/notifications", "System", ["GET", "PUT", "DELETE"], "Cross-module notifications"),
    ("/chat/channels", "Nimrose Chat", ["GET", "POST", "PUT", "DELETE"], "In-workspace chat channels (not Messenger)"),
    ("/chat/messages", "Nimrose Chat", ["GET", "POST", "PUT", "DELETE"], "In-workspace chat messages"),
    ("/messenger/contacts", "Messenger", ["GET"], "Every other Astilo user, with real last-seen"),
    ("/messenger/my-contacts", "Messenger", ["GET", "POST", "PUT", "DELETE"], "Your personal contact list"),
    ("/library/search", "Library", ["GET"], "Project Gutenberg search"),
    ("/library/categories", "Library", ["GET"], "Gutenberg subject categories"),
    ("/library/book", "Library", ["GET"], "One Gutenberg book's metadata"),
    ("/library/book-content", "Library", ["GET"], "Book text content"),
    ("/library/entries", "Library", ["GET", "POST", "PUT", "DELETE"], "Your library shelf (want_to_read/reading/finished)"),
    ("/library/pdf-search", "Library", ["GET"], "PDF search"),
    ("/library/pdf-url", "Library", ["GET"], "Resolve a PDF's direct URL"),
    ("/library/pdf-proxy", "Library", ["GET"], "PDF byte-range proxy for the reader"),
    ("/library/openlibrary-search", "Library", ["GET"], "OpenLibrary search"),
    ("/messenger/conversations", "Messenger", ["GET", "POST"], "1:1 conversations (auto-dedupe)"),
    ("/messenger/messages", "Messenger", ["GET", "POST", "PUT", "DELETE"], "Direct messages (text/image/file/contact/sticker)"),
    ("/messenger/attachments", "Messenger", ["POST"], "Upload a message attachment (multipart, 15MB cap)"),
    ("/messenger/attachment-file", "Messenger", ["GET"], "Raw attachment bytes (?token= supported)"),
    ("/nimrose/notes", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Notes / Office docs (note, sheet, slides)"),
    ("/nimrose/browser-spaces", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Embedded-browser spaces"),
    ("/nimrose/browser-tabs", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Embedded-browser tabs"),
    ("/nimrose/bookmarks", "Nimrose", ["GET", "POST", "PUT", "DELETE"], "Embedded-browser bookmarks"),
    ("/nimrose/history", "Nimrose", ["GET", "POST", "DELETE"], "Embedded-browser history"),
    ("/nimrose/browser-proxy", "Nimrose", ["GET"], "Server-side page fetch for the embedded browser"),
    ("/research", "Research", ["GET", "POST", "PUT", "DELETE"], "Research workspaces (deterministic Wikipedia/NASA briefs, no LLM)"),
]

_GENERIC_OBJECT = {"type": "object", "additionalProperties": True}


def _op(method: str, path: str, tag: str, summary: str, detail: dict | None = None) -> dict:
    op = {
        "tags": [tag],
        "summary": summary,
        "security": [] if path == "/health" else [{"bearerAuth": []}],
        "responses": {
            "200": {"description": "OK", "content": {"application/json": {"schema": _GENERIC_OBJECT}}},
            "401": {"description": "Missing/invalid/expired token"},
            "404": {"description": "Not found"},
        },
    }
    if method in ("POST", "PUT"):
        op["requestBody"] = {"required": False, "content": {"application/json": {"schema": _GENERIC_OBJECT}}}
    if detail:
        op.update(detail)
    return op


# Per-path overrides for the modules with a precisely known request/response
# shape. Keyed by (path, METHOD); merged over the generic operation above.
OVERRIDES: dict[tuple[str, str], dict] = {
    ("/auth", "POST"): {
        "summary": "Log in (or sign up, if `name` is present) and receive a JWT",
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["email", "password"],
                        "properties": {
                            "email": {"type": "string", "format": "email"},
                            "password": {"type": "string", "format": "password"},
                            "name": {"type": "string", "description": "Present only for signup"},
                        },
                    }
                }
            },
        },
        "responses": {
            "200": {
                "description": "Authenticated",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "token": {"type": "string"},
                                "user": {"$ref": "#/components/schemas/User"},
                            },
                        }
                    }
                },
            },
            "401": {"description": "Wrong email/password"},
        },
    },
    ("/messenger/messages", "POST"): {
        "summary": "Send a message (text, image, file, contact card, or sticker)",
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/SendMessageRequest"}}},
        },
        "responses": {"200": {"description": "The created message", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/DirectMessage"}}}}},
    },
    ("/messenger/messages", "GET"): {
        "parameters": [{"name": "conversation_id", "in": "query", "required": True, "schema": {"type": "integer"}}],
        "responses": {
            "200": {
                "description": "Messages in the conversation, oldest first",
                "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/DirectMessage"}}}},
            }
        },
    },
    ("/messenger/attachments", "POST"): {
        "summary": "Upload a file for an about-to-be-sent message",
        "requestBody": {
            "required": True,
            "content": {"multipart/form-data": {"schema": {"type": "object", "properties": {"file": {"type": "string", "format": "binary"}}}}},
        },
        "responses": {
            "200": {
                "description": "Upload result — pass `storedName` back on the POST /messenger/messages call",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "storedName": {"type": "string"},
                                "fileName": {"type": "string"},
                                "contentType": {"type": "string"},
                                "sizeBytes": {"type": "integer"},
                                "isImage": {"type": "boolean"},
                            },
                        }
                    }
                },
            },
            "413": {"description": "File exceeds ATTACHMENT_MAX_BYTES (15MB default)"},
        },
    },
    ("/trading/orders", "POST"): {
        "summary": "Place a buy or sell order — executes at a fresh, live-fetched price (Yahoo Finance / CoinGecko), never a client-supplied price",
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["symbol", "assetType", "side", "quantity"],
                        "properties": {
                            "symbol": {"type": "string", "example": "AAPL"},
                            "assetType": {"type": "string", "enum": ["stock", "crypto"]},
                            "side": {"type": "string", "enum": ["buy", "sell"]},
                            "quantity": {"type": "number", "minimum": 0.0001},
                            "name": {"type": "string"},
                        },
                    }
                }
            },
        },
        "responses": {
            "200": {"description": "Executed transaction", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/TradingTransaction"}}}},
            "402": {"description": "Insufficient simulated cash or holding quantity"},
        },
    },
    ("/trading/deposit", "POST"): {
        "summary": "Add simulated cash via a fake card — no real payment gateway; declines ~10% of attempts to mimic a real processor",
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["amount", "cardNumber", "expiry", "cvv", "name"],
                        "properties": {
                            "amount": {"type": "number", "minimum": 0.01},
                            "cardNumber": {"type": "string", "example": "4242424242424242"},
                            "expiry": {"type": "string", "example": "12/29"},
                            "cvv": {"type": "string", "example": "123"},
                            "name": {"type": "string"},
                        },
                    }
                }
            },
        },
        "responses": {
            "200": {"description": "New cash balance", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/TradingAccount"}}}},
            "402": {"description": "Simulated card decline (~10% random) or invalid card fields"},
        },
    },
    ("/trading/account", "GET"): {
        "responses": {"200": {"description": "Account + holdings + live mark-to-market", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/TradingAccount"}}}}},
    },
    ("/nimrose/tickets", "POST"): {
        "summary": "Create a ticket — `ticketKey` (e.g. AST-42) is auto-assigned from the project's sequence",
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": {"$ref": "#/components/schemas/NimroseTicketInput"}}},
        },
        "responses": {"200": {"description": "The created ticket", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/NimroseTicket"}}}}},
    },
    ("/nimrose/projects", "POST"): {
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["name"],
                        "properties": {"name": {"type": "string"}, "color": {"type": "string"}, "keyPrefix": {"type": "string", "example": "AST"}},
                    }
                }
            },
        },
        "responses": {"200": {"description": "The created project", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/NimroseProject"}}}}},
    },
    ("/research", "POST"): {
        "summary": "Build a research brief for an object — Wikipedia + NASA data, sentence-extracted key points, no LLM",
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["objectType", "externalId", "title"],
                        "properties": {
                            "objectType": {"type": "string", "enum": ["planet", "asteroid", "exoplanet", "star", "observation", "image", "galaxy", "supernova"]},
                            "externalId": {"type": "string"},
                            "title": {"type": "string"},
                        },
                    }
                }
            },
        },
        "responses": {"200": {"description": "Created research item with its brief", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ResearchItem"}}}}},
    },
    ("/music/songs", "POST"): {
        "summary": "Register/download a song",
        "responses": {"200": {"description": "The song row", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Song"}}}}},
    },
    ("/store/orders", "POST"): {
        "summary": "Checkout the cart into a new order",
        "responses": {"200": {"description": "The created order", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Order"}}}}},
    },
}

COMPONENT_SCHEMAS: dict[str, dict] = {
    "User": {
        "type": "object",
        "properties": {
            "id": {"type": "integer"},
            "name": {"type": "string"},
            "email": {"type": "string", "format": "email"},
            "role": {"type": "string", "enum": ["user", "admin"]},
            "avatar": {"type": "string", "nullable": True},
        },
    },
    "DirectMessage": {
        "type": "object",
        "properties": {
            "id": {"type": "integer"},
            "conversationId": {"type": "integer"},
            "senderId": {"type": "integer"},
            "senderName": {"type": "string", "nullable": True},
            "body": {"type": "string"},
            "kind": {"type": "string", "enum": ["text", "image", "file", "contact", "sticker"]},
            "attachment": {
                "type": "object",
                "nullable": True,
                "properties": {
                    "fileName": {"type": "string"},
                    "contentType": {"type": "string"},
                    "sizeBytes": {"type": "integer", "nullable": True},
                    "url": {"type": "string"},
                },
            },
            "contact": {
                "type": "object",
                "nullable": True,
                "properties": {
                    "userId": {"type": "integer"},
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                    "avatar": {"type": "string", "nullable": True},
                },
            },
            "createdAt": {"type": "string", "format": "date-time", "nullable": True},
            "editedAt": {"type": "string", "format": "date-time", "nullable": True},
            "readAt": {"type": "string", "format": "date-time", "nullable": True},
        },
    },
    "SendMessageRequest": {
        "type": "object",
        "required": ["conversationId"],
        "properties": {
            "conversationId": {"type": "integer"},
            "body": {"type": "string"},
            "kind": {"type": "string", "enum": ["text", "image", "file", "contact", "sticker"], "default": "text"},
            "attachmentStoredName": {"type": "string", "description": "From a prior POST /messenger/attachments"},
            "attachmentFileName": {"type": "string"},
            "attachmentContentType": {"type": "string"},
            "attachmentSizeBytes": {"type": "integer"},
            "contact": {"type": "object", "description": "Required when kind=contact"},
        },
    },
    "TradingAccount": {
        "type": "object",
        "properties": {
            "cashBalance": {"type": "number"},
            "holdingsValue": {"type": "number"},
            "totalValue": {"type": "number"},
            "holdings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string"},
                        "assetType": {"type": "string", "enum": ["stock", "crypto"]},
                        "quantity": {"type": "number"},
                        "avgCost": {"type": "number"},
                        "currentPrice": {"type": "number"},
                        "unrealizedPnl": {"type": "number"},
                        "unrealizedPnlPct": {"type": "number"},
                    },
                },
            },
        },
    },
    "TradingTransaction": {
        "type": "object",
        "properties": {
            "id": {"type": "integer"},
            "symbol": {"type": "string"},
            "assetType": {"type": "string", "enum": ["stock", "crypto"]},
            "side": {"type": "string", "enum": ["buy", "sell"]},
            "quantity": {"type": "number"},
            "price": {"type": "number"},
            "total": {"type": "number"},
            "realizedPnl": {"type": "number", "nullable": True},
            "createdAt": {"type": "string", "format": "date-time"},
        },
    },
    "NimroseProject": {
        "type": "object",
        "properties": {
            "id": {"type": "integer"},
            "name": {"type": "string"},
            "color": {"type": "string", "nullable": True},
            "keyPrefix": {"type": "string", "nullable": True},
        },
    },
    "NimroseTicketInput": {
        "type": "object",
        "required": ["projectId", "title"],
        "properties": {
            "projectId": {"type": "integer"},
            "title": {"type": "string"},
            "description": {"type": "string"},
            "ticketType": {"type": "string", "enum": ["feature", "bug", "task", "improvement", "integration", "research", "design", "documentation"]},
            "status": {"type": "string", "enum": ["backlog", "todo", "in_progress", "review", "done"]},
            "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
            "sprintId": {"type": "integer", "nullable": True},
            "phaseId": {"type": "integer", "nullable": True},
        },
    },
    "NimroseTicket": {
        "allOf": [
            {"$ref": "#/components/schemas/NimroseTicketInput"},
            {"type": "object", "properties": {"id": {"type": "integer"}, "ticketKey": {"type": "string", "example": "AST-42"}}},
        ]
    },
    "ResearchItem": {
        "type": "object",
        "properties": {
            "id": {"type": "integer"},
            "objectType": {"type": "string"},
            "externalId": {"type": "string"},
            "title": {"type": "string"},
            "brief": {
                "type": "object",
                "nullable": True,
                "properties": {
                    "keyPoints": {"type": "array", "items": {"type": "string"}},
                    "furtherResearch": {"type": "array", "items": {"type": "string"}},
                    "wikiTitle": {"type": "string"},
                    "wikiUrl": {"type": "string"},
                    "generatedAt": {"type": "string", "format": "date-time"},
                },
            },
            "images": {"type": "array", "items": {"type": "object"}},
        },
    },
    "Song": {
        "type": "object",
        "properties": {
            "id": {"type": "integer"},
            "title": {"type": "string"},
            "artist": {"type": "string", "nullable": True},
            "audioUrl": {"type": "string"},
            "coverUrl": {"type": "string", "nullable": True},
            "durationSeconds": {"type": "integer", "nullable": True},
            "lyricsSynced": {"type": "string", "nullable": True, "description": "Raw LRC, when available"},
        },
    },
    "Order": {
        "type": "object",
        "properties": {
            "id": {"type": "integer"},
            "status": {"type": "string", "enum": ["pending", "paid", "shipped", "delivered", "cancelled"]},
            "total": {"type": "number"},
            "items": {"type": "array", "items": {"type": "object"}},
        },
    },
}


def build_spec(server_url: str) -> dict:
    paths: dict[str, dict] = {}
    for path, tag, methods, summary in ROUTES:
        item = paths.setdefault(path, {})
        for method in methods:
            override = OVERRIDES.get((path, method))
            item[method.lower()] = _op(method, path, tag, summary, override)

    return {
        "openapi": "3.0.3",
        "info": {
            "title": "Astilo API",
            "version": "1.0.0",
            "description": (
                "Admin-only reference for every endpoint this backend exposes.\n\n"
                f"{BEARER_NOTE}\n\n"
                "This page and this spec are themselves gated to admins only — see "
                "`app/controllers/docs_controller.py` if you're reading the source."
            ),
        },
        "servers": [{"url": server_url}],
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "Paste the token returned by POST /auth/login",
                }
            },
            "schemas": COMPONENT_SCHEMAS,
        },
        "tags": [
            {"name": t}
            for t in [
                "System", "Auth", "Users", "Favorites", "Music", "Store", "Media",
                "Cosmos", "Markets", "Trading", "Nimrose", "Nimrose Chat",
                "Messenger", "Library", "Research",
            ]
        ],
        "paths": paths,
    }
