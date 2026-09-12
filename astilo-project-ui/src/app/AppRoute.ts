export const AppRoute = {
  // Public — no auth, no app navbar
  landing: "/",
  login: "/login",
  signup: "/signup",
  // Authenticated app
  home: "/home",
  store: "/store",
  music: "/music",
  movies: "/movies",
  anime: "/anime",
  animeWatch: "/anime/watch",
  dashboard: "/dashboard",
  customize: "/customize",
  admin: "/admin",
} as const;
