import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Map as MapLibreMap,
  NavigationControl,
  type MapMouseEvent,
  type RasterSourceSpecification,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeft, Loader2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { Reveal } from "../shared";
import { fetchDepthAtPoint, fetchOceanLayers, type OceanLayer } from "../../lib/abyssApi";
import AbyssSourceBadge from "./AbyssSourceBadge";
import AbyssConfidenceBadge from "./AbyssConfidenceBadge";
import "./Abyss.scss";

const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const layerToMapLibreSource = (layer: OceanLayer): RasterSourceSpecification => {
  if (layer.kind === "xyz") {
    return {
      type: "raster",
      tiles: [layer.tileUrlTemplate.replace("{time}", layer.defaultTime)],
      tileSize: 256,
      attribution: layer.attribution,
    };
  }
  return {
    type: "raster",
    tiles: [
      `${layer.wmsBaseUrl}?service=WMS&version=1.3.0&request=GetMap&layers=${encodeURIComponent(layer.wmsLayer)}&styles=&format=image/png&transparent=true&width=256&height=256&crs=EPSG:3857&bbox={bbox-epsg-3857}`,
    ],
    tileSize: 256,
    attribution: layer.attribution,
  };
};

const AbyssOceanExplorer = () => {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [depthResult, setDepthResult] = useState<{ lat: number; lon: number; depth: number | null } | null>(null);
  const [depthLoading, setDepthLoading] = useState(false);

  const { data: catalog, isLoading, isError } = useQuery({
    queryKey: ["abyss", "ocean", "layers"],
    queryFn: () => fetchOceanLayers(),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: mapContainer.current,
      style: BASE_STYLE,
      center: [0, 10],
      zoom: 2,
    });
    map.addControl(new NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("click", async (e: MapMouseEvent) => {
      const { lat, lng } = e.lngLat;
      setDepthLoading(true);
      setDepthResult(null);
      try {
        const res = await fetchDepthAtPoint(lat, lng);
        setDepthResult({ lat, lon: lng, depth: res.data.depthMeters });
      } catch {
        setDepthResult({ lat, lon: lng, depth: null });
      } finally {
        setDepthLoading(false);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Swap the single active overlay layer in/out as a top raster source+layer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !catalog) return;

    const applyLayer = () => {
      if (map.getLayer("abyss-overlay")) map.removeLayer("abyss-overlay");
      if (map.getSource("abyss-overlay")) map.removeSource("abyss-overlay");
      if (!activeLayerId) return;
      const layer = catalog.data.layers.find((l) => l.id === activeLayerId);
      if (!layer) return;
      map.addSource("abyss-overlay", layerToMapLibreSource(layer));
      map.addLayer({ id: "abyss-overlay", type: "raster", source: "abyss-overlay", paint: { "raster-opacity": 0.75 } });
    };

    if (map.isStyleLoaded()) applyLayer();
    else map.once("load", applyLayer);
  }, [activeLayerId, catalog]);

  const activeLayer = catalog?.data.layers.find((l) => l.id === activeLayerId);

  return (
    <div className="abyss-page">
      <Reveal>
        <button type="button" className="abyss-source-badge mb-3" onClick={() => navigate(AppRoute.abyss)}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          Abyss
        </button>
        <p className="abyss-eyebrow">~ Ocean Explorer</p>
        <h1 className="abyss-title">The planet's ocean.</h1>
        <p className="abyss-tagline">
          Real satellite imagery and bathymetry, fetched directly from NASA GIBS and EMODnet. Click
          anywhere on the ocean for its real seafloor depth.
        </p>
      </Reveal>

      <Reveal>
        <div className="flex flex-wrap gap-2 mt-4 mb-4">
          <button
            type="button"
            className="abyss-source-badge"
            style={!activeLayerId ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
            onClick={() => setActiveLayerId(null)}
          >
            None
          </button>
          {isLoading && (
            <span className="abyss-unavailable flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Loading layers…
            </span>
          )}
          {isError && <span className="abyss-unavailable">Layer catalog unavailable.</span>}
          {catalog?.data.layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className="abyss-source-badge"
              style={activeLayerId === layer.id ? { background: "rgba(94, 234, 212, 0.22)", color: "#e4f6f5" } : undefined}
              onClick={() => setActiveLayerId(layer.id)}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="abyss-card" style={{ padding: 0, overflow: "hidden" }}>
          <div ref={mapContainer} style={{ width: "100%", height: "60vh", minHeight: 420 }} />
        </div>
      </Reveal>

      {activeLayer && (
        <Reveal>
          <div className="flex items-center gap-2 mt-3">
            <AbyssSourceBadge source={activeLayer.source} />
            <AbyssConfidenceBadge confidence={activeLayer.confidence} />
            <span className="abyss-unavailable">{activeLayer.attribution}</span>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="abyss-card mt-4">
          <p className="text-sm font-semibold mb-1">Depth at clicked point</p>
          {depthLoading && <p className="abyss-unavailable">Querying EMODnet Bathymetry…</p>}
          {!depthLoading && !depthResult && <p className="abyss-unavailable">Click anywhere on the map to query real depth.</p>}
          {!depthLoading && depthResult && (
            <div className="flex items-center gap-3 flex-wrap">
              <AbyssSourceBadge source="EMODnet Bathymetry" />
              <AbyssConfidenceBadge confidence="OBSERVED" />
              <span className="text-sm text-white/70">
                {depthResult.lat.toFixed(3)}, {depthResult.lon.toFixed(3)} —{" "}
                {depthResult.depth === null
                  ? "no data at this point (likely on land)"
                  : `${Math.abs(depthResult.depth).toFixed(0)} m ${depthResult.depth < 0 ? "below sea level" : "above sea level"}`}
              </span>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
};

export default AbyssOceanExplorer;
